# Product Extractor

A powerful, intelligent web scraping tool for extracting product information from international e-commerce websites using Playwright. Uses **schema-driven extraction** - you only define what data you want, not how to extract it.

## 🎯 What It Does

Automatically extracts product data by intelligently determining the best selectors:
- ✅ Product Name/Title  
- ✅ Prices (Current & Original, any currency)
- ✅ Discount Percentage
- ✅ Product SKU/Code  
- ✅ Brand Name
- ✅ Availability Status
- ✅ Product Images
- ✅ Categories  
- ✅ **Automatic Selector Detection** - Shows which CSS/HTML/Regex patterns were used

## 🧠 Intelligence Features

- **Smart Selector Generation**: Automatically determines CSS selectors, HTML attributes, and regex patterns based on field names
- **Multi-Currency Support**: Automatically detects $, €, £, Kč, and other currencies  
- **Type Conversion**: Automatically converts extracted values to correct data types (string, float, boolean, timestamp)
- **Price Intelligence**: Sorts multiple prices to find current vs original pricing
- **Fallback Methods**: Uses multiple extraction strategies if primary methods fail

## 🚀 Quick Start

### Installation
```bash
npm install
npx playwright install chromium
```

### Simple Usage
```bash
# Extract using config.json
npm run extract

# Extract from custom URL
npm run extract:url "https://example.com/product-page"
```

## ⚙️ Configuration

**The magic is in the simplicity** - you only define WHAT to extract, not HOW:

### config.json Structure
```json
{
  "scraper_config": {
    "name": "My_Product_Scraper",
    "website_url": "https://example.com/product/123",
    "schema": {
      "name": {
        "type": "str", 
        "description": "Product name"
      },
      "customer_price_lc": {
        "type": "float",
        "description": "current price in local currency"
      },
      "discount_percentage": {
        "type": "float", 
        "description": "discount percentage of the product"
      }
    }
  }
}
```

### Available Field Types
| Type | Description | Auto-Conversion |
|------|-------------|-----------------|
| `str` | Text/String | Trimmed text |
| `float` | Numbers/Prices | Cleaned numeric values |
| `boolean` | True/False | Smart detection from text |
| `timestamp` | Date/Time | Auto-generated crawl time |

### Smart Field Recognition

The extractor automatically recognizes common e-commerce fields:

| Field Name | Auto-Generated Selectors |
|------------|-------------------------|
| `name` | `h1`, `.product-title`, `.product-name` |
| `customer_price_lc` | `.price`, `.current-price`, price regex patterns |
| `base_price_lc` | `.original-price`, `.was-price` |
| `brand` | `[class*="brand"]`, `.manufacturer` |
| `sku` | `.product-code`, URL patterns, "Código:" text |
| `discount_percentage` | `.discount`, percentage regex (`35% dcto`) |
| `availability` | `.stock`, "In Stock"/"Available" text |
| `image_url` | Product image `src` attributes |
| `category` | `.breadcrumb`, `.category` |

## 🌍 Multi-Language & Currency Support

Works automatically with:
- **Languages**: English, Spanish, Czech, and more
- **Currencies**: USD ($), Euro (€), British Pound (£), Czech Koruna (Kč)
- **Formats**: Handles comma/period decimal separators
- **Discount Patterns**: "35% off", "35% dcto", "35% sleva"

## 📊 Output Example

```json
{
  "name": "Papel Higiénico Elite Doble Hoja Ultra Suave 50 m 18 un.",
  "customer_price_lc": 15.919,
  "base_price_lc": 24.4901,
  "discount_percentage": 35,
  "brand": "Elite", 
  "sku": "Código: 1236587",
  "crawled_timestamp": "2025-01-17T17:59:53.890Z",
  "url": "https://www.jumbo.cl/...",
  "selectors": {
    "name": { "method": "CSS", "selector": "h1" },
    "customer_price_lc": { 
      "method": "Regex Pattern", 
      "selector": "(\\$[\\d,]+\\.?\\d*)",
      "description": "USD prices"
    },
    "brand": { "method": "CSS", "selector": "[class*=\"brand\"]" },
    "sku": { "method": "CSS", "selector": ".product-code" }
  }
}
```

## 🎨 Customization Examples

### Basic Product Schema
```json
{
  "scraper_config": {
    "name": "Basic_Product_Extractor",
    "website_url": "https://store.example.com/product/123",
    "schema": {
      "name": { "type": "str", "description": "Product title" },
      "customer_price_lc": { "type": "float", "description": "Current price" },
      "brand": { "type": "str", "description": "Brand name" }
    }
  }
}
```

### Advanced E-commerce Schema  
```json
{
  "scraper_config": {
    "name": "Advanced_Ecommerce_Extractor", 
    "website_url": "https://shop.example.com/item/456",
    "schema": {
      "name": { "type": "str", "description": "Product name" },
      "customer_price_lc": { "type": "float", "description": "Sale price" },
      "base_price_lc": { "type": "float", "description": "Original price" },
      "discount_percentage": { "type": "float", "description": "Discount %" },
      "availability": { "type": "boolean", "description": "In stock status" },
      "rating": { "type": "float", "description": "Customer rating" },
      "reviews_count": { "type": "str", "description": "Number of reviews" },
      "brand": { "type": "str", "description": "Brand name" },
      "sku": { "type": "str", "description": "Product code" },
      "image_url": { "type": "str", "description": "Main product image" },
      "category": { "type": "str", "description": "Product category" },
      "description": { "type": "str", "description": "Product description" }
    }
  }
}
```

## 📋 Ready-to-Use Examples

See `config-examples.json` for working configurations:

### Copy & Use Jumbo Chile Config
```bash
# Copy example to main config
cp config-examples.json temp.json
cat temp.json | jq '.jumbo_chile' > config.json
npm run extract
```

### Copy & Use Czech Tesco Config  
```bash
cat config-examples.json | jq '.czech_tesco' > config.json
npm run extract
```

## 🧪 Testing Different Sites

```bash
# Test Chilean e-commerce
npm run extract:url "https://www.jumbo.cl/some-product/p"

# Test Czech e-commerce  
npm run extract:url "https://nakup.itesco.cz/groceries/cs-CZ/products/123456"

# Test Argentinian e-commerce
npm run extract:url "https://www.disco.com.ar/some-product/p"

# Test any other site
npm run extract:url "https://your-ecommerce-site.com/product"
```

## 🔧 Advanced Features

### Intelligent Price Processing
- Automatically finds lowest price as `customer_price_lc`
- Finds highest valid price as `base_price_lc`  
- Validates price relationships (base > customer)
- Filters unrealistic prices

### Smart SKU Detection
- Extracts from URL patterns (`/products/123456`)
- Finds text patterns ("Código: 123456", "SKU: ABC123")
- Uses CSS selectors (`.product-code`, `[data-sku]`)

### Robust Extraction
- Multiple selector strategies per field
- Graceful fallbacks when primary methods fail
- Type validation and conversion
- Multi-language pattern recognition

## 🐛 Troubleshooting

### No Data Extracted
1. Check console output - shows which selectors were tried
2. Review `selectors` object in output JSON
3. Browser opens in non-headless mode - inspect the page manually
4. Try a different URL or check if site blocks automation

### Wrong Prices/Values
1. The extractor shows which patterns matched in console
2. Check if currency symbols are recognized  
3. Look at `selectors` output to see extraction methods used
4. Prices are automatically filtered (range: 0-100,000)

### Field-Specific Issues
- **Brand**: Tries CSS selectors first, falls back to first word of title
- **SKU**: Tries CSS, then URL patterns, then text patterns  
- **Images**: Looks for `src` and `data-src` attributes on product images
- **Availability**: Searches for "In Stock", "Available", "Disponible" text

## 📁 Project Files

- **`config.json`** - Main configuration (define your schema here)
- **`dynamic-extractor.ts`** - Intelligent extraction engine  
- **`config-examples.json`** - Ready-to-use configurations
- **`product-data.json`** - Output file (created after extraction)
- **`package.json`** - Dependencies and run scripts

## ⚖️ Legal Notice

This tool is for educational and research purposes. Always:
- ✅ Respect website terms of service
- ✅ Check robots.txt files  
- ✅ Implement appropriate delays
- ✅ Don't overload servers
- ✅ Respect rate limits

## 📄 License

MIT License - Use and modify as needed. 