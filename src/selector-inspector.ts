import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// TypeScript declarations for injected window properties
declare global {
  interface Window {
    startInspecting: (fieldName: string) => void;
    stopInspecting: () => void;
    selectedElementData: any;
    elementSelected: boolean;
    inspectorReady: boolean;
  }
}

interface SchemaField {
  type: string;
  description: string;
}

interface Config {
  scraper_config: {
    name: string;
    website_url: string;
    schema: { [key: string]: SchemaField };
  };
}

interface SelectorMapping {
  field: string;
  selector: string;
  method: string;
  description: string;
  elementText?: string;
  attributes?: { [key: string]: string };
}

class SelectorInspector {
  private config: any;
  private schema: { [key: string]: SchemaField };
  private mappings: SelectorMapping[] = [];
  private rl: readline.Interface;

  constructor(configPath: string = './config.json') {
    const configFile = fs.readFileSync(configPath, 'utf8');
    this.config = JSON.parse(configFile);
    this.schema = this.config.scraper_config.schema;
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  private generateSelectorVariations(element: any): string[] {
    const selectors: string[] = [];
    
    // ID selector (highest priority)
    if (element.id) {
      selectors.push(`#${element.id}`);
    }
    
    // Class selectors
    if (element.className) {
      const classes = element.className.split(' ').filter(Boolean);
      classes.forEach((cls: string) => {
        selectors.push(`.${cls}`);
      });
      if (classes.length > 1) {
        selectors.push(`.${classes.join('.')}`);
      }
    }
    
    // Attribute selectors
    const attrs = element.attributes || {};
    Object.keys(attrs).forEach(attr => {
      if (['data-test', 'data-testid', 'data-cy', 'aria-label'].includes(attr)) {
        selectors.push(`[${attr}="${attrs[attr]}"]`);
      }
      if (attr.startsWith('data-')) {
        selectors.push(`[${attr}]`);
      }
    });
    
    // Tag + class combinations
    if (element.tagName && element.className) {
      const classes = element.className.split(' ').filter(Boolean);
      selectors.push(`${element.tagName.toLowerCase()}.${classes[0]}`);
    }
    
    // Text-based selectors for common patterns
    if (element.textContent) {
      const text = element.textContent.trim();
      if (text.length > 0 && text.length < 50) {
        selectors.push(`text="${text}"`);
        selectors.push(`text*="${text.substring(0, 20)}"`);
      }
    }
    
    // Simple tag selector
    if (element.tagName) {
      selectors.push(element.tagName.toLowerCase());
    }
    
    return selectors;
  }

  private async injectInspectorScript(page: Page): Promise<void> {
    await page.addScriptTag({
      content: `
        // Create overlay for highlighting only
        const overlay = document.createElement('div');
        overlay.id = 'playwright-inspector-overlay';
        overlay.style.cssText = \`
          position: fixed;
          pointer-events: none;
          border: 3px solid #ff4444;
          background: rgba(255, 68, 68, 0.2);
          z-index: 999999;
          display: none;
          border-radius: 4px;
          box-shadow: 0 0 10px rgba(255, 68, 68, 0.5);
        \`;
        document.body.appendChild(overlay);

        // Create info box
        const infoBox = document.createElement('div');
        infoBox.id = 'playwright-inspector-info';
        infoBox.style.cssText = \`
          position: fixed;
          top: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.95);
          color: white;
          padding: 20px;
          border-radius: 10px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          z-index: 1000000;
          max-width: 350px;
          display: none;
          border: 2px solid #4CAF50;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        \`;
        document.body.appendChild(infoBox);

        let isInspecting = false;
        let currentField = '';
        let selectedElement = null;
        let originalCursor = '';

        // Global functions for Playwright to call
        window.startInspecting = (fieldName) => {
          isInspecting = true;
          currentField = fieldName;
          
          // Change cursor for entire document
          originalCursor = document.body.style.cursor;
          document.body.style.cursor = 'crosshair';
          
          infoBox.innerHTML = \`
            <div style="font-weight: bold; color: #4CAF50; font-size: 16px; margin-bottom: 12px;">
              🎯 ELEMENT SELECTOR
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Field:</strong> <span style="color: #ffeb3b;">\${fieldName}</span>
            </div>
            <div style="color: #ddd; margin-bottom: 8px;">
              Move your mouse to highlight elements
            </div>
            <div style="color: #4CAF50; font-weight: bold; margin-bottom: 8px;">
              Click on the target element to select it
            </div>
            <div style="color: #ff6666; font-size: 12px;">
              Press ESC to cancel
            </div>
          \`;
          infoBox.style.display = 'block';
          overlay.style.display = 'block';
          
          console.log('🎯 Started inspecting for field:', fieldName);
        };

        window.stopInspecting = () => {
          isInspecting = false;
          currentField = '';
          
          // Restore original cursor
          document.body.style.cursor = originalCursor;
          
          overlay.style.display = 'none';
          infoBox.style.display = 'none';
          selectedElement = null;
          
          console.log('⏹️ Stopped inspecting');
        };

        window.selectedElementData = null;
        window.elementSelected = false;

        // Mouse move handler - attached to document
        function handleMouseMove(e) {
          if (!isInspecting) return;
          
          const elementBelow = e.target;
          if (!elementBelow || 
              elementBelow.id === 'playwright-inspector-overlay' || 
              elementBelow.id === 'playwright-inspector-info') {
            return;
          }

          // Highlight the element
          const rect = elementBelow.getBoundingClientRect();
          overlay.style.left = (rect.left + window.scrollX) + 'px';
          overlay.style.top = (rect.top + window.scrollY) + 'px';
          overlay.style.width = rect.width + 'px';
          overlay.style.height = rect.height + 'px';

          // Update info box with element details
          const tagName = elementBelow.tagName.toLowerCase();
          const className = elementBelow.className || '';
          const id = elementBelow.id || '';
          const textContent = (elementBelow.textContent || '').trim().substring(0, 80);
          
          infoBox.innerHTML = \`
            <div style="font-weight: bold; color: #4CAF50; font-size: 16px; margin-bottom: 12px;">
              🎯 ELEMENT SELECTOR
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Field:</strong> <span style="color: #ffeb3b;">\${currentField}</span>
            </div>
            <div style="margin-bottom: 8px;">
              <strong>Hovering:</strong> <span style="color: #81C784;">\${tagName}</span>
            </div>
            \${id ? \`<div style="margin-bottom: 6px;"><strong>ID:</strong> <span style="color: #64B5F6;">\${id}</span></div>\` : ''}
            \${className ? \`<div style="margin-bottom: 6px;"><strong>Classes:</strong> <span style="color: #FFB74D;">\${className.split(' ').slice(0,2).join(', ')}</span></div>\` : ''}
            \${textContent ? \`<div style="margin-bottom: 8px;"><strong>Text:</strong> <span style="color: #E0E0E0;">"\${textContent}\${textContent.length >= 80 ? '...' : ''}"</span></div>\` : ''}
            <div style="color: #4CAF50; font-weight: bold; background: rgba(76, 175, 80, 0.1); padding: 8px; border-radius: 4px; margin-top: 10px;">
              ✨ Click to select this element
            </div>
            <div style="color: #ff6666; font-size: 12px; margin-top: 8px;">
              Press ESC to cancel
            </div>
          \`;
        }

        // Click handler - attached to document
        function handleClick(e) {
          if (!isInspecting) return;
          
          const elementBelow = e.target;
          if (!elementBelow || 
              elementBelow.id === 'playwright-inspector-overlay' || 
              elementBelow.id === 'playwright-inspector-info') {
            return;
          }

          e.preventDefault();
          e.stopPropagation();

          selectedElement = elementBelow;
          
          // Collect comprehensive element data
          const rect = elementBelow.getBoundingClientRect();
          const styles = window.getComputedStyle(elementBelow);
          
          // Convert attributes to simple object
          const attributesObj = {};
          Array.from(elementBelow.attributes).forEach(attr => {
            attributesObj[attr.name] = attr.value;
          });
          
          window.selectedElementData = {
            tagName: elementBelow.tagName.toLowerCase(),
            id: elementBelow.id || '',
            className: elementBelow.className || '',
            textContent: (elementBelow.textContent || '').trim(),
            innerHTML: elementBelow.innerHTML,
            attributes: attributesObj,
            rect: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height
            },
            styles: {
              display: styles.display,
              visibility: styles.visibility,
              position: styles.position
            }
          };
          
          window.elementSelected = true;
          
          // Show success message
          infoBox.innerHTML = \`
            <div style="font-weight: bold; color: #4CAF50; font-size: 16px; margin-bottom: 12px;">
              ✅ ELEMENT SELECTED
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Field:</strong> <span style="color: #ffeb3b;">\${currentField}</span>
            </div>
            <div style="color: #4CAF50; font-weight: bold; margin-bottom: 8px;">
              Selected: <span style="color: #fff;">\${elementBelow.tagName.toLowerCase()}</span>
            </div>
            <div style="color: #ddd; background: rgba(76, 175, 80, 0.1); padding: 12px; border-radius: 6px;">
              ⚙️ Generating selectors and testing them...
            </div>
          \`;
          
          console.log('✅ Element selected for field:', currentField, elementBelow);
          
          // Auto-stop after selection
          setTimeout(() => {
            window.stopInspecting();
          }, 1500);
        }

        // Keyboard handler for ESC
        function handleKeyDown(e) {
          if (e.key === 'Escape' && isInspecting) {
            e.preventDefault();
            e.stopPropagation();
            window.stopInspecting();
            console.log('❌ Inspection cancelled by user (ESC)');
          }
        }

        // Attach event listeners directly to document
        document.addEventListener('mousemove', handleMouseMove, true);
        document.addEventListener('click', handleClick, true);
        document.addEventListener('keydown', handleKeyDown, true);

        // Mark script as ready
        window.inspectorReady = true;
        console.log('🚀 Enhanced inspector script loaded and ready');
      `
    });

    // Wait for the script to be ready
    await page.waitForFunction(() => window.inspectorReady === true, { timeout: 5000 });
  }

  private async selectElementForField(page: Page, fieldName: string): Promise<any> {
    console.log(`\n🎯 Select element for field: ${fieldName}`);
    const fieldConfig = this.schema[fieldName];
    console.log(`📝 Description: ${fieldConfig.description}`);
    console.log('🔍 Click on the element in the browser...');

    try {
      // Reset selection state
      await page.evaluate(() => {
        window.elementSelected = false;
        window.selectedElementData = null;
      });

      // Start the inspection
      await page.evaluate((fieldName) => {
        window.startInspecting(fieldName);
      }, fieldName);

      // Wait for element selection with improved polling
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds total (1 second intervals)
      
      while (attempts < maxAttempts) {
        try {
          const isSelected = await page.evaluate(() => window.elementSelected);
          
          if (isSelected) {
            const elementData = await page.evaluate(() => window.selectedElementData);
            if (elementData) {
              console.log(`✅ Element selected: ${elementData.tagName}`);
              return elementData;
            }
          }
          
          // Check if user cancelled with ESC
          const isInspecting = await page.evaluate(() => {
            // Check if overlay is still visible as indication of active inspection
            const overlay = document.getElementById('playwright-inspector-overlay');
            return overlay && overlay.style.display !== 'none';
          });
          
          if (!isInspecting && !isSelected) {
            console.log('❌ Inspection cancelled by user');
            return null;
          }
          
          // Wait 1 second before checking again
          await page.waitForTimeout(1000);
          attempts++;
          
        } catch (error) {
          console.log(`⚠️ Check attempt ${attempts + 1} failed:`, error);
          attempts++;
          await page.waitForTimeout(1000);
        }
      }

      console.log(`❌ Timeout waiting for element selection after ${maxAttempts} seconds`);
      
      // Stop inspection on timeout
      await page.evaluate(() => {
        if (window.stopInspecting) {
          window.stopInspecting();
        }
      });
      
      return null;

    } catch (error) {
      console.error(`❌ Error during element selection for ${fieldName}:`, error);
      
      // Ensure inspection is stopped
      try {
        await page.evaluate(() => {
          if (window.stopInspecting) {
            window.stopInspecting();
          }
        });
      } catch (e) {
        // Ignore cleanup errors
      }
      
      return null;
    }
  }

  private async askUserChoice(): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question('\nChoose: (n)ext field, (r)edo current, (s)kip, (f)inish: ', (answer) => {
        resolve(answer.toLowerCase().trim());
      });
    });
  }

  async inspectSelectors(): Promise<void> {
    console.log('🚀 Starting Selector Inspector...');
    console.log(`🎯 Target: ${this.config.scraper_config.website_url}`);
    console.log(`📋 Schema: ${this.config.scraper_config.name}`);
    console.log(`📊 Fields to map: ${Object.keys(this.schema).filter(field => field !== 'crawled_timestamp').join(', ')}`);
    
    const browser = await chromium.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      const page = await context.newPage();
      await page.setViewportSize({ width: 1280, height: 720 });
      
      // Navigate to target page first
      console.log(`📄 Loading page...`);
      await page.goto(this.config.scraper_config.website_url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      await page.waitForTimeout(3000);
      console.log('✅ Page loaded successfully!');
      
      // Then inject inspector script  
      await this.injectInspectorScript(page);
      
      // Wait for the script to be ready in the page context
      await page.waitForFunction(() => (window as any).inspectorReady === true, { timeout: 5000 });

      console.log('\n🎮 INSPECTOR CONTROLS:');
      console.log('• Click on elements in the browser to select them');
      console.log('• Press ESC to cancel current selection');
      console.log('• Use terminal commands to navigate fields\n');

      // Process each field
      for (const fieldName of Object.keys(this.schema)) {
        if (fieldName === 'crawled_timestamp') continue; // Skip auto-generated fields
        
        console.log(`\n📍 Progress: ${Object.keys(this.mappings).length + 1}/${Object.keys(this.schema).length - 1}`);
        
        const elementData = await this.selectElementForField(page, fieldName);
        
        if (elementData) {
          // Generate selector variations
          const selectors = this.generateSelectorVariations(elementData);
          
          console.log('\n✅ Element selected!');
          console.log(`📋 Tag: ${elementData.tagName}`);
          console.log(`📝 Text: "${elementData.textContent?.substring(0, 50) || 'No text'}"`);
          console.log(`🎯 Generated selectors:`);
          
          selectors.forEach((selector, index) => {
            console.log(`  ${index + 1}. ${selector}`);
          });

          // Test selectors and pick the best one - CSS/HTML only
          let bestSelector = '';
          let selectorMethod = 'CSS';
          
          // Filter out text-based selectors, only use CSS/HTML selectors
          const cssSelectors = selectors.filter(selector => 
            !selector.startsWith('text=') && !selector.startsWith('text*=')
          );
          
          console.log(`🎯 Testing ${cssSelectors.length} CSS selectors:`);
          
          for (const selector of cssSelectors) {
            try {
              const count = await page.locator(selector).count();
              console.log(`   ${selector} → ${count} matches`);
              
              if (count === 1) {
                bestSelector = selector;
                selectorMethod = 'CSS';
                console.log(`   ✅ Perfect match: ${selector}`);
                break;
              } else if (count > 1 && !bestSelector) {
                // Use first working selector as fallback
                bestSelector = selector;
                selectorMethod = 'CSS';
                console.log(`   ⚠️ Multiple matches (${count}), using as fallback: ${selector}`);
              }
            } catch (error) {
              console.log(`   ❌ Invalid selector: ${selector}`);
            }
          }

          if (!bestSelector && cssSelectors.length > 0) {
            bestSelector = cssSelectors[0]; // Use first CSS selector as last resort
            selectorMethod = 'CSS';
          }

          const mapping = {
            field: fieldName,
            selector: bestSelector,
            method: selectorMethod,
            description: `${fieldName} CSS selector`,
            elementText: elementData.textContent?.trim().substring(0, 100),
            attributes: elementData.attributes
          };
          
          console.log(`✅ Mapped ${fieldName}: ${mapping.selector}`);
          this.mappings.push(mapping);
          
          // Ask for next action
          const choice = await this.askUserChoice();
          if (choice === 'finish') break;
          if (choice === 'redo') continue; // This will repeat the current field
        } else {
          console.log(`⚠️ Skipped ${fieldName} - no element selected`);
          
          // Ask for next action
          const choice = await this.askUserChoice();
          if (choice === 'finish') break;
          if (choice === 'redo') continue; // This will repeat the current field
        }
      }
      
      // Generate results
      await this.generateResults();
      
    } catch (error) {
      console.error('❌ Error during inspection:', (error as Error).message);
    } finally {
      await browser.close();
      this.rl.close();
      console.log('\n🧹 Browser closed');
    }
  }

  private async generateResults(): Promise<void> {
    console.log('\n🎉 INSPECTION COMPLETE!');
    console.log('========================');
    
    // Display mappings
    this.mappings.forEach((mapping, index) => {
      console.log(`\n${index + 1}. ${mapping.field}:`);
      console.log(`   Selector: ${mapping.selector}`);
      console.log(`   Method: ${mapping.method}`);
      console.log(`   Text: "${mapping.elementText || 'No text'}"`);
    });

    // Generate enhanced config with data-extraction section
    const enhancedConfig = {
      ...this.config,
      data_extraction: {
        selector_mappings: this.mappings.reduce((acc, mapping) => {
          acc[mapping.field] = {
            selector: mapping.selector,
            method: mapping.method,
            description: mapping.description
          };
          return acc;
        }, {} as any),
        extraction_strategy: "CSS_SELECTORS",
        created_at: new Date().toISOString(),
        total_fields: this.mappings.length
      }
    };

    // Save enhanced config
    const outputPath = path.join(__dirname, 'enhanced-config.json');
    fs.writeFileSync(outputPath, JSON.stringify(enhancedConfig, null, 2));
    
    // Generate extraction template
    const extractorTemplate = this.generateExtractorTemplate();
    const templatePath = path.join(__dirname, 'generated-extractor.ts');
    fs.writeFileSync(templatePath, extractorTemplate);
    
    console.log(`\n💾 Files generated:`);
    console.log(`📄 Enhanced config: ${outputPath}`);
    console.log(`🔧 Extractor template: ${templatePath}`);
    
    console.log('\n✅ Selector inspection completed successfully!');
    console.log('📋 All selectors use CSS/HTML method (no text selectors)');
  }

  private generateExtractorTemplate(): string {
    const mappings = this.mappings;
    
    return `// Auto-generated extractor based on selector inspection
import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';

interface ProductData {
  [key: string]: any;
  crawled_timestamp: string;
  url: string;
}

class GeneratedExtractor {
  async extract(url?: string): Promise<ProductData> {
    const targetUrl = url || "${this.config.scraper_config.website_url}";
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      
      const data: ProductData = {
        crawled_timestamp: new Date().toISOString(),
        url: targetUrl
      };
      
      // Extract data using inspected selectors
${mappings.map(mapping => `      
      // Extract ${mapping.field}
      try {
        const ${mapping.field}Element = await page.locator('${mapping.selector}').first();
        if (await ${mapping.field}Element.count() > 0) {
          data.${mapping.field} = await ${mapping.field}Element.textContent();
          console.log('✅ ${mapping.field}:', data.${mapping.field});
        } else {
          console.log('⚠️ Could not find ${mapping.field}');
        }
      } catch (error) {
        console.log('❌ Error extracting ${mapping.field}:', error);
      }`).join('')}
      
      // Save results
      fs.writeFileSync('extracted-data.json', JSON.stringify(data, null, 2));
      console.log('\\n💾 Data saved to extracted-data.json');
      
      return data;
      
    } finally {
      await browser.close();
    }
  }
}

// Usage
const extractor = new GeneratedExtractor();
const url = process.argv[2];
extractor.extract(url);
`;
  }
}

// Usage
const inspector = new SelectorInspector();
inspector.inspectSelectors(); 