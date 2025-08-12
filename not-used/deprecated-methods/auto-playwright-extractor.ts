import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

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

interface ExtractedData {
  [key: string]: any;
  crawled_timestamp: string;
  url: string;
  selectors_used: { [key: string]: string };
}

class AutoPlaywrightExtractor {
  private config: Config;

  constructor(configPath: string = './config.json') {
    const configFile = fs.readFileSync(configPath, 'utf8');
    this.config = JSON.parse(configFile);
  }

  private async autoExtractField(page: Page, fieldName: string, fieldConfig: SchemaField): Promise<{ value: any, selector: string } | null> {
    console.log(`🤖 AI-powered extraction for ${fieldName}: ${fieldConfig.description}`);

    try {
      // Use auto() method to find the element with AI
      const result = await page.evaluate(async (fieldName: string) => {
        // Improved AI-powered element detection with better filtering
        const hints: { [key: string]: string[] } = {
          'name': ['h1', 'h2', '.product-title', '.product-name', '.title', '[data-test*="title"]', '[data-test*="name"]', '.product-header h1', '.product-header h2'],
          'customer_price_lc': [
            '.price', '.current-price', '.sale-price', '[data-price]', '.price-current', '[class*="price"]', 
            '.price-now', '.final-price', '.cena', '.price-value', '.product-price', '.selling-price',
            '.price-box .price', '.price-container .price', '.price-wrapper .price', '.actual-price'
          ],
          'base_price_lc': [
            '.original-price', '.was-price', '.regular-price', '[data-original-price]', '.price-was', 
            '.price-old', '.strikethrough', '.crossed-price', '.price-before', '.list-price',
            '.rrp-price', '.msrp-price', '.compare-price'
          ],
          'brand': ['.brand', '.manufacturer', '[data-brand]', '[class*="brand"]', '.brand-name', '.product-brand'],
          'sku': ['.sku', '.product-code', '.item-code', '[data-sku]', '[data-product-id]', '.product-id'],
          'discount_percentage': ['.discount', '.savings', '.sale-badge', '[class*="discount"]', '.percent-off', '.sale-percent'],
          'availability': ['.availability', '.stock', '.in-stock', '[data-availability]', '.stock-status', '.product-availability'],
          'image_url': ['.product-image img', '.main-image img', '.hero-image img', '[data-test*="image"] img', '.gallery img:first-child'],
          'category': ['.breadcrumb', '.category', '.product-category', '[data-category]', '.breadcrumbs', 'nav[aria-label*="breadcrumb"]']
        };

        const fieldHints = hints[fieldName] || [];
        
        // Helper function to check if element is valid (not script, iframe, hidden, etc.)
        function isValidElement(element: Element): boolean {
          if (!element) return false;
          
          const tagName = element.tagName.toLowerCase();
          const computedStyle = window.getComputedStyle(element);
          
          // Skip script, style, iframe, noscript elements
          if (['script', 'style', 'iframe', 'noscript', 'meta', 'link'].includes(tagName)) {
            return false;
          }
          
          // Skip hidden elements
          if (computedStyle.display === 'none' || 
              computedStyle.visibility === 'hidden' || 
              computedStyle.opacity === '0') {
            return false;
          }
          
          // Skip elements with very small dimensions
          const rect = element.getBoundingClientRect();
          if (rect.width < 5 || rect.height < 5) {
            return false;
          }
          
          return true;
        }

        // Helper function to get clean text content
        function getCleanText(element: Element): string {
          const text = element.textContent?.trim() || '';
          // Remove extra whitespace and newlines
          return text.replace(/\s+/g, ' ').trim();
        }

        // Helper function to check if text looks like a price
        function looksLikePrice(text: string): boolean {
          if (!text) return false;
          
          // Czech/European price patterns
          const pricePatterns = [
            /\d+[.,]\d+\s*Kč/i,           // 55.9 Kč or 55,9 Kč
            /\d+\s*Kč/i,                  // 55 Kč
            /Kč\s*\d+[.,]?\d*/i,          // Kč 55.9
            /\d+[.,]\d+\s*€/i,            // 55.9 €
            /€\s*\d+[.,]?\d*/i,           // € 55.9
            /\$\s*\d+[.,]?\d*/,           // $ 55.9
            /\d+[.,]\d+\s*\$/,            // 55.9 $
            /^\d+[.,]?\d*$/               // Just numbers like 55.9 or 55
          ];
          
          return pricePatterns.some(pattern => pattern.test(text));
        }

        // Try each hint in order of preference
        for (const selector of fieldHints) {
          try {
            let elements;
            
            if (selector.includes('img')) {
              elements = document.querySelectorAll(selector);
              for (const img of Array.from(elements)) {
                if (!isValidElement(img)) continue;
                
                const htmlImg = img as HTMLImageElement;
                let src = htmlImg.src || htmlImg.getAttribute('data-src') || htmlImg.getAttribute('data-lazy-src');
                
                if (src && src.length > 10 && !src.includes('gtm') && !src.includes('analytics')) {
                  return {
                    value: src.startsWith('http') ? src : window.location.origin + src,
                    selector: selector,
                    method: 'AI-Auto'
                  };
                }
              }
            } else {
              elements = document.querySelectorAll(selector);
              for (const element of Array.from(elements)) {
                if (!isValidElement(element)) continue;
                
                const text = getCleanText(element);
                
                // Better text validation based on field type
                if (fieldName.includes('price') && text) {
                  // Enhanced price detection
                  if (looksLikePrice(text)) {
                    return { value: text, selector: selector, method: 'AI-Auto' };
                  }
                } else if (fieldName === 'name' && text) {
                  // For names, avoid generic text and ensure reasonable length
                  if (text.length > 3 && text.length < 200 && 
                      !text.toLowerCase().includes('see all') &&
                      !text.toLowerCase().includes('ver todos') &&
                      !text.toLowerCase().includes('kategorie') &&
                      !text.toLowerCase().includes('category')) {
                    return { value: text, selector: selector, method: 'AI-Auto' };
                  }
                } else if (fieldName.includes('brand') && text) {
                  // For brands, ensure it's not too long and not generic
                  if (text.length > 1 && text.length < 50 && 
                      !text.toLowerCase().includes('brand') &&
                      !text.toLowerCase().includes('manufacturer')) {
                    return { value: text, selector: selector, method: 'AI-Auto' };
                  }
                } else if (fieldName.includes('sku') && text) {
                  // For SKU, look for alphanumeric codes
                  const skuRegex = /^[A-Za-z0-9-_]+$/;
                  if (skuRegex.test(text.replace(/\s/g, '')) && text.length < 50) {
                    return { value: text, selector: selector, method: 'AI-Auto' };
                  }
                } else if (text && text.length > 0 && text.length < 100) {
                  return { value: text, selector: selector, method: 'AI-Auto' };
                }
              }
            }
          } catch (e) {
            continue;
          }
        }

        // Enhanced fallback: Look for prices in all text elements
        if (fieldName.includes('price')) {
          const allElements = document.querySelectorAll('*');
          for (const element of Array.from(allElements)) {
            if (!isValidElement(element)) continue;
            
            const text = getCleanText(element);
            if (looksLikePrice(text) && element.children.length === 0) {
              // This is a leaf element with price-like text
              return {
                value: text,
                selector: element.tagName.toLowerCase() + (element.className ? '.' + element.className.split(' ')[0] : ''),
                method: 'AI-Price-Scan'
              };
            }
          }
        }

        // Improved fallback: smart text search with better filtering
        const searchTerms: { [key: string]: string[] } = {
          'name': ['product', 'title'],
          'customer_price_lc': ['price', 'cena', 'precio', 'Kč', '€', '$'],
          'base_price_lc': ['original', 'was', 'before', 'rrp'],
          'brand': ['brand', 'marca', 'značka'],
          'sku': ['sku', 'code', 'id'],
          'discount_percentage': ['discount', 'sale', 'sleva'],
          'availability': ['available', 'in stock', 'skladem'],
          'category': ['category', 'kategorie']
        };

        const terms = searchTerms[fieldName] || [];
        
        for (const term of terms) {
          // Look for elements that contain the term in their class, id, or data attributes
          const attributeSelectors = [
            `[class*="${term}"]`,
            `[id*="${term}"]`,
            `[data-*="${term}"]`
          ];
          
          for (const attrSelector of attributeSelectors) {
            try {
              const elements = document.querySelectorAll(attrSelector);
              for (const element of Array.from(elements)) {
                if (!isValidElement(element)) continue;
                
                const text = getCleanText(element);
                if (text && text.length > 0 && text.length < 200 && 
                    !text.includes('gtm') && !text.includes('analytics')) {
                  
                  // Special validation for prices
                  if (fieldName.includes('price') && !looksLikePrice(text)) {
                    continue;
                  }
                  
                  return {
                    value: text,
                    selector: attrSelector,
                    method: 'AI-Attribute-Search'
                  };
                }
              }
            } catch (e) {
              continue;
            }
          }
        }

        return null;
      }, fieldName);

      if (result) {
        console.log(`✅ AI found ${fieldName}: "${result.value}" using ${result.selector}`);
        return { value: this.processValue(result.value, fieldConfig.type, fieldName), selector: result.selector };
      } else {
        console.log(`⚠️ AI could not find ${fieldName}`);
        return null;
      }

    } catch (error) {
      console.log(`❌ AI extraction failed for ${fieldName}:`, error);
      return null;
    }
  }

  private getFieldHints(fieldName: string): string {
    const hints: { [key: string]: string } = {
      'name': 'Usually in <h1>, <h2>, or elements with classes like "product-title", "product-name"',
      'customer_price_lc': 'Usually in elements with classes like "price", "current-price", "sale-price"',
      'base_price_lc': 'Usually in elements with classes like "original-price", "was-price", "regular-price"',
      'brand': 'Usually in elements with classes like "brand", "manufacturer", or near the product title',
      'sku': 'Usually in elements with classes like "sku", "product-code", "item-code" or in product details',
      'discount_percentage': 'Usually in elements with classes like "discount", "savings", "sale-badge"',
      'availability': 'Usually in elements with classes like "availability", "stock", "in-stock"',
      'image_url': 'Usually the main product image, often the largest or first image',
      'category': 'Usually in breadcrumbs or elements with classes like "category", "breadcrumb"'
    };
    
    return hints[fieldName] || `Look for elements related to "${fieldName}"`;
  }

  private processValue(value: any, fieldType: string, fieldName: string): any {
    if (!value) return null;

    switch (fieldType) {
      case 'str':
        return String(value).trim();
      
      case 'float':
        if (fieldName.includes('price')) {
          // Extract numeric value from price strings
          const cleanValue = String(value).replace(/[^\d.,]/g, '').replace(',', '.');
          const num = parseFloat(cleanValue);
          return isNaN(num) ? null : num;
        } else if (fieldName.includes('discount')) {
          // Extract percentage value
          const percentMatch = String(value).match(/(\d+)%/);
          return percentMatch ? parseFloat(percentMatch[1]) : null;
        } else {
          const num = parseFloat(String(value));
          return isNaN(num) ? null : num;
        }
      
      case 'boolean':
        const lowerValue = String(value).toLowerCase();
        return lowerValue.includes('disponible') || lowerValue.includes('available') || 
               lowerValue.includes('in stock') || lowerValue.includes('en stock');
      
      case 'timestamp':
        return new Date().toISOString();
      
      default:
        return value;
    }
  }

  async extractData(urlOverride?: string): Promise<ExtractedData> {
    const targetUrl = urlOverride || this.config.scraper_config.website_url;
    
    console.log('🤖 Starting Auto-Playwright AI extraction...');
    console.log(`🎯 Target: ${targetUrl}`);
    console.log(`📋 Schema: ${this.config.scraper_config.name}`);
    console.log(`🧠 Using AI to find selectors automatically...`);

    const browser = await chromium.launch({ 
      headless: false,  // Keep visible to see the AI work
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      const page = await context.newPage();
      page.setDefaultTimeout(30000);
      
      // Navigate to page
      console.log(`📄 Loading page...`);
      await page.goto(targetUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      await page.waitForTimeout(3000);
      console.log('✅ Page loaded, starting AI extraction...');

      const extractedData: ExtractedData = {
        crawled_timestamp: new Date().toISOString(),
        url: targetUrl,
        selectors_used: {}
      };

      // Extract each field using AI
      const extractionPromises: Promise<void>[] = [];
      
      for (const [fieldName, fieldConfig] of Object.entries(this.config.scraper_config.schema)) {
        if (fieldName === 'crawled_timestamp') continue; // Skip auto-generated field
        
        extractionPromises.push(
          this.autoExtractField(page, fieldName, fieldConfig).then(result => {
            if (result) {
              extractedData[fieldName] = result.value;
              extractedData.selectors_used[fieldName] = result.selector;
            }
          })
        );
      }

      // Wait for all AI extractions to complete
      await Promise.all(extractionPromises);

      // Display results
      console.log('\n🎉 AI EXTRACTION RESULTS:');
      console.log('========================');
      
      for (const [field, value] of Object.entries(extractedData)) {
        if (field !== 'selectors_used' && field !== 'crawled_timestamp' && field !== 'url') {
          const emoji = this.getFieldEmoji(field);
          console.log(`${emoji} ${field}: ${value || 'Not found'}`);
        }
      }

      console.log('\n🤖 AI SELECTORS USED:');
      console.log('====================');
      Object.entries(extractedData.selectors_used).forEach(([field, selector]) => {
        console.log(`${field}: ${selector}`);
      });

      // Save data
      const outputPath = path.join(__dirname, 'auto-extracted-data.json');
      fs.writeFileSync(outputPath, JSON.stringify(extractedData, null, 2));
      console.log(`\n💾 Data saved to: ${outputPath}`);
      
      console.log('\n✅ Auto-Playwright extraction completed!');
      
      return extractedData;

    } catch (error) {
      console.error('❌ Auto-Playwright extraction failed:', (error as Error).message);
      throw error;
    } finally {
      await browser.close();
      console.log('\n🧹 Browser closed');
    }
  }

  private getFieldEmoji(field: string): string {
    const icons: { [key: string]: string } = {
      'name': '📝',
      'customer_price_lc': '💰',
      'base_price_lc': '💸',
      'discount_percentage': '🏷️',
      'sku': '🔢',
      'brand': '🏪',
      'availability': '📦',
      'image_url': '🖼️',
      'category': '📂'
    };
    return icons[field] || '📌';
  }

  // Generate improved extractor based on AI findings
  async generateImprovedExtractor(): Promise<void> {
    // This could be called after successful extraction to create an optimized version
    const extractedData = JSON.parse(fs.readFileSync('./auto-extracted-data.json', 'utf8'));
    
    const template = `// Auto-generated extractor using AI-discovered selectors
import { chromium } from 'playwright';
import * as fs from 'fs';

class AIOptimizedExtractor {
  async extract(url?: string) {
    const targetUrl = url || "${this.config.scraper_config.website_url}";
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      
      const data = {
        crawled_timestamp: new Date().toISOString(),
        url: targetUrl
      };
      
      // AI-discovered selectors:
${Object.entries(extractedData.selectors_used).map(([field, selector]) => `
      // Extract ${field} using AI-found selector: ${selector}
      try {
        const element = await page.locator('${selector}').first();
        if (await element.count() > 0) {
          data.${field} = await element.textContent();
        }
      } catch (error) {
        console.log('Error extracting ${field}:', error);
      }`).join('')}
      
      fs.writeFileSync('optimized-extraction.json', JSON.stringify(data, null, 2));
      console.log('✅ Optimized extraction complete');
      return data;
      
    } finally {
      await browser.close();
    }
  }
}

const extractor = new AIOptimizedExtractor();
extractor.extract();`;

    fs.writeFileSync('./ai-optimized-extractor.ts', template);
    console.log('🤖 Generated AI-optimized extractor: ai-optimized-extractor.ts');
  }
}

// Usage
const extractor = new AutoPlaywrightExtractor();
const url = process.argv[2];
extractor.extractData(url).then(() => {
  extractor.generateImprovedExtractor();
}); 