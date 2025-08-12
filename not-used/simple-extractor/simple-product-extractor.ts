import { chromium } from "playwright";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface ProductInfo {
  name?: string;
  price?: string;
  brand?: string;
  availability?: string;
  description?: string;
  image?: string;
  url: string;
  extractedAt: string;
}

async function extractProductInfo(url: string): Promise<ProductInfo> {
  console.log('🤖 Starting product information extraction...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const productInfo: ProductInfo = {
    url: url,
    extractedAt: new Date().toISOString()
  };

  try {
    console.log('📄 Loading page...');
    await page.goto(url);
    await page.waitForTimeout(3000);

    console.log('🔍 Extracting product information...');

    // Extract product name - try multiple selectors
    console.log('  📝 Looking for product name...');
    try {
      const nameSelectors = [
        'h1',
        'h2',
        '[data-test*="title"]',
        '.product-title',
        '.product-name',
        '[class*="title"]',
        '[class*="name"]'
      ];

      for (const selector of nameSelectors) {
        try {
          const element = await page.locator(selector).first();
          if (await element.count() > 0) {
            const text = await element.textContent();
            if (text && text.trim().length > 0) {
              productInfo.name = text.trim();
              console.log(`    ✅ Found name using ${selector}: ${productInfo.name}`);
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }
    } catch (e) {
      console.log('    ⚠️ Could not extract product name');
    }

    // Extract price - try multiple selectors
    console.log('  💰 Looking for price...');
    try {
      const priceSelectors = [
        '[class*="price"]',
        '[data-price]',
        '.price',
        '.current-price',
        '.sale-price',
        'span:has-text("Kč")',
        'span:has-text("€")',
        'span:has-text("$")'
      ];

      for (const selector of priceSelectors) {
        try {
          const elements = await page.locator(selector).all();
          for (const element of elements) {
            const text = await element.textContent();
            if (text && (text.includes('Kč') || text.includes('€') || text.includes('$') || /\d+[.,]\d+/.test(text))) {
              productInfo.price = text.trim();
              console.log(`    ✅ Found price using ${selector}: ${productInfo.price}`);
              break;
            }
          }
          if (productInfo.price) break;
        } catch (e) {
          continue;
        }
      }

      // Fallback: scan all text for price patterns
      if (!productInfo.price) {
        const allText = await page.textContent('body');
        const priceMatches = allText?.match(/\d+[.,]\d+\s*Kč|\d+\s*Kč|€\s*\d+[.,]?\d*|\$\s*\d+[.,]?\d*/g);
        if (priceMatches && priceMatches.length > 0) {
          productInfo.price = priceMatches[0];
          console.log(`    ✅ Found price via text scanning: ${productInfo.price}`);
        }
      }
    } catch (e) {
      console.log('    ⚠️ Could not extract price');
    }

    // Extract brand
    console.log('  🏪 Looking for brand...');
    try {
      const brandSelectors = [
        '[class*="brand"]',
        '[data-brand]',
        '.brand',
        '.manufacturer',
        '[class*="manufacturer"]'
      ];

      for (const selector of brandSelectors) {
        try {
          const element = await page.locator(selector).first();
          if (await element.count() > 0) {
            const text = await element.textContent();
            if (text && text.trim().length > 0) {
              productInfo.brand = text.trim();
              console.log(`    ✅ Found brand using ${selector}: ${productInfo.brand}`);
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }

      // Try to extract brand from title
      if (!productInfo.brand && productInfo.name) {
        const nameParts = productInfo.name.split(' ');
        if (nameParts.length > 1) {
          productInfo.brand = nameParts[0];
          console.log(`    ✅ Extracted brand from title: ${productInfo.brand}`);
        }
      }
    } catch (e) {
      console.log('    ⚠️ Could not extract brand');
    }

    // Extract availability
    console.log('  📦 Looking for availability...');
    try {
      const availabilitySelectors = [
        '[class*="stock"]',
        '[class*="availability"]',
        '[data-availability]',
        '.in-stock',
        '.out-of-stock'
      ];

      for (const selector of availabilitySelectors) {
        try {
          const element = await page.locator(selector).first();
          if (await element.count() > 0) {
            const text = await element.textContent();
            if (text && text.trim().length > 0) {
              productInfo.availability = text.trim();
              console.log(`    ✅ Found availability using ${selector}: ${productInfo.availability}`);
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }

      // Fallback: search for availability keywords in page text
      if (!productInfo.availability) {
        const pageText = await page.textContent('body');
        if (pageText?.toLowerCase().includes('skladem') || pageText?.toLowerCase().includes('in stock')) {
          productInfo.availability = 'In Stock';
          console.log('    ✅ Found availability via text scanning: In Stock');
        } else if (pageText?.toLowerCase().includes('není skladem') || pageText?.toLowerCase().includes('out of stock')) {
          productInfo.availability = 'Out of Stock';
          console.log('    ✅ Found availability via text scanning: Out of Stock');
        }
      }
    } catch (e) {
      console.log('    ⚠️ Could not extract availability');
    }

    // Extract product image
    console.log('  🖼️ Looking for product image...');
    try {
      const imageSelectors = [
        '.product-image img',
        '.main-image img',
        '[class*="product"] img',
        'img[alt*="product"]',
        'img[src*="product"]',
        'img:first-of-type'
      ];

      for (const selector of imageSelectors) {
        try {
          const element = await page.locator(selector).first();
          if (await element.count() > 0) {
            const src = await element.getAttribute('src');
            if (src) {
              productInfo.image = src.startsWith('http') ? src : new URL(src, url).href;
              console.log(`    ✅ Found image using ${selector}: ${productInfo.image}`);
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }
    } catch (e) {
      console.log('    ⚠️ Could not extract product image');
    }

    // Extract description
    console.log('  📄 Looking for description...');
    try {
      const descSelectors = [
        '[class*="description"]',
        '[class*="detail"]',
        '.product-description',
        '.product-details',
        'p:has-text("produkt")',
        'div:has-text("popis")'
      ];

      for (const selector of descSelectors) {
        try {
          const element = await page.locator(selector).first();
          if (await element.count() > 0) {
            const text = await element.textContent();
            if (text && text.trim().length > 10) {
              productInfo.description = text.trim().substring(0, 200) + '...';
              console.log(`    ✅ Found description using ${selector}: ${productInfo.description.substring(0, 50)}...`);
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }
    } catch (e) {
      console.log('    ⚠️ Could not extract description');
    }

    console.log('\n🎉 PRODUCT EXTRACTION RESULTS:');
    console.log('================================');
    console.log(`📝 Name: ${productInfo.name || 'Not found'}`);
    console.log(`💰 Price: ${productInfo.price || 'Not found'}`);
    console.log(`🏪 Brand: ${productInfo.brand || 'Not found'}`);
    console.log(`📦 Availability: ${productInfo.availability || 'Not found'}`);
    console.log(`🖼️ Image: ${productInfo.image || 'Not found'}`);
    console.log(`📄 Description: ${productInfo.description || 'Not found'}`);
    console.log(`🔗 URL: ${productInfo.url}`);
    console.log(`⏰ Extracted at: ${productInfo.extractedAt}`);

  } catch (error) {
    console.error('❌ Error during extraction:', error);
  } finally {
    await browser.close();
    console.log('\n🧹 Browser closed');
  }

  return productInfo;
}

// Run the extraction
(async () => {
  const url = process.argv[2] || "https://www.rohlik.cz/1462815-grikios-syr-do-salatu";
  console.log(`🎯 Target: ${url}`);
  
  const productInfo = await extractProductInfo(url);
  
  // Save to JSON file
  const fs = require('fs');
  fs.writeFileSync('extracted-product-info.json', JSON.stringify(productInfo, null, 2));
  console.log('\n💾 Product information saved to: extracted-product-info.json');
})(); 