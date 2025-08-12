"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const playwright_1 = require("playwright");
const dotenv = __importStar(require("dotenv"));
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
    const browser = await playwright_1.chromium.launch({ headless: false });
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
    }
    catch (error) {
        console.error('❌ Error during auto-playwright execution:', error);
    }
    finally {
        await browser.close();
        console.log('🧹 Browser closed');
    }
})();
