class SelectorGenerator {
  constructor() {
    this.commonSelectors = {
      title: ['h1', 'h2', '.title', '[class*="title"]', '[id*="title"]'],
      price: ['.price', '[class*="price"]', '[data-price]', '.cost', '.amount'],
      description: ['.description', '.desc', '.content', '.text', '[class*="desc"]'],
      image: ['img', '.image', '.img', '[class*="image"]'],
      link: ['a', '.link', '[class*="link"]'],
      button: ['button', '.btn', '.button', '[class*="btn"]'],
      form: ['form', '.form', '[class*="form"]'],
      table: ['table', '.table', '[class*="table"]']
    };
  }

  generateSelectors(dom, targetInfo) {
    const selectors = [];
    const keywords = this.extractKeywords(targetInfo);
    
    // Generate selectors based on keywords
    for (const keyword of keywords) {
      const keywordSelectors = this.generateKeywordSelectors(dom, keyword);
      selectors.push(...keywordSelectors);
    }

    // Generate selectors based on common patterns
    const patternSelectors = this.generatePatternSelectors(dom, targetInfo);
    selectors.push(...patternSelectors);

    // Generate selectors based on text content
    const textSelectors = this.generateTextSelectors(dom, targetInfo);
    selectors.push(...textSelectors);

    // Generate advanced selectors
    const advancedSelectors = this.generateAdvancedSelectors(dom, targetInfo);
    selectors.push(...advancedSelectors);

    // Remove duplicates and sort by confidence
    const uniqueSelectors = this.removeDuplicateSelectors(selectors);
    return uniqueSelectors.slice(0, 15); // Return top 15 selectors
  }

  generateAdvancedSelectors(dom, targetInfo) {
    const selectors = [];
    const lowerInfo = targetInfo.toLowerCase();
    
    // E-commerce specific selectors
    if (lowerInfo.includes('price') || lowerInfo.includes('cost')) {
      // Look for price elements with specific patterns
      const priceElements = dom.querySelectorAll('*');
      priceElements.forEach(element => {
        const text = element.textContent.trim();
        const hasPricePattern = /\$[\d,]+\.?\d*|\d+\.?\d*\s*(?:USD|EUR|CLP|COP|MXN)/i.test(text);
        
        if (hasPricePattern) {
          // Generate multiple selector options for better specificity
          const selectorOptions = this.generateSpecificSelectors(element, 'price');
          
          selectorOptions.forEach(option => {
            selectors.push({
              selector: option.selector,
              confidence: option.confidence,
              reasoning: `Found price pattern: "${text.substring(0, 30)}..." - ${option.reasoning}`
            });
          });
        }
      });
    }
    
    // Product name/title selectors
    if (lowerInfo.includes('name') || lowerInfo.includes('title') || lowerInfo.includes('product')) {
      const titleElements = dom.querySelectorAll('h1, h2, h3, .product-title, .product-name, [class*="title"], [class*="name"]');
      titleElements.forEach(element => {
        const selector = this.generateElementSelector(element);
        if (selector) {
          selectors.push({
            selector,
            confidence: 0.8,
            reasoning: `Product title element: "${element.textContent.trim().substring(0, 30)}..."`
          });
        }
      });
    }
    
    // Brand selectors
    if (lowerInfo.includes('brand')) {
      const brandElements = dom.querySelectorAll('[class*="brand"], [data-brand], .brand, .manufacturer');
      brandElements.forEach(element => {
        const selector = this.generateElementSelector(element);
        if (selector) {
          selectors.push({
            selector,
            confidence: 0.7,
            reasoning: `Brand element: "${element.textContent.trim().substring(0, 30)}..."`
          });
        }
      });
    }
    
    return selectors;
  }

  removeDuplicateSelectors(selectors) {
    const seen = new Set();
    const unique = [];
    
    selectors.forEach(selector => {
      if (!seen.has(selector.selector)) {
        seen.add(selector.selector);
        unique.push(selector);
      }
    });
    
    // Sort by confidence (highest first)
    return unique.sort((a, b) => b.confidence - a.confidence);
  }

  extractKeywords(targetInfo) {
    const words = targetInfo.toLowerCase().split(/\s+/);
    return words.filter(word => word.length > 2);
  }

  generateKeywordSelectors(dom, keyword) {
    const selectors = [];
    
    // Search for elements with keyword in class, id, or data attributes
    const elements = dom.querySelectorAll('*');
    
    elements.forEach(element => {
      const attributes = ['class', 'id', 'data-*'];
      
      attributes.forEach(attr => {
        if (attr === 'data-*') {
          // Check all data attributes
          Array.from(element.attributes).forEach(attrObj => {
            if (attrObj.name.startsWith('data-') && 
                attrObj.value.toLowerCase().includes(keyword)) {
              selectors.push({
                selector: `[${attrObj.name}*="${keyword}"]`,
                confidence: 0.8,
                reasoning: `Found keyword '${keyword}' in ${attrObj.name} attribute`
              });
            }
          });
        } else {
          const value = element.getAttribute(attr);
          if (value && value.toLowerCase().includes(keyword)) {
            selectors.push({
              selector: `[${attr}*="${keyword}"]`,
              confidence: 0.9,
              reasoning: `Found keyword '${keyword}' in ${attr} attribute`
            });
          }
        }
      });
    });

    return selectors;
  }

  generatePatternSelectors(dom, targetInfo) {
    const selectors = [];
    
    // Check for common patterns based on target info
    const patterns = this.identifyPatterns(targetInfo);
    
    patterns.forEach(pattern => {
      if (this.commonSelectors[pattern]) {
        this.commonSelectors[pattern].forEach(selector => {
          selectors.push({
            selector,
            confidence: 0.7,
            reasoning: `Using common pattern for '${pattern}'`
          });
        });
      }
    });

    return selectors;
  }

  identifyPatterns(targetInfo) {
    const patterns = [];
    const lowerInfo = targetInfo.toLowerCase();
    
    if (lowerInfo.includes('price') || lowerInfo.includes('cost') || lowerInfo.includes('amount')) {
      patterns.push('price');
    }
    if (lowerInfo.includes('title') || lowerInfo.includes('heading')) {
      patterns.push('title');
    }
    if (lowerInfo.includes('description') || lowerInfo.includes('text')) {
      patterns.push('description');
    }
    if (lowerInfo.includes('image') || lowerInfo.includes('photo')) {
      patterns.push('image');
    }
    if (lowerInfo.includes('link') || lowerInfo.includes('url')) {
      patterns.push('link');
    }
    if (lowerInfo.includes('button') || lowerInfo.includes('click')) {
      patterns.push('button');
    }
    if (lowerInfo.includes('form') || lowerInfo.includes('input')) {
      patterns.push('form');
    }
    if (lowerInfo.includes('table') || lowerInfo.includes('list')) {
      patterns.push('table');
    }

    return patterns;
  }

  generateTextSelectors(dom, targetInfo) {
    const selectors = [];
    const keywords = this.extractKeywords(targetInfo);
    
    // Find elements containing the target text
    const elements = dom.querySelectorAll('*');
    
    elements.forEach(element => {
      const text = element.textContent.trim();
      if (text && keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        // Generate selector for this element
        const selector = this.generateElementSelector(element);
        if (selector) {
          selectors.push({
            selector,
            confidence: 0.6,
            reasoning: `Element contains target text: "${text.substring(0, 50)}..."`
          });
        }
      }
    });

    return selectors;
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
    
    // Try to create a path-based selector
    const path = this.getElementPath(element);
    if (path) {
      return path;
    }
    
    return null;
  }

  getElementPath(element) {
    const path = [];
    let current = element;
    
    while (current && current !== current.parentElement) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector = `#${current.id}`;
        path.unshift(selector);
        break;
      }
      
      if (current.className) {
        const classes = current.className.split(' ').filter(c => c);
        if (classes.length > 0) {
          selector += `.${classes[0]}`;
        }
      }
      
      // Add nth-child if needed
      const siblings = Array.from(current.parentElement?.children || []);
      const index = siblings.indexOf(current);
      if (index > 0) {
        selector += `:nth-child(${index + 1})`;
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.length > 0 ? path.join(' > ') : null;
  }

  generateSpecificSelectors(element, type) {
    const selectors = [];
    
    // Method 1: Direct element with class
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c);
      if (classes.length > 0) {
        selectors.push({
          selector: `.${classes[0]}`,
          confidence: 0.7,
          reasoning: "Direct class selector"
        });
      }
    }
    
    // Method 2: Parent + child combination
    if (element.parentElement && element.parentElement.className) {
      const parentClasses = element.parentElement.className.split(' ').filter(c => c);
      const elementClasses = element.className ? element.className.split(' ').filter(c => c) : [];
      
      if (parentClasses.length > 0 && elementClasses.length > 0) {
        selectors.push({
          selector: `.${parentClasses[0]} .${elementClasses[0]}`,
          confidence: 0.9,
          reasoning: "Parent-child class combination"
        });
      }
    }
    
    // Method 3: ID-based selector
    if (element.id) {
      selectors.push({
        selector: `#${element.id}`,
        confidence: 0.95,
        reasoning: "ID-based selector"
      });
    }
    
    // Method 4: Parent ID + child class
    if (element.parentElement && element.parentElement.id && element.className) {
      const elementClasses = element.className.split(' ').filter(c => c);
      if (elementClasses.length > 0) {
        selectors.push({
          selector: `#${element.parentElement.id} .${elementClasses[0]}`,
          confidence: 0.9,
          reasoning: "Parent ID + child class"
        });
      }
    }
    
    // Method 5: Tag + class combination
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c);
      if (classes.length > 0) {
        selectors.push({
          selector: `${element.tagName.toLowerCase()}.${classes[0]}`,
          confidence: 0.8,
          reasoning: "Tag + class combination"
        });
      }
    }
    
    // Method 6: Attribute-based selectors
    if (type === 'price') {
      // Look for price-specific attributes
      const priceAttributes = ['data-price', 'data-value', 'data-amount'];
      priceAttributes.forEach(attr => {
        if (element.hasAttribute(attr)) {
          selectors.push({
            selector: `[${attr}]`,
            confidence: 0.85,
            reasoning: `Price attribute selector: ${attr}`
          });
        }
      });
    }
    
    // Method 7: Text content pattern matching
    const text = element.textContent.trim();
    if (text && /\$[\d,]+\.?\d*/.test(text)) {
      // Find elements with price-like text
      const pricePattern = /\$[\d,]+\.?\d*/;
      const match = text.match(pricePattern);
      if (match) {
        selectors.push({
          selector: this.generateElementSelector(element),
          confidence: 0.9,
          reasoning: `Price pattern match: ${match[0]}`
        });
      }
    }
    
    return selectors;
  }
}

module.exports = SelectorGenerator; 