const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const SelectorAgent = require('./agents/SelectorAgent');
const WebAnalyzer = require('./core/WebAnalyzer');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize the agentic AI system
const selectorAgent = new SelectorAgent();
const webAnalyzer = new WebAnalyzer();

// Main endpoint for finding selectors
app.post('/api/find-selectors', async (req, res) => {
  try {
    const { url, targetInfo, options = {} } = req.body;
    
    if (!url || !targetInfo) {
      return res.status(400).json({
        error: 'URL and target information are required'
      });
    }

    console.log(`Analyzing URL: ${url}`);
    console.log(`Looking for: ${targetInfo}`);

    // Step 1: Analyze the webpage
    const pageAnalysis = await webAnalyzer.analyzePage(url, options);
    
    // Step 2: Use AI agent to find selectors
    const selectors = await selectorAgent.findSelectors(
      pageAnalysis,
      targetInfo,
      options
    );

    // Step 3: Enhance response with additional metadata
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
        buttons: pageAnalysis.buttons?.length || 0
      },
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - req.startTime || 0,
        totalSelectorsFound: selectors.alternatives ? selectors.alternatives.length + 1 : 1
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

// Add request timing middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Agentic Scraper running on port ${port}`);
  console.log(`Visit http://localhost:${port} to use the web interface`);
}); 