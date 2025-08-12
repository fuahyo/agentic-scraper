// Auto-generated extractor using AI-discovered selectors
import { chromium } from 'playwright';
import * as fs from 'fs';

class AIOptimizedExtractor {
  async extract(url?: string) {
    const targetUrl = url || "https://plazalama.com.do/p/agua-purificada-dasani-591ml-49000409772";
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

      // Extract name using AI-found selector: h1
      try {
        const element = await page.locator('h1').first();
        if (await element.count() > 0) {
          data.name = await element.textContent();
        }
      } catch (error) {
        console.log('Error extracting name:', error);
      }
      // Extract customer_price_lc using AI-found selector: [class*="price"]
      try {
        const element = await page.locator('[class*="price"]').first();
        if (await element.count() > 0) {
          data.customer_price_lc = await element.textContent();
        }
      } catch (error) {
        console.log('Error extracting customer_price_lc:', error);
      }
      // Extract base_price_lc using AI-found selector: span
      try {
        const element = await page.locator('span').first();
        if (await element.count() > 0) {
          data.base_price_lc = await element.textContent();
        }
      } catch (error) {
        console.log('Error extracting base_price_lc:', error);
      }
      // Extract sku using AI-found selector: [class*="id"]
      try {
        const element = await page.locator('[class*="id"]').first();
        if (await element.count() > 0) {
          data.sku = await element.textContent();
        }
      } catch (error) {
        console.log('Error extracting sku:', error);
      }
      // Extract category using AI-found selector: [class*="category"]
      try {
        const element = await page.locator('[class*="category"]').first();
        if (await element.count() > 0) {
          data.category = await element.textContent();
        }
      } catch (error) {
        console.log('Error extracting category:', error);
      }
      
      fs.writeFileSync('optimized-extraction.json', JSON.stringify(data, null, 2));
      console.log('✅ Optimized extraction complete');
      return data;
      
    } finally {
      await browser.close();
    }
  }
}

const extractor = new AIOptimizedExtractor();
extractor.extract();