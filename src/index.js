// src/index.js (updated)
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Use PlaywrightAnalyzer instead of WebAnalyzer
const PlaywrightAnalyzer = require('./core/PlaywrightAnalyzer');
const SelectorAgent = require('./agents/SelectorAgent');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Add request timing middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Initialize analyzers
const webAnalyzer = new PlaywrightAnalyzer();
const selectorAgent = new SelectorAgent();

// API endpoint for finding selectors
app.post('/api/find-selectors', async (req, res) => {
  const { url, targetInfo, options = {} } = req.body;

  if (!url || !targetInfo) {
    return res.status(400).json({
      success: false,
      error: 'URL and targetInfo are required'
    });
  }

  try {
    console.log(`Analyzing URL: ${url}`);
    console.log(`Looking for: ${targetInfo}`);

    // Step 1: Analyze the page using Playwright
    const pageAnalysis = await webAnalyzer.analyzePage(url, options);

    // Step 2: Find selectors using AI
    const selectors = await selectorAgent.findSelectors(
      pageAnalysis,
      targetInfo,
      options
    );

    // Step 3: Enhance response with additional metadata
    const totalSelectorsFound = Object.values(selectors).reduce((acc, result) => {
        let count = 0;
        if (result.primary) count++;
        if (result.alternatives) count += result.alternatives.length;
        return acc + count;
    }, 0);

    const enhancedResponse = {
      success: true,
      url,
      targetInfo,
      selectors,
      analysis: {
        title: pageAnalysis.title,
        contentAreas: pageAnalysis.contentAreas?.length || 0,
        forms: pageAnalysis.forms?.length || 0,
        tables: pageAnalysis.tables?.length || 0,
        images: pageAnalysis.images?.length || 0,
        links: pageAnalysis.links?.length || 0,
        buttons: pageAnalysis.buttons?.length || 0,
        priceElements: pageAnalysis.priceElements?.length || 0,
        interactiveElements: pageAnalysis.interactiveElements?.length || 0
      },
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - req.startTime || 0,
        totalSelectorsFound: totalSelectorsFound
      }
    };

    res.json(enhancedResponse);

  } catch (error) {
    console.error('Error finding selectors:', error);
    
    // Provide more helpful error messages
    let errorMessage = error.message;
    if (error.message.includes('timeout')) {
      errorMessage = 'The website took too long to load. Try again or check if the URL is correct.';
    } else if (error.message.includes('ERR_NAME_NOT_RESOLVED')) {
      errorMessage = 'Could not resolve the website URL. Please check the URL and try again.';
    } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
      errorMessage = 'Connection to the website was refused. The site might be down or blocking requests.';
    }
    
    res.status(500).json({
      error: errorMessage,
      success: false,
      suggestions: [
        'Try a different URL',
        'Check if the website is accessible',
        'Use more specific target descriptions',
        'Try adding waitForSelector option for dynamic content'
      ]
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    features: ['playwright', 'ai-analysis', 'enhanced-selectors']
  });
});

// Start server
app.listen(port, () => {
  console.log(`Agentic Scraper running on port ${port}`);
  console.log(`Visit http://localhost:${port} to use the web interface`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await webAnalyzer.close();
  process.exit(0);
});
