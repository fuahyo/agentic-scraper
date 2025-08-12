// Auto-generated extractor based on selector inspection
import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';

interface ProductData {
  [key: string]: any;
  crawled_timestamp: string;
  url: string;
}

class GeneratedExtractor {
  async extract(url?: string): Promise<ProductData> {
    const targetUrl = url || "https://www.jumbo.cl/aceite-de-oliva-la-espanola-200-ml-extra-virgen-spray/p";
    
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
      
      // Extract name
      try {
        const nameElement = await page.locator('.product-name').first();
        if (await nameElement.count() > 0) {
          data.name = await nameElement.textContent();
          console.log('✅ name:', data.name);
        } else {
          console.log('⚠️ Could not find name');
        }
      } catch (error) {
        console.log('❌ Error extracting name:', error);
      }      
      // Extract customer_price_lc
      try {
        const customer_price_lcElement = await page.locator('.flex').first();
        if (await customer_price_lcElement.count() > 0) {
          data.customer_price_lc = await customer_price_lcElement.textContent();
          console.log('✅ customer_price_lc:', data.customer_price_lc);
        } else {
          console.log('⚠️ Could not find customer_price_lc');
        }
      } catch (error) {
        console.log('❌ Error extracting customer_price_lc:', error);
      }      
      // Extract base_price_lc
      try {
        const base_price_lcElement = await page.locator('.text-3xl').first();
        if (await base_price_lcElement.count() > 0) {
          data.base_price_lc = await base_price_lcElement.textContent();
          console.log('✅ base_price_lc:', data.base_price_lc);
        } else {
          console.log('⚠️ Could not find base_price_lc');
        }
      } catch (error) {
        console.log('❌ Error extracting base_price_lc:', error);
      }      
      // Extract discount_percentage
      try {
        const discount_percentageElement = await page.locator('.text-sm.rounded-full.bg-grey.px-3.font-normal.text-black.mb-4').first();
        if (await discount_percentageElement.count() > 0) {
          data.discount_percentage = await discount_percentageElement.textContent();
          console.log('✅ discount_percentage:', data.discount_percentage);
        } else {
          console.log('⚠️ Could not find discount_percentage');
        }
      } catch (error) {
        console.log('❌ Error extracting discount_percentage:', error);
      }      
      // Extract availability
      try {
        const availabilityElement = await page.locator('.mr-auto').first();
        if (await availabilityElement.count() > 0) {
          data.availability = await availabilityElement.textContent();
          console.log('✅ availability:', data.availability);
        } else {
          console.log('⚠️ Could not find availability');
        }
      } catch (error) {
        console.log('❌ Error extracting availability:', error);
      }      
      // Extract image_url
      try {
        const image_urlElement = await page.locator('img').first();
        if (await image_urlElement.count() > 0) {
          data.image_url = await image_urlElement.textContent();
          console.log('✅ image_url:', data.image_url);
        } else {
          console.log('⚠️ Could not find image_url');
        }
      } catch (error) {
        console.log('❌ Error extracting image_url:', error);
      }      
      // Extract brand
      try {
        const brandElement = await page.locator('.product-brand').first();
        if (await brandElement.count() > 0) {
          data.brand = await brandElement.textContent();
          console.log('✅ brand:', data.brand);
        } else {
          console.log('⚠️ Could not find brand');
        }
      } catch (error) {
        console.log('❌ Error extracting brand:', error);
      }      
      // Extract sku
      try {
        const skuElement = await page.locator('.product-code').first();
        if (await skuElement.count() > 0) {
          data.sku = await skuElement.textContent();
          console.log('✅ sku:', data.sku);
        } else {
          console.log('⚠️ Could not find sku');
        }
      } catch (error) {
        console.log('❌ Error extracting sku:', error);
      }      
      // Extract category
      try {
        const categoryElement = await page.locator('a').first();
        if (await categoryElement.count() > 0) {
          data.category = await categoryElement.textContent();
          console.log('✅ category:', data.category);
        } else {
          console.log('⚠️ Could not find category');
        }
      } catch (error) {
        console.log('❌ Error extracting category:', error);
      }
      
      // Save results
      fs.writeFileSync('extracted-data.json', JSON.stringify(data, null, 2));
      console.log('\n💾 Data saved to extracted-data.json');
      
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
