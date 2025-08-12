const { chromium } = require('playwright');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

class WebAnalyzer {
  constructor() {
    this.browser = null;
    this.context = null;
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
      
      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 }
      });
    }
  }

  async analyzePage(url, options = {}) {
    await this.initialize();
    
    const page = await this.context.newPage();
    
    try {
      // Set longer timeout and more robust navigation
      const timeout = options.timeout || 60000; // Increased timeout
      
      // Navigate to the page with multiple strategies
      try {
        await page.goto(url, { 
          waitUntil: 'domcontentloaded', // Changed from networkidle2 for faster loading
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
      } else {
        // Smart wait strategy based on detected page type
        try {
          const htmlSnap = await page.content();
          const domSnap = new JSDOM(htmlSnap);
          const detected = this.detectPageType(domSnap.window.document);
          const candidates = detected.waitSelectors || [];
          if (candidates.length > 0) {
            await this.waitForAnySelector(page, candidates, 10000);
          }
        } catch (e) {
          // Ignore smart wait failures
        }
      }

      // Additional wait for dynamic content
      await page.waitForTimeout(2000); // Wait 2 seconds for any dynamic content

      // Get page content
      const html = await page.content();
      const title = await page.title();
      
      // Create JSDOM instance for analysis
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Analyze page structure
      const analysis = this.analyzeDOMStructure(document);
      
      return {
        url,
        title,
        html,
        dom: document,
        domStructure: this.extractDOMStructure(document),
        pageType: this.detectPageType(document).type,
        ...analysis
      };

    } catch (error) {
      console.error(`Error analyzing page ${url}:`, error.message);
      throw new Error(`Failed to analyze page: ${error.message}`);
    } finally {
      await page.close();
    }
  }

  detectPageType(document) {
    const text = document.body ? document.body.textContent.toLowerCase() : '';
    const has = (sel) => document.querySelector(sel);
    // Heuristics
    if (has('[class*="product"], .price, [data-price], .add-to-cart')) {
      return {
        type: 'ecommerce',
        waitSelectors: ['.price', '[data-price]', '.add-to-cart', '.product-title, [class*="title"]']
      };
    }
    if (has('article, [class*="article"], .publish-date, time[datetime]')) {
      return {
        type: 'news',
        waitSelectors: ['article', '.publish-date', 'time[datetime]', 'h1']
      };
    }
    if (has('[class*="post"], [class*="timeline"], [class*="feed"]')) {
      return {
        type: 'social',
        waitSelectors: ['[class*="post"]', '[class*="content"]', '[class*="timestamp"]']
      };
    }
    return { type: 'generic', waitSelectors: ['main', '#main', '.content'] };
  }

  async waitForAnySelector(page, selectors, totalTimeoutMs = 10000) {
    const perSelectorTimeout = Math.max(1500, Math.floor(totalTimeoutMs / Math.max(1, selectors.length)));
    for (const sel of selectors) {
      try {
        await page.waitForSelector(sel, { timeout: perSelectorTimeout });
        return sel;
      } catch (_) {
        // try next
      }
    }
    return null;
  }

  analyzeDOMStructure(document) {
    const analysis = {
      contentAreas: [],
      forms: [],
      tables: [],
      lists: [],
      images: [],
      links: [],
      buttons: []
    };

    // Find main content areas
    const mainSelectors = ['main', '[role="main"]', '.main', '#main', '.content', '#content'];
    for (const selector of mainSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        analysis.contentAreas.push({
          selector: selector,
          text: el.textContent.trim().substring(0, 200)
        });
      });
    }

    // Find forms
    const forms = document.querySelectorAll('form');
    forms.forEach((form, index) => {
      analysis.forms.push({
        index,
        action: form.action,
        method: form.method,
        inputs: form.querySelectorAll('input, select, textarea').length
      });
    });

    // Find tables
    const tables = document.querySelectorAll('table');
    analysis.tables = Array.from(tables).map((table, index) => ({
      index,
      rows: table.querySelectorAll('tr').length,
      columns: table.querySelectorAll('th, td').length
    }));

    // Find lists
    analysis.lists = {
      ul: document.querySelectorAll('ul').length,
      ol: document.querySelectorAll('ol').length
    };

    // Find images
    const images = document.querySelectorAll('img');
    analysis.images = Array.from(images).map(img => ({
      src: img.src,
      alt: img.alt,
      title: img.title
    }));

    // Find links
    const links = document.querySelectorAll('a');
    analysis.links = Array.from(links).slice(0, 20).map(link => ({
      href: link.href,
      text: link.textContent.trim()
    }));

    // Find buttons
    const buttons = document.querySelectorAll('button, input[type="button"], input[type="submit"]');
    analysis.buttons = Array.from(buttons).map(button => ({
      text: button.textContent.trim() || button.value,
      type: button.type
    }));

    // Find price-specific elements
    const priceElements = document.querySelectorAll('[class*="price"], [class*="cost"], [data-price], [data-cost], [data-amount]');
    analysis.priceElements = Array.from(priceElements).map(element => ({
      selector: this.generateElementSelector(element),
      text: element.textContent.trim().substring(0, 50),
      classes: element.className,
      attributes: Array.from(element.attributes).map(attr => `${attr.name}="${attr.value}"`).join(', ')
    }));

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
    if (this.context) {
      try {
        await this.context.close();
      } catch (error) {
        console.error('Error closing context:', error);
      }
      this.context = null;
    }
    
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        console.error('Error closing browser:', error);
      }
      this.browser = null;
    }
  }

  generateElementSelector(element) {
    // Try to generate a unique selector for the element
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c);
      if (classes.length > 0) {
        return `.${classes[0]}`;
      }
    }
    
    return element.tagName.toLowerCase();
  }
}

module.exports = WebAnalyzer; 