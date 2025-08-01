# Agentic Scraper - AI-Powered Selector Finder

An intelligent AI system that automatically finds the best CSS selectors for extracting specific information from web pages.

## Features

- 🤖 **AI-Powered Analysis**: Uses GPT-4 to intelligently analyze web pages and find optimal selectors.
- 🎯 **Smart Selector Generation**: Combines traditional methods with AI reasoning.
- 🔍 **Multi-Field Support**: Accurately extracts selectors for multiple data points simultaneously (e.g., product name, price, and brand).
- 📊 **Confidence Scoring**: Provides confidence levels for each selector.
- 🎨 **Web Interface**: Beautiful, user-friendly web UI.
- 🚀 **REST API**: Programmatic access to the selector finding service.

## Quick Start

### Prerequisites

- Node.js 16+ 
- OpenAI API key
- Playwright dependencies (Chromium)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd agentic-scraper
```

2. Install dependencies:
```bash
npm install
npx playwright install chromium
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env and add your OpenAI API key
```

4. Start the server:
```bash
npm start
```

5. Open your browser and visit: `http://localhost:3000`

## Usage

### Web Interface

1. Enter the URL of the webpage you want to analyze.
2. Describe the information you're looking for. For multiple fields, separate them with a comma (e.g., "product price, article title, contact email").
3. Click "Find Selectors" and wait for the AI analysis.
4. Review the suggested selectors with confidence scores.

### API Usage

```javascript
const response = await fetch('http://localhost:3000/api/find-selectors', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://example.com',
    targetInfo: 'product price, product title', // Multiple fields separated by comma
    options: {
      waitForSelector: '.dynamic-content' // Optional
    }
  })
});

const result = await response.json();
console.log(result.selectors); 
// Example result.selectors for "product price, product title":
// {
//   "product price": {
//     "primary": { "selector": ".price-value", "confidence": 0.95, ... },
//     "alternatives": [...]
//   },
//   "product title": {
//     "primary": { "selector": "h1.product-name", "confidence": 0.92, ... },
//     "alternatives": [...]
//   }
// }

```

## How It Works

### 1. Web Page Analysis (Powered by Playwright)
- Uses Playwright to load and render the webpage in a real browser environment, enabling robust dynamic content handling.
- Extracts comprehensive DOM structure, including visibility, bounding boxes, and interactive elements.
- Analyzes content areas, forms, tables, images, links, buttons, and price-specific elements.

### 2. Traditional Selector Generation
- Generates initial selectors based on common patterns (class names, IDs, attributes).
- Uses keyword matching to find relevant elements.
- Creates path-based selectors for complex structures.

### 3. AI-Powered Analysis
- Sends detailed page analysis to GPT-4 for intelligent selector evaluation.
- Considers specificity, reliability, and resistance to changes in the DOM structure.
- Provides detailed reasoning for selector choices.

### 4. Validation & Ranking
- Tests all generated selectors against the actual DOM (via Playwright) for accuracy and presence.
- Validates element counts and extracts sample content for user verification.
- Ranks selectors by confidence and reliability.

## Example Use Cases

### E-commerce Scraping
- **URL**: `https://amazon.com/product-page`
- **Target**: "product price, product title, product images"
- **Result**: High-confidence selectors for price elements, title headings, and image containers, each identified separately.

### News Article Extraction
- **URL**: `https://news-website.com/article`
- **Target**: "article title, article content, publication date"
- **Result**: Selectors for article headers, main content areas, and date/time elements, presented individually.

### Contact Information
- **URL**: `https://contact-page.com`
- **Target**: "email addresses, phone numbers, contact forms"
- **Result**: Selectors for email links, phone number spans, and form elements, provided for each requested field.

## API Reference

### POST /api/find-selectors

**Request Body:**
```json
{
  "url": "https://example.com",
  "targetInfo": "description of what to find (e.g., 'product price, product title')",
  "options": {
    "waitForSelector": ".dynamic-content" // Optional: Playwright selector to wait for before analysis
  }
}
```

**Response:**
```json
{
  "success": true,
  "url": "https://example.com",
  "targetInfo": "product price, product title",
  "selectors": {
    "product price": {
      "primary": {
        "selector": ".price-value",
        "confidence": 0.95,
        "reasoning": "Found price keyword in class name",
        "elementCount": 1,
        "sampleText": "$29.99"
      },
      "alternatives": [
        { "selector": ".item-price", "confidence": 0.85, "reasoning": "Alternative price class", "elementCount": 1, "sampleText": "$30.00" }
      ],
      "confidence": 0.95, // Overall confidence for this field
      "reasoning": "Overall reasoning for product price selectors"
    },
    "product title": {
      "primary": {
        "selector": "h1.product-name",
        "confidence": 0.92,
        "reasoning": "Identified as main heading with product name class",
        "elementCount": 1,
        "sampleText": "Awesome Product"
      },
      "alternatives": [
        { "selector": "[data-test='product-title']", "confidence": 0.88, "reasoning": "Data attribute for product title", "elementCount": 1, "sampleText": "Awesome Product Pro" }
      ],
      "confidence": 0.92, // Overall confidence for this field
      "reasoning": "Overall reasoning for product title selectors"
    }
  },
  "analysis": {
    "title": "Page Title",
    "contentAreas": 5,
    "forms": 1,
    "tables": 0,
    "images": 10,
    "links": 25,
    "buttons": 8,
    "priceElements": 2,
    "interactiveElements": 15
  },
  "metadata": {
    "timestamp": "2023-10-27T10:00:00.000Z",
    "processingTime": 1500,
    "totalSelectorsFound": 4 // Sum of primary + alternatives across all fields
  },
  "suggestions": [
    "Check alternative selectors if the primary one fails",
    "Use multiple selectors for robust scraping"
  ]
}
```

### GET /api/health

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-10-27T10:00:00.000Z",
  "version": "2.0.0",
  "features": ["playwright", "ai-analysis", "enhanced-selectors", "multi-field"]
}
```

## Configuration

### Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `PORT`: Server port (default: 3000)
- `PUPPETEER_HEADLESS`: Run browser in headless mode (default: true) - *Note: This project now primarily uses Playwright, which also supports headless mode.*
- `PUPPETEER_TIMEOUT`: Page load timeout in milliseconds (default: 30000) - *Note: Playwright's timeout is configured in `src/core/PlaywrightAnalyzer.js`.*

### Advanced Options

When making API requests, you can include additional options in the `options` object:

- `waitForSelector`: A CSS selector that Playwright will wait for before proceeding with analysis. Useful for pages with dynamic content.
- Custom user agents, viewport settings, and more can be configured directly in `src/core/PlaywrightAnalyzer.js`.

## Architecture

```
src/
├── agents/
│   └── SelectorAgent.js      # AI-powered selector analysis and multi-field handling
├── core/
│   ├── PlaywrightAnalyzer.js # Web page analysis engine using Playwright
│   └── WebAnalyzer.js        # (Deprecated: Replaced by PlaywrightAnalyzer for core web analysis)
├── utils/
│   └── SelectorGenerator.js  # Traditional selector generation
├── index.js                  # Express server and API endpoints
└── public/
    └── index.html           # Web interface
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue on GitHub
- Check the documentation
- Review example use cases

---

**Note**: This tool is designed for legitimate web scraping purposes. Always respect robots.txt files and website terms of service.
