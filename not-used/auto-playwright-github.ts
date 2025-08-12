import { test, expect } from "@playwright/test";
import { chromium } from "playwright";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Use the compiled JS export
const { auto } = require("auto-playwright/dist/index.js");

// Playwright test example (commented out - requires @playwright/test runner)
// test("auto Playwright example", async ({ page }) => {
//   await page.goto("https://www.rohlik.cz/1462815-grikios-syr-do-salatu");

//   // `auto` can query data
//   const headerText = await auto("get the header text", { page, test });

//   // `auto` can perform actions
//   await auto(`Type "${headerText}" in the search box`, { page, test });

//   // `auto` can assert the state of the website
//   const searchInputHasHeaderText = await auto(
//     `Is the contents of the search box equal to "${headerText}"?`,
//     { page, test },
//   );

//   expect(searchInputHasHeaderText).toBe(true);
// });

// Standalone implementation
(async () => {
  // Check for OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable is required!');
    console.log('📝 Please create a .env file with your OpenAI API key:');
    console.log('   OPENAI_API_KEY=sk-your-key-here');
    process.exit(1);
  }

  console.log('🤖 Starting auto-playwright example...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to a website
    console.log('📄 Loading page...');
    await page.goto("https://www.rohlik.cz/1462815-grikios-syr-do-salatu");
    await page.waitForTimeout(3000);

    console.log('🔍 Querying product name...');
    // `auto` can query data - get product name
    const productName = await auto("What is the product name or title?", { page });
    console.log('✅ Product name:', productName);

    console.log('🔍 Querying product price...');
    // Query product price
    const productPrice = await auto("What is the current price of this product?", { page });
    console.log('✅ Product price:', productPrice);

    console.log('🔍 Querying brand...');
    // Query brand
    const productBrand = await auto("What is the brand of this product?", { page });
    console.log('✅ Product brand:', productBrand);

    console.log('🔍 Checking availability...');
    // Check if product is available
    const isAvailable = await auto("Is this product available for purchase or in stock?", { page });
    console.log('✅ Product availability:', isAvailable);

    console.log('\n🎉 Auto-Playwright extraction completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during auto-playwright execution:', error);
  } finally {
    await browser.close();
    console.log('🧹 Browser closed');
  }
})();