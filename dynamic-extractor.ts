import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

interface SelectorInfo {
  method: string;
  selector: string;
  description?: string;
}

interface ExtractionResult {
  value?: any;
  selectorUsed?: SelectorInfo;
}

interface ProductData {
  [key: string]: any;
  crawled_timestamp: string;
  url: string;
  selectors: { [key: string]: SelectorInfo };
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

class IntelligentExtractor {
  private config: Config;
  private pageText: string = '';

  constructor(configPath: string = './config.json') {
    const configFile = fs.readFileSync(configPath, 'utf8');
    this.config = JSON.parse(configFile);
  }

  // Generate intelligent selectors based on field name and type
  private generateSelectors(fieldName: string, fieldType: string): {
    css: string[];
    attributes: string[];
    regex: Array<{ pattern: string; flags: string; description: string }>;
  } {
    const selectors = {
      css: [] as string[],
      attributes: [] as string[],
      regex: [] as Array<{ pattern: string; flags: string; description: string }>
    };

    // Generate CSS selectors based on field name
    switch (fieldName) {
      case 'name':
        selectors.css = ['h1', '.product-title', '.product-name', '[data-test*="title"]', '.title'];
        selectors.attributes = ['data-product-name', 'data-title'];
        break;

      case 'customer_price_lc':
        selectors.css = ['.price-current', '.current-price', '.price', '.sale-price', '[data-test*="price"]'];
        selectors.attributes = ['data-price', 'data-current-price'];
        selectors.regex = [
          { pattern: '(\\$[\\d,]+\\.?\\d*)', flags: 'g', description: 'USD prices' },
          { pattern: '([\\d,]+\\.?\\d*\\s*Kč)', flags: 'g', description: 'Czech Koruna' },
          { pattern: '(€[\\d,]+\\.?\\d*)', flags: 'g', description: 'Euro prices' },
          { pattern: '(£[\\d,]+\\.?\\d*)', flags: 'g', description: 'GBP prices' }
        ];
        break;

      case 'base_price_lc':
        selectors.css = ['.price-original', '.original-price', '.was-price', '.regular-price'];
        selectors.attributes = ['data-original-price', 'data-was-price'];
        selectors.regex = [
          { pattern: '(\\$[\\d,]+\\.?\\d*)', flags: 'g', description: 'USD prices' },
          { pattern: '([\\d,]+\\.?\\d*\\s*Kč)', flags: 'g', description: 'Czech Koruna' },
          { pattern: '(€[\\d,]+\\.?\\d*)', flags: 'g', description: 'Euro prices' },
          { pattern: '(£[\\d,]+\\.?\\d*)', flags: 'g', description: 'GBP prices' }
        ];
        break;

      case 'discount_percentage':
        selectors.css = ['.discount', '.savings', '[class*="discount"]', '.sale-badge'];
        selectors.attributes = ['data-discount', 'data-savings'];
        selectors.regex = [
          { pattern: '(\\d+%\\s*dcto\\.?)', flags: 'i', description: 'Spanish discount' },
          { pattern: '(\\d+%\\s*off)', flags: 'i', description: 'English discount' },
          { pattern: '(\\d+%)', flags: 'i', description: 'Percentage discount' }
        ];
        break;

      case 'brand':
        selectors.css = ['[class*="brand"]', '.brand', '.manufacturer', '[data-test*="brand"]'];
        selectors.attributes = ['data-brand', 'data-manufacturer'];
        break;

      case 'sku':
        selectors.css = ['.sku', '.product-code', '[data-test*="sku"]', '[data-test*="code"]'];
        selectors.attributes = ['data-sku', 'data-product-id'];
        selectors.regex = [
          { pattern: 'Código:\\s*(\\d+)', flags: 'i', description: 'Spanish product code' },
          { pattern: 'SKU:\\s*([A-Z0-9]+)', flags: 'i', description: 'SKU pattern' }
        ];
        break;

      case 'availability':
        selectors.css = ['.availability', '.stock', '[data-test*="stock"]', '.in-stock'];
        selectors.attributes = ['data-availability', 'data-stock'];
        selectors.regex = [
          { pattern: '(In Stock|Available|Disponible)', flags: 'i', description: 'Available' },
          { pattern: '(Out of Stock|Unavailable|Sin stock)', flags: 'i', description: 'Unavailable' }
        ];
        break;

      case 'image_url':
        selectors.css = ['.product-image img', '.main-image img', '[data-test*="image"] img', '.gallery img'];
        selectors.attributes = ['src', 'data-src', 'data-image'];
        break;

      case 'category':
        selectors.css = ['.breadcrumb', '.category', '[data-test*="category"]', '.product-category'];
        selectors.attributes = ['data-category'];
        break;

      default:
        // Generic selectors for unknown fields
        selectors.css = [`[class*="${fieldName}"]`, `[data-${fieldName}]`, `.${fieldName}`];
        selectors.attributes = [`data-${fieldName}`];
    }

    return selectors;
  }

  async extractFromCSS(page: Page, selectors: string[]): Promise<ExtractionResult> {
    for (const selector of selectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.count() > 0) {
          const text = await element.textContent();
          if (text && text.trim()) {
            return {
              value: text.trim(),
              selectorUsed: { method: 'CSS', selector }
            };
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    return {};
  }

  async extractFromAttributes(page: Page, fieldName: string, attributes: string[]): Promise<ExtractionResult> {
    // Special handling for image URLs
    if (fieldName === 'image_url') {
      const imgSelectors = ['.product-image img', '.main-image img', '[data-test*="image"] img', '.gallery img'];
      for (const selector of imgSelectors) {
        try {
          const element = await page.locator(selector).first();
          if (await element.count() > 0) {
            const src = await element.getAttribute('src') || await element.getAttribute('data-src');
            if (src) {
              return {
                value: src.startsWith('http') ? src : `https:${src}`,
                selectorUsed: { method: 'CSS + Attribute', selector: `${selector}[src]` }
              };
            }
          }
        } catch (error) {
          // Continue
        }
      }
    }

    // Standard attribute extraction
    for (const attr of attributes) {
      try {
        const element = await page.locator(`[${attr}]`).first();
        if (await element.count() > 0) {
          const value = await element.getAttribute(attr);
          if (value && value.trim()) {
            return {
              value: value.trim(),
              selectorUsed: { method: 'HTML Attribute', selector: `[${attr}]` }
            };
          }
        }
      } catch (error) {
        // Continue
      }
    }
    return {};
  }

  extractFromRegex(regexPatterns: any[], fieldType: string): ExtractionResult {
    for (const pattern of regexPatterns) {
      try {
        const regex = new RegExp(pattern.pattern, pattern.flags || 'i');
        
        if (fieldType === 'float' && (pattern.description?.includes('price') || pattern.description?.includes('prices'))) {
          // Multiple matches for prices
          const matches = Array.from(this.pageText.matchAll(new RegExp(pattern.pattern, 'g')));
          if (matches.length > 0) {
            const prices = matches.map(match => match[1] || match[0]).filter(price => {
              const num = parseFloat(price.replace(/[^\d.,]/g, '').replace(',', '.'));
              return num > 0 && num < 100000;
            });
            
            if (prices.length > 0) {
              return {
                value: prices,
                selectorUsed: { 
                  method: 'Regex Pattern', 
                  selector: pattern.pattern,
                  description: pattern.description 
                }
              };
            }
          }
        } else {
          // Single match
          const match = this.pageText.match(regex);
          if (match && match[1]) {
            return {
              value: match[1].trim(),
              selectorUsed: { 
                method: 'Regex Pattern', 
                selector: pattern.pattern,
                description: pattern.description 
              }
            };
          }
        }
      } catch (error) {
        // Continue
      }
    }
    return {};
  }

  // Extract SKU from URL
  extractSkuFromUrl(url: string): ExtractionResult | null {
    const patterns = [
      { pattern: '\\/products\\/(\\d+)', description: 'Product ID from URL' },
      { pattern: '\\/p\\/(\\d+)', description: 'Product ID from /p/ URL' },
      { pattern: '\\/item\\/(\\d+)', description: 'Item ID from URL' }
    ];

    for (const pattern of patterns) {
      const match = url.match(new RegExp(pattern.pattern, 'i'));
      if (match && match[1]) {
        return {
          value: match[1],
          selectorUsed: { 
            method: 'URL Pattern', 
            selector: pattern.pattern,
            description: pattern.description 
          }
        };
      }
    }
    return null;
  }

  // Convert extracted value to correct type
  private convertToType(value: any, fieldType: string, fieldName: string): any {
    if (!value) return null;

    switch (fieldType) {
      case 'str':
        return String(value);
      
      case 'float':
        if (Array.isArray(value)) {
          // Handle price arrays - return lowest for customer_price_lc, highest for base_price_lc
          const numbers = value.map(v => parseFloat(String(v).replace(/[^\d.,]/g, '').replace(',', '.')))
            .filter(num => !isNaN(num) && num > 0);
          
          if (numbers.length === 0) return null;
          
          if (fieldName === 'customer_price_lc') {
            return Math.min(...numbers);
          } else if (fieldName === 'base_price_lc') {
            return Math.max(...numbers);
          } else if (fieldName === 'discount_percentage') {
            const percentStr = String(value).match(/(\d+)%/);
            return percentStr ? parseFloat(percentStr[1]) : null;
          }
          return numbers[0];
        } else {
          if (fieldName === 'discount_percentage') {
            const percentStr = String(value).match(/(\d+)%/);
            return percentStr ? parseFloat(percentStr[1]) : null;
          }
          const cleanValue = String(value).replace(/[^\d.,]/g, '').replace(',', '.');
          const num = parseFloat(cleanValue);
          return isNaN(num) ? null : num;
        }
      
      case 'boolean':
        if (typeof value === 'boolean') return value;
        const lowerValue = String(value).toLowerCase();
        return lowerValue.includes('stock') || lowerValue.includes('available') || lowerValue.includes('disponible');
      
      case 'timestamp':
        return new Date().toISOString();
      
      default:
        return value;
    }
  }

  async extractField(page: Page, fieldName: string, fieldConfig: SchemaField): Promise<ExtractionResult> {
    console.log(`🔍 Extracting ${fieldName} (${fieldConfig.type})...`);

    // Handle special timestamp field
    if (fieldName === 'crawled_timestamp') {
      return {
        value: new Date().toISOString(),
        selectorUsed: { method: 'Generated', selector: 'new Date().toISOString()' }
      };
    }

    // Generate intelligent selectors for this field
    const selectors = this.generateSelectors(fieldName, fieldConfig.type);

    // Try CSS selectors first
    if (selectors.css.length > 0) {
      const result = await this.extractFromCSS(page, selectors.css);
      if (result.value) {
        result.value = this.convertToType(result.value, fieldConfig.type, fieldName);
        if (result.value !== null) {
          console.log(`✅ ${fieldName}: ${result.value} (CSS)`);
          return result;
        }
      }
    }

    // Try HTML attributes
    if (selectors.attributes.length > 0) {
      const result = await this.extractFromAttributes(page, fieldName, selectors.attributes);
      if (result.value) {
        result.value = this.convertToType(result.value, fieldConfig.type, fieldName);
        if (result.value !== null) {
          console.log(`✅ ${fieldName}: ${result.value} (Attribute)`);
          return result;
        }
      }
    }

    // Try regex patterns
    if (selectors.regex.length > 0) {
      const result = this.extractFromRegex(selectors.regex, fieldConfig.type);
      if (result.value) {
        result.value = this.convertToType(result.value, fieldConfig.type, fieldName);
        if (result.value !== null) {
          console.log(`✅ ${fieldName}: ${result.value} (Regex)`);
          return result;
        }
      }
    }

    // Try URL extraction for SKU
    if (fieldName === 'sku') {
      const urlResult = this.extractSkuFromUrl(page.url());
      if (urlResult) {
        urlResult.value = this.convertToType(urlResult.value, fieldConfig.type, fieldName);
        if (urlResult.value !== null) {
          console.log(`✅ ${fieldName}: ${urlResult.value} (URL)`);
          return urlResult;
        }
      }
    }

    // Fallback: try to extract brand from title
    if (fieldName === 'brand') {
      try {
        const titleElement = await page.locator('h1').first();
        if (await titleElement.count() > 0) {
          const titleText = await titleElement.textContent();
          if (titleText) {
            const firstWord = titleText.trim().split(' ')[0];
            console.log(`✅ ${fieldName}: ${firstWord} (Fallback from title)`);
            return {
              value: firstWord,
              selectorUsed: { method: 'Fallback', selector: 'First word from h1 title' }
            };
          }
        }
      } catch (error) {
        // Continue
      }
    }

    console.log(`⚠️ Could not extract ${fieldName}`);
    return {};
  }

  async extractProductData(page: Page): Promise<ProductData> {
    console.log('🔍 Starting intelligent extraction...');
    
    // Get page text for regex operations
    this.pageText = await page.textContent('body') || '';
    
    const productData: ProductData = {
      crawled_timestamp: new Date().toISOString(),
      url: page.url(),
      selectors: {}
    };

    // Extract all fields defined in schema
    const extractionPromises: Promise<void>[] = [];
    
    for (const [fieldName, fieldConfig] of Object.entries(this.config.scraper_config.schema)) {
      extractionPromises.push(
        this.extractField(page, fieldName, fieldConfig).then(result => {
          if (result.value !== undefined && result.value !== null) {
            productData[fieldName] = result.value;
            if (result.selectorUsed) {
              productData.selectors[fieldName] = result.selectorUsed;
            }
          }
        })
      );
    }

    // Wait for all extractions to complete
    await Promise.all(extractionPromises);

    return productData;
  }

  async runExtraction(urlOverride?: string): Promise<void> {
    const targetUrl = urlOverride || this.config.scraper_config.website_url;
    let browser: Browser | null = null;
    
    try {
      console.log('🚀 Starting intelligent product extraction...');
      console.log(`🎯 Target: ${targetUrl}`);
      console.log(`📋 Schema: ${this.config.scraper_config.name}`);
      console.log(`📊 Fields to extract: ${Object.keys(this.config.scraper_config.schema).join(', ')}`);
      
      // Launch browser
      browser = await chromium.launch({ 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      const page = await context.newPage();
      page.setDefaultTimeout(30000);
      
      // Navigate to product page
      console.log(`📄 Navigating to: ${targetUrl}`);
      await page.goto(targetUrl, { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });
      
      console.log('✅ Page loaded, waiting for content...');
      await page.waitForTimeout(3000);
      
      // Extract product data
      const productData = await this.extractProductData(page);
      
      // Display results
      console.log('\n🎉 EXTRACTION RESULTS:');
      console.log('=====================');
      
      for (const [field, value] of Object.entries(productData)) {
        if (field !== 'selectors' && field !== 'url') {
          console.log(`${this.getFieldIcon(field)} ${field}: ${value || 'Not found'}`);
        }
      }
      
      console.log('\n🔧 SELECTORS USED:');
      console.log('==================');
      Object.entries(productData.selectors).forEach(([field, selector]) => {
        console.log(`${field}: ${selector.method} - ${selector.selector}${selector.description ? ` (${selector.description})` : ''}`);
      });
      
      // Save data to JSON file
      const resultsPath = path.join(__dirname, 'product-data.json');
      fs.writeFileSync(resultsPath, JSON.stringify(productData, null, 2));
      console.log(`\n💾 Data saved to: ${resultsPath}`);
      
      console.log('\n✅ Extraction completed successfully!');
      
    } catch (error) {
      console.error('❌ Extraction failed:', (error as Error).message);
    } finally {
      if (browser) {
        await browser.close();
        console.log('\n🧹 Browser closed');
      }
    }
  }

  private getFieldIcon(field: string): string {
    const icons: { [key: string]: string } = {
      'name': '📝',
      'customer_price_lc': '💰',
      'base_price_lc': '💸',
      'discount_percentage': '🏷️',
      'sku': '🔢',
      'brand': '🏪',
      'availability': '📦',
      'image_url': '🖼️',
      'category': '📂',
      'crawled_timestamp': '⏰'
    };
    return icons[field] || '📌';
  }
}

// Usage
const extractor = new IntelligentExtractor();
const targetUrl = process.argv[2]; // Optional URL override
extractor.runExtraction(targetUrl); 