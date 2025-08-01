// src/core/PlaywrightAnalyzer.js
const { chromium } = require('playwright');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

class PlaywrightAnalyzer {
  constructor() {
    this.browser = null;
  }

  async initialize() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
    }
  }

  async analyzePage(url, options = {}) {
    await this.initialize();
    
    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    try {
      // Set longer timeout and more robust navigation
      const timeout = options.timeout || 60000;
      
      // Navigate to the page with multiple strategies
      try {
        await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: timeout 
        });
      } catch (navigationError) {
        console.log(`Navigation failed with domcontentloaded, trying with load event: ${navigationError.message}`);
        await page.goto(url, { 
          waitUntil: 'load',
          timeout: timeout 
        });
      }

      // Wait for dynamic content if specified
      if (options.waitForSelector) {
        try {
          await page.waitForSelector(options.waitForSelector, { timeout: 15000 });
        } catch (selectorError) {
          console.log(`Selector ${options.waitForSelector} not found, continuing without it`);
        }
      }

      // Additional wait for dynamic content
      await page.waitForTimeout(2000);

      const html = await page.content();
      const title = await page.title();
      
      const dom = new JSDOM(html);
      const document = dom.window.document;

      const analysis = await this.performEnhancedAnalysis(page, options);
      
      return {
        url,
        title,
        html,
        dom: document, 
        domStructure: this.extractDOMStructure(document),
        ...analysis
      };

    } catch (error) {
      console.error(`Error analyzing page ${url}:`, error.message);
      throw new Error(`Failed to analyze page: ${error.message}`);
    } finally {
      await page.close();
      await context.close();
    }
  }

  async performEnhancedAnalysis(page, options) {
    const analysis = {
      contentAreas: [],
      forms: [],
      tables: [],
      lists: [],
      images: [],
      links: [],
      buttons: [],
      priceElements: [],
      interactiveElements: [],
      accessibilityInfo: []
    };

    // Enhanced content area detection
    const mainSelectors = ['main', '[role="main"]', '.main', '#main', '.content', '#content', '[class*="product"]', '[class*="container"]'];
    for (const selector of mainSelectors) {
      const elements = await page.$$(selector);
      for (const element of elements) {
        const text = await element.textContent();
        const isVisible = await element.isVisible();
        if (isVisible && text) {
          analysis.contentAreas.push({
            selector: selector,
            text: text.trim().substring(0, 200),
            visible: isVisible
          });
        }
      }
    }

    // Enhanced form analysis
    const forms = await page.$$('form');
    for (const form of forms) {
      const action = await form.getAttribute('action');
      const method = await form.getAttribute('method');
      const inputs = await form.$$('input, select, textarea');
      const isVisible = await form.isVisible();
      
      analysis.forms.push({
        action,
        method,
        inputs: inputs.length,
        visible: isVisible
      });
    }

    // Enhanced table analysis
    const tables = await page.$$('table');
    for (const table of tables) {
      const rows = await table.$$('tr');
      const cells = await table.$$('th, td');
      const isVisible = await table.isVisible();
      
      analysis.tables.push({
        rows: rows.length,
        columns: cells.length,
        visible: isVisible
      });
    }

    // Enhanced image analysis
    const images = await page.$$('img');
    for (const img of images) {
      const src = await img.getAttribute('src');
      const alt = await img.getAttribute('alt');
      const title = await img.getAttribute('title');
      const isVisible = await img.isVisible();
      
      analysis.images.push({
        src,
        alt,
        title,
        visible: isVisible
      });
    }

    // Enhanced link analysis
    const links = await page.$$('a');
    for (let i = 0; i < Math.min(links.length, 20); i++) {
      const link = links[i];
      if (!await link.isVisible()) continue;
      const href = await link.getAttribute('href');
      const text = await link.textContent();
      
      analysis.links.push({
        href,
        text: text?.trim(),
        visible: true
      });
    }

    // Enhanced button analysis
    const buttons = await page.$$('button, input[type="button"], input[type="submit"]');
    for (const button of buttons) {
        if (!await button.isVisible()) continue;
        const text = await button.textContent() || await button.getAttribute('value');
        const type = await button.getAttribute('type');
      
        analysis.buttons.push({
            text: text?.trim(),
            type,
            visible: true
        });
    }

    // Enhanced price element detection
    const priceSelectors = [
      '[class*="price"]', '[class*="cost"]', '[data-price]', '[data-cost]', '[data-amount]',
      '[class*="sticky"]', '[class*="product"]', '[class*="items-baseline"]'
    ];
    
    for (const selector of priceSelectors) {
      const elements = await page.$$(selector);
      for (const element of elements) {
        const text = await element.textContent();
        const classes = await element.getAttribute('class');
        const isVisible = await element.isVisible();
        
        if (text && isVisible) {
          analysis.priceElements.push({
            selector: selector,
            text: text.trim().substring(0, 50),
            classes,
            visible: isVisible,
            boundingBox: await element.boundingBox()
          });
        }
      }
    }

    // Interactive elements analysis
    const interactiveSelectors = [
      'button', 'input', 'select', 'textarea', 'a[href]', '[onclick]', '[tabindex]'
    ];
    
    for (const selector of interactiveSelectors) {
      const elements = await page.$$(selector);
      for (const element of elements) {
        if (!await element.isVisible()) continue;
        const tagName = await element.evaluate(el => el.tagName.toLowerCase());
        const isEnabled = await element.isEnabled();
        
        analysis.interactiveElements.push({
          tagName,
          selector: selector,
          visible: true,
          enabled: isEnabled
        });
      }
    }

    // Accessibility information
    const accessibilityElements = await page.$$('[role], [aria-label], [aria-describedby]');
    for (const element of accessibilityElements) {
        if (!await element.isVisible()) continue;
        const role = await element.getAttribute('role');
        const ariaLabel = await element.getAttribute('aria-label');
        const ariaDescribedBy = await element.getAttribute('aria-describedby');
      
        analysis.accessibilityInfo.push({
            role,
            ariaLabel,
            ariaDescribedBy,
            visible: true
        });
    }

    return analysis;
  }

  extractDOMStructure(document) {
    const structure = [];
    const walker = document.createTreeWalker(
      document.body,
      document.defaultView.NodeFilter.SHOW_ELEMENT,
      null,
      false
    );

    let node;
    let depth = 0;
    const maxDepth = 3;

    while (node = walker.nextNode()) {
      if (depth > maxDepth) continue;
      
      const tagName = node.tagName.toLowerCase();
      const id = node.id;
      const className = node.className;
      
      if (id || className) {
        structure.push({
          tag: tagName,
          id: id,
          class: className,
          text: node.textContent.trim().substring(0, 50)
        });
      }
    }

    return structure.slice(0, 100); // Limit to first 100 elements
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  generateElementSelector(element) {
    // Enhanced selector generation using Playwright's capabilities
    return element.evaluate(el => {
      if (el.id) {
        return `#${el.id}`;
      }
      
      if (el.className) {
        const classes = el.className.split(' ').filter(c => c);
        if (classes.length > 0) {
          return `.${classes[0]}`;
        }
      }
      
      return el.tagName.toLowerCase();
    });
  }
}

module.exports = PlaywrightAnalyzer;
