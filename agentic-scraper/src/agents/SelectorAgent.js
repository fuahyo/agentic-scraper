const OpenAI = require('openai');
const SelectorGenerator = require('../utils/SelectorGenerator');

class SelectorAgent {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.selectorGenerator = new SelectorGenerator();
  }

  async findSelectors(pageAnalysis, targetInfo, options = {}) {
    try {
      // Step 1: Generate initial selectors using traditional methods
      const initialSelectors = this.selectorGenerator.generateSelectors(
        pageAnalysis.dom,
        targetInfo
      );

      // Step 2: Use AI to analyze and improve selectors
      const aiAnalysis = await this.analyzeWithAI(
        pageAnalysis,
        targetInfo,
        initialSelectors
      );

      // Step 3: Validate and rank selectors
      const validatedSelectors = await this.validateSelectors(
        pageAnalysis,
        aiAnalysis.selectors
      );

      return {
        primary: validatedSelectors.best,
        alternatives: validatedSelectors.alternatives,
        confidence: validatedSelectors.confidence,
        reasoning: aiAnalysis.reasoning
      };

    } catch (error) {
      console.error('Error in SelectorAgent:', error);
      throw new Error(`Failed to find selectors: ${error.message}`);
    }
  }

  async analyzeWithAI(pageAnalysis, targetInfo, initialSelectors) {
    const prompt = this.buildAnalysisPrompt(pageAnalysis, targetInfo, initialSelectors);
    
    const systemPrompt = `You are an expert web scraping AI that finds the best CSS selectors for extracting specific information from web pages. 
    
    CRITICAL: You must respond with ONLY valid JSON. Do not include any text before or after the JSON. No explanations outside the JSON.
    
    IMPORTANT: Generate PRECISE and SPECIFIC selectors that target the exact element containing the data, not just parent containers.
    
    Your task is to:
    1. Analyze the page structure
    2. Identify the MOST SPECIFIC selectors for the target information
    3. Prefer child selectors over parent selectors when possible
    4. Use combinations like "parent.child" for better specificity
    5. Provide reasoning for your choices
    6. Suggest alternative selectors
    
    For price elements, look for:
    - Direct price elements with classes like .price, .amount, .value
    - Parent-child combinations like ".price-container .price"
    - Elements with price-specific attributes like [data-price]
    - Elements containing currency symbols and numbers
    
    Return your response as JSON with the following structure:
    {
      "selectors": [
        {
          "selector": "css-selector",
          "confidence": 0.95,
          "reasoning": "explanation",
          "type": "primary"
        }
      ],
      "reasoning": "overall reasoning",
      "recommendations": ["additional tips"]
    }
    
    Remember: Only return the JSON object, nothing else.`;

    try {
      // Try GPT-4 first
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });

      let content = completion.choices[0].message.content.trim();
      
      // Try to extract JSON if there's extra text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
      
      const response = JSON.parse(content);
      return response;
    } catch (error) {
      console.error('GPT-4 failed, trying GPT-3.5-turbo:', error.message);
      
      try {
        // Fallback to GPT-3.5-turbo
        const completion = await this.openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 2000
        });

        let content = completion.choices[0].message.content.trim();
        
        // Try to extract JSON if there's extra text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          content = jsonMatch[0];
        }
        
        const response = JSON.parse(content);
        return response;
      } catch (fallbackError) {
        console.error('Both GPT-4 and GPT-3.5-turbo failed:', fallbackError.message);
        
        // Enhanced fallback with better selector generation
        return {
          selectors: this.enhanceFallbackSelectors(initialSelectors, targetInfo),
          reasoning: "AI analysis failed, using enhanced fallback selectors",
          recommendations: ["Consider using more specific target descriptions"]
        };
      }
    }
  }

  enhanceFallbackSelectors(initialSelectors, targetInfo) {
    const enhanced = [];
    
    // Add common selectors based on target info
    const patterns = this.identifyCommonPatterns(targetInfo);
    patterns.forEach(pattern => {
      enhanced.push({
        selector: pattern.selector,
        confidence: pattern.confidence,
        reasoning: pattern.reasoning,
        type: "fallback"
      });
    });
    
    // Add initial selectors with adjusted confidence
    initialSelectors.forEach(selector => {
      enhanced.push({
        ...selector,
        confidence: Math.min(selector.confidence * 0.8, 0.7), // Reduce confidence for fallback
        type: "fallback"
      });
    });
    
    return enhanced;
  }

  identifyCommonPatterns(targetInfo) {
    const patterns = [];
    const lowerInfo = targetInfo.toLowerCase();
    
    // Price patterns
    if (lowerInfo.includes('price') || lowerInfo.includes('cost') || lowerInfo.includes('amount')) {
      patterns.push(
        { selector: '[class*="price"]', confidence: 0.8, reasoning: "Common price class pattern" },
        { selector: '[data-price]', confidence: 0.7, reasoning: "Data attribute for price" },
        { selector: '.price', confidence: 0.6, reasoning: "Simple price class" },
        { selector: '[class*="cost"]', confidence: 0.6, reasoning: "Cost class pattern" },
        { selector: '[class*="sticky"] [class*="price"]', confidence: 0.9, reasoning: "Sticky price container pattern" },
        { selector: '[class*="product"] [class*="price"]', confidence: 0.9, reasoning: "Product price pattern" },
        { selector: '[class*="items-baseline"]', confidence: 0.85, reasoning: "Baseline items pattern" },
        { selector: '[class*="sticky-product-prices"] [class*="items-baseline"]', confidence: 0.95, reasoning: "Specific sticky product price pattern" }
      );
    }
    
    // Title patterns
    if (lowerInfo.includes('title') || lowerInfo.includes('name') || lowerInfo.includes('heading')) {
      patterns.push(
        { selector: 'h1, h2, h3', confidence: 0.8, reasoning: "Heading elements for titles" },
        { selector: '[class*="title"]', confidence: 0.7, reasoning: "Title class pattern" },
        { selector: '[class*="name"]', confidence: 0.6, reasoning: "Name class pattern" }
      );
    }
    
    // Image patterns
    if (lowerInfo.includes('image') || lowerInfo.includes('img') || lowerInfo.includes('photo')) {
      patterns.push(
        { selector: 'img', confidence: 0.8, reasoning: "Image elements" },
        { selector: '[class*="image"]', confidence: 0.7, reasoning: "Image class pattern" },
        { selector: '[class*="photo"]', confidence: 0.6, reasoning: "Photo class pattern" }
      );
    }
    
    // Brand patterns
    if (lowerInfo.includes('brand')) {
      patterns.push(
        { selector: '[class*="brand"]', confidence: 0.7, reasoning: "Brand class pattern" },
        { selector: '[data-brand]', confidence: 0.6, reasoning: "Brand data attribute" }
      );
    }
    
    return patterns;
  }

  buildAnalysisPrompt(pageAnalysis, targetInfo, initialSelectors) {
    const lowerInfo = targetInfo.toLowerCase();
    let priceAnalysis = '';
    
    if (lowerInfo.includes('price') && pageAnalysis.priceElements) {
      priceAnalysis = `
    PRICE-SPECIFIC ANALYSIS:
    ${pageAnalysis.priceElements.map(el => 
      `- Selector: ${el.selector}, Text: "${el.text}", Classes: ${el.classes}`
    ).join('\n')}
    `;
    }
    
    return `
    TARGET INFORMATION: ${targetInfo}
    
    PAGE ANALYSIS:
    - URL: ${pageAnalysis.url}
    - Title: ${pageAnalysis.title}
    - Main content areas: ${pageAnalysis.contentAreas.join(', ')}
    - Forms found: ${pageAnalysis.forms.length}
    - Tables found: ${pageAnalysis.tables.length}
    ${priceAnalysis}
    
    INITIAL SELECTORS GENERATED:
    ${JSON.stringify(initialSelectors, null, 2)}
    
    DOM STRUCTURE (key elements):
    ${pageAnalysis.domStructure}
    
    Please analyze this information and find the MOST SPECIFIC CSS selectors for extracting: "${targetInfo}"
    
    IMPORTANT: Focus on generating precise selectors that target the exact element, not just parent containers.
    For price elements, look for parent-child combinations like ".sticky-product-prices .items-baseline"
    
    Consider:
    1. Specificity and reliability of selectors
    2. Resistance to layout changes
    3. Performance implications
    4. Alternative approaches
    5. Parent-child relationships for better specificity
    
    Provide your analysis and recommendations.
    `;
  }

  async validateSelectors(pageAnalysis, selectors) {
    const results = [];
    
    for (const selector of selectors) {
      try {
        const elements = pageAnalysis.dom.querySelectorAll(selector.selector);
        const count = elements.length;
        
        results.push({
          ...selector,
          elementCount: count,
          isValid: count > 0,
          sampleText: count > 0 ? elements[0].textContent.trim().substring(0, 100) : null
        });
      } catch (error) {
        results.push({
          ...selector,
          elementCount: 0,
          isValid: false,
          error: error.message
        });
      }
    }

    // Sort by confidence and validity
    const validSelectors = results.filter(s => s.isValid);
    const bestSelector = validSelectors.sort((a, b) => b.confidence - a.confidence)[0];
    
    return {
      best: bestSelector,
      alternatives: validSelectors.slice(1, 5),
      confidence: bestSelector ? bestSelector.confidence : 0
    };
  }
}

module.exports = SelectorAgent; 