const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const SelectorAgent = require('./agents/SelectorAgent');
const WebAnalyzer = require('./core/WebAnalyzer');
const VisualInspectorService = require('./core/VisualInspectorService');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize the agentic AI system
const selectorAgent = new SelectorAgent();
const webAnalyzer = new WebAnalyzer();
const visualInspector = new VisualInspectorService();

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
        totalSelectorsFound: selectors.alternatives ? selectors.alternatives.length + 1 : 1,
        aiConfidence: selectors.confidence,
        needsVisualInspection: selectors.needsVisualInspection,
        qualityScore: selectors.qualityScore,
        suggestions: selectors.suggestions || []
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

// Schema-based selector discovery
app.post('/api/find-selectors-schema', async (req, res) => {
  try {
    const { url, schema, options = {} } = req.body;
    if (!url || !schema || typeof schema !== 'object') {
      return res.status(400).json({ success: false, error: 'URL and schema object are required' });
    }

    const pageAnalysis = await webAnalyzer.analyzePage(url, options);

    const results = {};
    for (const [fieldName, fieldCfg] of Object.entries(schema)) {
      const targetInfo = fieldCfg?.description || fieldCfg?.label || fieldName;
      try {
        const sel = await selectorAgent.findSelectors(pageAnalysis, String(targetInfo), options);
        results[fieldName] = sel;
      } catch (e) {
        results[fieldName] = { error: e.message, success: false };
      }
    }

    res.json({
      success: true,
      url,
      pageType: pageAnalysis.pageType,
      analysis: {
        title: pageAnalysis.title,
        contentAreas: pageAnalysis.contentAreas?.length || 0,
        forms: pageAnalysis.forms?.length || 0
      },
      fields: results
    });
  } catch (error) {
    console.error('Error in schema analysis:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add request timing middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Visual Inspector API endpoints
app.post('/api/start-visual-inspection', async (req, res) => {
  try {
    const { url, schema, options = {} } = req.body;
    
    if (!url) {
      return res.status(400).json({
        error: 'URL is required for visual inspection'
      });
    }

    console.log(`Starting visual inspection for: ${url}`);

    const result = await visualInspector.startVisualInspection(url, schema, options);
    
    res.json({
      success: true,
      message: 'Visual inspection started successfully',
      sessionId: Date.now().toString(),
      ...result
    });

  } catch (error) {
    console.error('Error starting visual inspection:', error);
    res.status(500).json({
      error: 'Failed to start visual inspection',
      message: error.message
    });
  }
});

app.post('/api/select-element', async (req, res) => {
  try {
    const { fieldName, fieldDescription } = req.body;
    
    if (!fieldName) {
      return res.status(400).json({
        error: 'Field name is required for element selection'
      });
    }

    console.log(`Selecting element for field: ${fieldName}`);

    const result = await visualInspector.selectElementForField(fieldName, fieldDescription);
    
    res.json(result);

  } catch (error) {
    console.error('Error selecting element:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to select element',
      message: error.message
    });
  }
});

app.post('/api/stop-visual-inspection', async (req, res) => {
  try {
    console.log('Stopping visual inspection');
    await visualInspector.cleanup();
    
    res.json({
      success: true,
      message: 'Visual inspection stopped'
    });

  } catch (error) {
    console.error('Error stopping visual inspection:', error);
    res.status(500).json({
      error: 'Failed to stop visual inspection',
      message: error.message
    });
  }
});

app.get('/api/visual-inspector-status', async (req, res) => {
  try {
    const isReady = await visualInspector.isReady();
    
    res.json({
      ready: isReady,
      active: visualInspector.isInspecting
    });

  } catch (error) {
    console.error('Error checking visual inspector status:', error);
    res.status(500).json({
      ready: false,
      active: false,
      error: error.message
    });
  }
});

// Enhanced endpoint that combines AI and Visual inspection
app.post('/api/find-selectors-enhanced', async (req, res) => {
  try {
    const { url, targetInfo, options = {}, useVisualIfNeeded = true } = req.body;
    
    if (!url || !targetInfo) {
      return res.status(400).json({
        error: 'URL and target information are required'
      });
    }

    console.log(`Enhanced analysis for: ${url}`);
    console.log(`Target: ${targetInfo}`);

    // Step 1: Try AI-based approach first
    const pageAnalysis = await webAnalyzer.analyzePage(url, options);
    const aiSelectors = await selectorAgent.findSelectors(pageAnalysis, targetInfo, options);

    const response = {
      success: true,
      url,
      targetInfo,
      aiResult: {
        selectors: aiSelectors,
        confidence: aiSelectors.confidence,
        needsVisualInspection: aiSelectors.needsVisualInspection
      },
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
        method: 'AI_ONLY'
      }
    };

    // Step 2: If AI confidence is low and visual inspection is requested
    if (useVisualIfNeeded && aiSelectors.needsVisualInspection) {
      response.recommendVisualInspection = true;
      response.visualInspectionReason = 'AI confidence below threshold - visual inspection recommended';
      response.metadata.method = 'AI_WITH_VISUAL_RECOMMENDATION';
    }

    res.json(response);

  } catch (error) {
    console.error('Error in enhanced selector finding:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      suggestions: [
        'Try a different URL',
        'Check if the website is accessible',
        'Use more specific target descriptions'
      ]
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Agentic Scraper running on port ${port}`);
  console.log(`Visit http://localhost:${port} to use the web interface`);
}); 