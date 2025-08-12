import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import auto-playwright from the compiled dist
const { auto } = require('auto-playwright/dist/index.js');

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
  extraction_method: string;
}

class RealAutoPlaywrightExtractor {
  private config: Config;

  constructor(configPath: string = './config.json') {
    const configFile = fs.readFileSync(configPath, 'utf8');
    this.config = JSON.parse(configFile);
  }

  private async extractWithAI(page: Page, fieldName: string, fieldConfig: SchemaField): Promise<any> {
    console.log(`🤖 OpenAI extraction for ${fieldName}: ${fieldConfig.description}`);

    try {
      // Create a specific instruction for the AI based on the field
      const instruction = this.createFieldInstruction(fieldName, fieldConfig);
      
      console.log(`📝 AI Instruction: ${instruction}`);
      
      // Use auto-playwright with correct syntax: auto(instruction, { page })
      const result = await auto(instruction, { page });
      
      if (result) {
        console.log(`✅ OpenAI found ${fieldName}: "${result}"`);
        return this.processValue(result, fieldConfig.type, fieldName);
      } else {
        console.log(`⚠️ OpenAI could not find ${fieldName}`);
        return null;
      }

    } catch (error) {
      console.log(`❌ OpenAI extraction failed for ${fieldName}:`, (error as Error).message);
      return null;
    }
  }

  private createFieldInstruction(fieldName: string, fieldConfig: SchemaField): string {
    const baseInstructions = {
      'name': 'Find and extract the product name or title from this page',
      'customer_price_lc': 'Find and extract the current selling price of the product (the price customers pay now)',
      'base_price_lc': 'Find and extract the original price or regular price of the product (before any discounts)',
      'discount_percentage': 'Find and extract the discount percentage if there is a sale or promotion',
      'brand': 'Find and extract the brand name or manufacturer of the product',
      'sku': 'Find and extract the product SKU, product code, or item number',
      'availability': 'Check if the product is available for purchase (in stock)',
      'image_url': 'Find the main product image and extract its URL',
      'category': 'Find and extract the product category or breadcrumb information'
    };

    const specificInstruction = baseInstructions[fieldName as keyof typeof baseInstructions];
    
    if (specificInstruction) {
      return `${specificInstruction}. Expected data type: ${fieldConfig.type}. ${fieldConfig.description}`;
    } else {
      return `Find and extract the ${fieldName} from this page. ${fieldConfig.description}. Expected data type: ${fieldConfig.type}`;
    }
  }

  private processValue(value: any, fieldType: string, fieldName: string): any {
    if (!value) return null;

    console.log(`🔄 Processing ${fieldName}: "${value}" → ${fieldType}`);

    switch (fieldType) {
      case 'str':
        return String(value).trim();
      
      case 'float':
        if (typeof value === 'number') return value;
        
        // Extract numeric value from strings
        const cleanValue = String(value).replace(/[^\d.,]/g, '').replace(',', '.');
        const num = parseFloat(cleanValue);
        return isNaN(num) ? null : num;
      
      case 'boolean':
        if (typeof value === 'boolean') return value;
        
        const lowerValue = String(value).toLowerCase();
        return lowerValue.includes('available') || 
               lowerValue.includes('in stock') || 
               lowerValue.includes('yes') ||
               lowerValue.includes('true') ||
               lowerValue.includes('skladem') ||
               lowerValue.includes('disponible');
      
      case 'timestamp':
        return new Date().toISOString();
      
      default:
        return value;
    }
  }

  async extractData(urlOverride?: string): Promise<ExtractedData> {
    const targetUrl = urlOverride || this.config.scraper_config.website_url;
    
    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY environment variable is required!');
      console.log('📝 Please create a .env file with your OpenAI API key:');
      console.log('   OPENAI_API_KEY=your_api_key_here');
      process.exit(1);
    }

    console.log('🤖 Starting Real Auto-Playwright extraction with OpenAI...');
    console.log(`🎯 Target: ${targetUrl}`);
    console.log(`📋 Schema: ${this.config.scraper_config.name}`);
    console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY.substring(0, 8)}...`);

    const browser = await chromium.launch({ 
      headless: false,  // Keep visible to see AI interactions
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      const page = await context.newPage();
      page.setDefaultTimeout(60000); // Increase timeout for AI operations
      
      // Navigate to page
      console.log(`📄 Loading page...`);
      await page.goto(targetUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      await page.waitForTimeout(3000);
      console.log('✅ Page loaded, starting OpenAI extraction...');

      const extractedData: ExtractedData = {
        crawled_timestamp: new Date().toISOString(),
        url: targetUrl,
        extraction_method: 'OpenAI Auto-Playwright'
      };

      // Extract each field using OpenAI
      for (const [fieldName, fieldConfig] of Object.entries(this.config.scraper_config.schema)) {
        if (fieldName === 'crawled_timestamp') continue; // Skip auto-generated field
        
        const result = await this.extractWithAI(page, fieldName, fieldConfig);
        if (result !== null) {
          extractedData[fieldName] = result;
        }
      }

      // Display results
      console.log('\n🎉 OPENAI EXTRACTION RESULTS:');
      console.log('=============================');
      
      for (const [field, value] of Object.entries(extractedData)) {
        if (field !== 'crawled_timestamp' && field !== 'url' && field !== 'extraction_method') {
          const emoji = this.getFieldEmoji(field);
          console.log(`${emoji} ${field}: ${value || 'Not found'}`);
        }
      }

      // Save data
      const outputPath = path.join(__dirname, 'openai-extracted-data.json');
      fs.writeFileSync(outputPath, JSON.stringify(extractedData, null, 2));
      console.log(`\n💾 Data saved to: ${outputPath}`);
      
      console.log('\n✅ OpenAI Auto-Playwright extraction completed!');
      
      return extractedData;

    } catch (error) {
      console.error('❌ OpenAI extraction failed:', (error as Error).message);
      
      if ((error as Error).message.includes('API key')) {
        console.log('\n🔑 OpenAI API Key Issue:');
        console.log('1. Make sure you have a valid OpenAI API key');
        console.log('2. Create a .env file in the project root');
        console.log('3. Add: OPENAI_API_KEY=your_api_key_here');
      }
      
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
}

// Usage
const extractor = new RealAutoPlaywrightExtractor();
const url = process.argv[2];
extractor.extractData(url); 