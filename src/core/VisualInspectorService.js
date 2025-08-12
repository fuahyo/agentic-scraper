const { chromium } = require('playwright');
const path = require('path');

class VisualInspectorService {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isInspecting = false;
  }

  async initialize() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
    }
  }

  async startVisualInspection(url, schema, options = {}) {
    await this.initialize();
    
    this.page = await this.context.newPage();
    await this.page.setViewportSize({ width: 1280, height: 720 });
    
    try {
      // Navigate to target page
      console.log('Loading page for visual inspection...');
      await this.page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      await this.page.waitForTimeout(3000);
      
      // Inject the enhanced inspector script
      await this.injectInspectorScript();
      
      // Wait for script to be ready
      await this.page.waitForFunction(() => window.inspectorReady === true, { timeout: 5000 });
      
      this.isInspecting = true;
      
      return {
        success: true,
        message: 'Visual inspector started. Page is ready for selection.',
        browserReady: true
      };
      
    } catch (error) {
      console.error('Error starting visual inspection:', error);
      await this.cleanup();
      throw new Error(`Failed to start visual inspection: ${error.message}`);
    }
  }

  async selectElementForField(fieldName, fieldDescription) {
    if (!this.page || !this.isInspecting) {
      throw new Error('Visual inspector not started');
    }

    try {
      console.log(`Starting selection for field: ${fieldName}`);
      
      // Reset selection state
      await this.page.evaluate(() => {
        window.elementSelected = false;
        window.selectedElementData = null;
      });

      // Start the inspection for this field
      await this.page.evaluate((fieldName) => {
        if (window.startInspecting) {
          window.startInspecting(fieldName);
        }
      }, fieldName);

      // Wait for element selection with timeout
      const maxAttempts = 120; // 2 minutes total
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        try {
          const isSelected = await this.page.evaluate(() => window.elementSelected);
          
          if (isSelected) {
            const elementData = await this.page.evaluate(() => window.selectedElementData);
            if (elementData) {
              console.log(`Element selected for ${fieldName}:`, elementData.tagName);
              
              // Generate selectors for the selected element
              const selectors = this.generateSelectorVariations(elementData);
              
              // Test selectors and pick the best one
              const bestSelector = await this.findBestSelector(selectors);
              
              return {
                success: true,
                field: fieldName,
                selector: bestSelector,
                elementData,
                selectors: selectors
              };
            }
          }
          
          // Check if user cancelled
          const isInspecting = await this.page.evaluate(() => {
            const overlay = document.getElementById('playwright-inspector-overlay');
            return overlay && overlay.style.display !== 'none';
          });
          
          if (!isInspecting && !isSelected) {
            console.log('Inspection cancelled by user');
            return {
              success: false,
              cancelled: true,
              message: 'Selection cancelled by user'
            };
          }
          
          await this.page.waitForTimeout(1000);
          attempts++;
          
        } catch (error) {
          console.log(`Selection attempt ${attempts + 1} failed:`, error.message);
          attempts++;
          await this.page.waitForTimeout(1000);
        }
      }

      // Timeout reached
      console.log('Selection timeout reached');
      await this.page.evaluate(() => {
        if (window.stopInspecting) {
          window.stopInspecting();
        }
      });
      
      return {
        success: false,
        timeout: true,
        message: 'Selection timeout - no element was selected'
      };

    } catch (error) {
      console.error(`Error during element selection for ${fieldName}:`, error);
      
      // Ensure inspection is stopped
      try {
        await this.page.evaluate(() => {
          if (window.stopInspecting) {
            window.stopInspecting();
          }
        });
      } catch (e) {
        // Ignore cleanup errors
      }
      
      throw new Error(`Element selection failed: ${error.message}`);
    }
  }

  generateSelectorVariations(elementData) {
    const selectors = [];
    
    // ID selector (highest priority)
    if (elementData.id) {
      selectors.push(`#${elementData.id}`);
    }
    
    // Class selectors
    if (elementData.className) {
      const classes = elementData.className.split(' ').filter(Boolean);
      classes.forEach(cls => {
        selectors.push(`.${cls}`);
      });
      if (classes.length > 1) {
        selectors.push(`.${classes.join('.')}`);
      }
    }
    
    // Attribute selectors
    const attrs = elementData.attributes || {};
    Object.keys(attrs).forEach(attr => {
      if (['data-test', 'data-testid', 'data-cy', 'aria-label'].includes(attr)) {
        selectors.push(`[${attr}="${attrs[attr]}"]`);
      }
      if (attr.startsWith('data-')) {
        selectors.push(`[${attr}]`);
      }
    });
    
    // Tag + class combinations
    if (elementData.tagName && elementData.className) {
      const classes = elementData.className.split(' ').filter(Boolean);
      if (classes.length > 0) {
        selectors.push(`${elementData.tagName.toLowerCase()}.${classes[0]}`);
      }
    }
    
    // Simple tag selector
    if (elementData.tagName) {
      selectors.push(elementData.tagName.toLowerCase());
    }
    
    return selectors;
  }

  async findBestSelector(selectors) {
    const cssSelectors = selectors.filter(selector => 
      !selector.startsWith('text=') && !selector.startsWith('text*=')
    );
    
    console.log(`Testing ${cssSelectors.length} CSS selectors...`);
    
    for (const selector of cssSelectors) {
      try {
        const count = await this.page.locator(selector).count();
        console.log(`   ${selector} → ${count} matches`);
        
        if (count === 1) {
          console.log(`   ✅ Perfect match: ${selector}`);
          return selector;
        } else if (count > 1 && count <= 5) {
          // Acceptable number of matches
          console.log(`   ⚠️ Multiple matches (${count}), but acceptable: ${selector}`);
          return selector;
        }
      } catch (error) {
        console.log(`   ❌ Invalid selector: ${selector}`);
      }
    }

    // If no perfect match, return the first valid CSS selector
    return cssSelectors.length > 0 ? cssSelectors[0] : selectors[0];
  }

  async injectInspectorScript() {
    await this.page.addScriptTag({
      content: `
        // Create overlay for highlighting
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
          
          originalCursor = document.body.style.cursor;
          document.body.style.cursor = 'crosshair';
          
          infoBox.innerHTML = \`
            <div style="font-weight: bold; color: #4CAF50; font-size: 16px; margin-bottom: 12px;">
              🎯 VISUAL SELECTOR TOOL
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Field:</strong> <span style="color: #ffeb3b;">\${fieldName}</span>
            </div>
            <div style="color: #ddd; margin-bottom: 8px;">
              Move mouse to highlight elements
            </div>
            <div style="color: #4CAF50; font-weight: bold; margin-bottom: 8px;">
              Click to select the target element
            </div>
            <div style="color: #ff6666; font-size: 12px;">
              Press ESC to cancel
            </div>
          \`;
          infoBox.style.display = 'block';
          overlay.style.display = 'block';
          
          console.log('🎯 Visual inspection started for:', fieldName);
        };

        window.stopInspecting = () => {
          isInspecting = false;
          currentField = '';
          document.body.style.cursor = originalCursor;
          overlay.style.display = 'none';
          infoBox.style.display = 'none';
          selectedElement = null;
          console.log('⏹️ Visual inspection stopped');
        };

        window.selectedElementData = null;
        window.elementSelected = false;

        // Mouse move handler
        function handleMouseMove(e) {
          if (!isInspecting) return;
          
          const elementBelow = e.target;
          if (!elementBelow || 
              elementBelow.id === 'playwright-inspector-overlay' || 
              elementBelow.id === 'playwright-inspector-info') {
            return;
          }

          const rect = elementBelow.getBoundingClientRect();
          overlay.style.left = (rect.left + window.scrollX) + 'px';
          overlay.style.top = (rect.top + window.scrollY) + 'px';
          overlay.style.width = rect.width + 'px';
          overlay.style.height = rect.height + 'px';

          const tagName = elementBelow.tagName.toLowerCase();
          const className = elementBelow.className || '';
          const id = elementBelow.id || '';
          const textContent = (elementBelow.textContent || '').trim().substring(0, 80);
          
          infoBox.innerHTML = \`
            <div style="font-weight: bold; color: #4CAF50; font-size: 16px; margin-bottom: 12px;">
              🎯 VISUAL SELECTOR TOOL
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Field:</strong> <span style="color: #ffeb3b;">\${currentField}</span>
            </div>
            <div style="margin-bottom: 8px;">
              <strong>Element:</strong> <span style="color: #81C784;">\${tagName}</span>
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

        // Click handler
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
          
          const rect = elementBelow.getBoundingClientRect();
          const styles = window.getComputedStyle(elementBelow);
          
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
              ⚙️ Processing selection...
            </div>
          \`;
          
          console.log('✅ Element selected:', currentField, elementBelow);
          
          setTimeout(() => {
            window.stopInspecting();
          }, 1500);
        }

        // Keyboard handler
        function handleKeyDown(e) {
          if (e.key === 'Escape' && isInspecting) {
            e.preventDefault();
            e.stopPropagation();
            window.stopInspecting();
            console.log('❌ Visual inspection cancelled (ESC)');
          }
        }

        document.addEventListener('mousemove', handleMouseMove, true);
        document.addEventListener('click', handleClick, true);
        document.addEventListener('keydown', handleKeyDown, true);

        window.inspectorReady = true;
        console.log('🚀 Visual inspector script loaded and ready');
      `
    });
  }

  async cleanup() {
    this.isInspecting = false;
    
    if (this.page) {
      try {
        await this.page.close();
      } catch (error) {
        console.error('Error closing page:', error);
      }
      this.page = null;
    }
    
    if (this.context) {
      try {
        await this.context.close();
      } catch (error) {
        console.error('Error closing context:', error);
      }
      this.context = null;
    }
    
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        console.error('Error closing browser:', error);
      }
      this.browser = null;
    }
  }

  async isReady() {
    return this.browser && this.page && this.isInspecting;
  }
}

module.exports = VisualInspectorService;