# Simple Product Extractor

A straightforward product information extractor using Playwright that automatically extracts product data from e-commerce websites.

## Features

- 🎯 **Automatic Detection**: Uses intelligent selectors to find product information
- 🌍 **Multi-language Support**: Works with Czech, English, and European currencies
- 📊 **Comprehensive Data**: Extracts name, price, brand, availability, image, and description
- 🚀 **Easy to Use**: Single command execution

## Installation

```bash
npm install
npx playwright install chromium
```

## Usage

### Basic Usage
```bash
npm run extract
```

### Custom URL
```bash
npm run extract:url "https://example.com/product"
```

### Direct Execution
```bash
npx ts-node simple-product-extractor.ts "https://example.com/product"
```

## Extracted Data

The extractor will find and extract:

- **Product Name**: Main product title
- **Price**: Current selling price with currency
- **Brand**: Product brand/manufacturer
- **Availability**: Stock status
- **Image**: Product image URL
- **Description**: Product description
- **URL**: Source URL
- **Extracted At**: Timestamp

## Output

Results are saved to `extracted-product-info.json`:

```json
{
  "name": "Grikios Sýr do salátu",
  "price": "44,90 Kč",
  "brand": "Grikios",
  "availability": "In Stock",
  "image": "https://example.com/image.jpg",
  "description": "Product description...",
  "url": "https://example.com/product",
  "extractedAt": "2024-01-15T10:30:00.000Z"
}
```

## How It Works

1. **Opens Browser**: Launches Chromium browser
2. **Loads Page**: Navigates to the product URL
3. **Smart Detection**: Uses multiple selector strategies:
   - Common CSS patterns (`.product-title`, `.price`)
   - Text pattern matching (currency symbols, numbers)
   - Fallback strategies for each field
4. **Extracts Data**: Captures all available product information
5. **Saves Results**: Outputs structured JSON data

## Supported Sites

Works with most e-commerce websites including:
- Rohlik.cz (Czech)
- Amazon
- eBay
- And many others

## Troubleshooting

- **Browser Issues**: Run `npx playwright install chromium`
- **No Data Found**: Try different product URLs
- **TypeScript Errors**: Ensure all dependencies are installed 