# Agentic Scraper - AI-Powered Selector Finder

An intelligent AI system that automatically finds the best CSS selectors for extracting specific information from web pages.

## Features

- 🤖 **AI-Powered Analysis**: Uses GPT-4 to intelligently analyze web pages and find optimal selectors
- 🎯 **Smart Selector Generation**: Combines traditional methods with AI reasoning
- 🔍 **Multiple Approaches**: Generates primary and alternative selectors
- 📊 **Confidence Scoring**: Provides confidence levels for each selector
- 🎨 **Web Interface**: Beautiful, user-friendly web UI
- 🚀 **REST API**: Programmatic access to the selector finding service

## Quick Start

### Prerequisites

- Node.js 16+ 
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd agentic-scraper
```

2. Install dependencies:
```bash
npm install
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

1. Enter the URL of the webpage you want to analyze
2. Describe the information you're looking for (e.g., "product price", "article title")
3. Click "Find Selectors" and wait for the AI analysis
4. Review the suggested selectors with confidence scores

### API Usage

```javascript
const response = await fetch('http://localhost:3000/api/find-selectors', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://example.com',
    targetInfo: 'product price',
    options: {
      waitForSelector: '.dynamic-content' // Optional
    }
  })
});

const result = await response.json();
console.log(result.selectors);
```

## How It Works

### 1. Web Page Analysis
- Uses Puppeteer to load and render the webpage
- Extracts DOM structure and identifies key elements
- Analyzes content areas, forms, tables, and other structural elements

### 2. Traditional Selector Generation
- Generates selectors based on common patterns (class names, IDs, attributes)
- Uses keyword matching to find relevant elements
- Creates path-based selectors for complex structures

### 3. AI-Powered Analysis
- Sends page analysis to GPT-4 for intelligent selector evaluation
- Considers specificity, reliability, and resistance to changes
- Provides reasoning for selector choices

### 4. Validation & Ranking
- Tests all generated selectors against the actual DOM
- Validates element counts and extracts sample content
- Ranks selectors by confidence and reliability

## Example Use Cases

### E-commerce Scraping
- **URL**: `https://amazon.com/product-page`
- **Target**: "product price, product title, product images"
- **Result**: High-confidence selectors for price elements, title headings, and image containers

### News Article Extraction
- **URL**: `https://news-website.com/article`
- **Target**: "article title, article content, publication date"
- **Result**: Selectors for article headers, main content areas, and date/time elements

### Contact Information
- **URL**: `https://contact-page.com`
- **Target**: "email addresses, phone numbers, contact forms"
- **Result**: Selectors for email links, phone number spans, and form elements

## API Reference

### POST /api/find-selectors

**Request Body:**
```json
{
  "url": "https://example.com",
  "targetInfo": "description of what to find",
  "options": {
    "waitForSelector": ".dynamic-content"
  }
}
```

**Response:**
```json
{
  "success": true,
  "url": "https://example.com",
  "targetInfo": "product price",
  "selectors": {
    "primary": {
      "selector": ".price-value",
      "confidence": 0.95,
      "reasoning": "Found price keyword in class name",
      "elementCount": 1,
      "sampleText": "$29.99"
    },
    "alternatives": [...],
    "confidence": 0.95
  },
  "analysis": {
    "title": "Page Title",
    "contentAreas": [...],
    "forms": [...],
    "tables": [...]
  }
}
```

## Configuration

### Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `PORT`: Server port (default: 3000)
- `PUPPETEER_HEADLESS`: Run browser in headless mode (default: true)
- `PUPPETEER_TIMEOUT`: Page load timeout in milliseconds (default: 30000)

### Advanced Options

When making API requests, you can include additional options:

- `waitForSelector`: Wait for a specific element to load before analysis
- Custom user agents, viewport settings, and more

## Architecture

```
src/
├── agents/
│   └── SelectorAgent.js      # AI-powered selector analysis
├── core/
│   └── WebAnalyzer.js        # Web page analysis engine
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
```
