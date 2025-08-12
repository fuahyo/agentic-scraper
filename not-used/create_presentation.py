#!/usr/bin/env python3
"""
PowerPoint Presentation Generator for Playwright Scraper
Creates a comprehensive presentation based on README.md content
"""

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
import json
import os

def create_title_slide(prs, title, subtitle):
    """Create title slide"""
    slide_layout = prs.slide_layouts[0]  # Title slide layout
    slide = prs.slides.add_slide(slide_layout)
    
    title_shape = slide.shapes.title
    subtitle_shape = slide.placeholders[1]
    
    title_shape.text = title
    subtitle_shape.text = subtitle
    
    # Format title
    title_frame = title_shape.text_frame
    title_frame.paragraphs[0].font.size = Pt(44)
    title_frame.paragraphs[0].font.bold = True
    title_frame.paragraphs[0].font.color.rgb = RGBColor(0, 51, 102)
    
    return slide

def create_content_slide(prs, title, content_list):
    """Create content slide with bullet points"""
    slide_layout = prs.slide_layouts[1]  # Title and content layout
    slide = prs.slides.add_slide(slide_layout)
    
    title_shape = slide.shapes.title
    content_shape = slide.placeholders[1]
    
    title_shape.text = title
    
    # Add content
    text_frame = content_shape.text_frame
    text_frame.clear()
    
    for item in content_list:
        p = text_frame.add_paragraph()
        p.text = item
        p.font.size = Pt(18)
        p.level = 0
    
    return slide

def create_comparison_slide(prs, title, comparison_data):
    """Create comparison table slide"""
    slide_layout = prs.slide_layouts[5]  # Title only layout
    slide = prs.slides.add_slide(slide_layout)
    
    title_shape = slide.shapes.title
    title_shape.text = title
    
    # Create table
    rows = len(comparison_data) + 1
    cols = len(comparison_data[0]) if comparison_data else 1
    
    left = Inches(1)
    top = Inches(2)
    width = Inches(8)
    height = Inches(4)
    
    table = slide.shapes.add_table(rows, cols, left, top, width, height).table
    
    # Add headers
    headers = ["Feature", "Intelligent Detection", "Heuristic AI", "OpenAI Auto-Playwright", "Browser Inspect"]
    for i, header in enumerate(headers):
        cell = table.cell(0, i)
        cell.text = header
        cell.fill.solid()
        cell.fill.fore_color.rgb = RGBColor(0, 51, 102)
        cell.text_frame.paragraphs[0].font.color.rgb = RGBColor(255, 255, 255)
        cell.text_frame.paragraphs[0].font.bold = True
    
    # Add data
    for i, row_data in enumerate(comparison_data):
        for j, cell_data in enumerate(row_data):
            cell = table.cell(i + 1, j)
            cell.text = cell_data
            cell.text_frame.paragraphs[0].font.size = Pt(12)
    
    return slide

def create_code_slide(prs, title, code_example):
    """Create slide with code example"""
    slide_layout = prs.slide_layouts[5]  # Title only layout
    slide = prs.slides.add_slide(slide_layout)
    
    title_shape = slide.shapes.title
    title_shape.text = title
    
    # Add text box for code
    left = Inches(1)
    top = Inches(2)
    width = Inches(8)
    height = Inches(5)
    
    textbox = slide.shapes.add_textbox(left, top, width, height)
    text_frame = textbox.text_frame
    text_frame.text = code_example
    
    # Format code
    paragraph = text_frame.paragraphs[0]
    paragraph.font.name = 'Courier New'
    paragraph.font.size = Pt(12)
    paragraph.font.color.rgb = RGBColor(0, 0, 0)
    
    return slide

def create_results_slide(prs, title, results_data):
    """Create slide showing extraction results"""
    slide_layout = prs.slide_layouts[1]  # Title and content layout
    slide = prs.slides.add_slide(slide_layout)
    
    title_shape = slide.shapes.title
    content_shape = slide.placeholders[1]
    
    title_shape.text = title
    
    # Add results
    text_frame = content_shape.text_frame
    text_frame.clear()
    
    for result in results_data:
        p = text_frame.add_paragraph()
        p.text = result
        p.font.size = Pt(16)
        p.level = 0
    
    return slide

def main():
    """Main function to create the presentation"""
    prs = Presentation()
    
    # Slide 1: Title
    create_title_slide(
        prs,
        "Playwright Scraper with Multiple Extraction Methods",
        "Intelligent Product Data Extraction from E-commerce Websites\n\nA Comprehensive Web Scraping Solution"
    )
    
    # Slide 2: Overview
    create_content_slide(
        prs,
        "🎯 Project Overview",
        [
            "• Four different extraction approaches for maximum flexibility",
            "• Intelligent detection without AI API costs",
            "• AI-powered heuristic extraction",
            "• OpenAI auto-playwright integration",
            "• Browser inspect element functionality",
            "• Works with any e-commerce website"
        ]
    )
    
    # Slide 3: Four Extraction Methods
    create_content_slide(
        prs,
        "🚀 Four Extraction Methods",
        [
            "1. 🧠 Intelligent Detection - Fast, automatic, rule-based",
            "2. 🤖 Auto-Playwright AI - Flexible, heuristic-based",
            "3. 🚀 OpenAI Auto-Playwright - True AI understanding",
            "4. 👆 Browser Inspect Element - Visual, manual control"
        ]
    )
    
    # Slide 4: Method Comparison Table
    comparison_data = [
        ["Speed", "⚡ Fastest", "🟡 Fast", "🐌 Slower (API calls)", "🐌 Slowest"],
        ["Accuracy", "🟡 Good for standard sites", "🟡 Adapts to layouts", "🟢 Highest accuracy", "🟢 100% accurate"],
        ["Cost", "❌ Free", "❌ Free", "💰 Costs money", "❌ Free"],
        ["Setup", "❌ None", "❌ None", "🔑 Needs API key", "❌ None"],
        ["Human Input", "❌ None needed", "❌ None needed", "❌ None needed", "✅ Required"]
    ]
    create_comparison_slide(prs, "📊 Method Comparison", comparison_data)
    
    # Slide 5: Intelligent Detection
    create_content_slide(
        prs,
        "🧠 Intelligent Detection",
        [
            "• Automatically generates CSS/HTML selectors",
            "• Based on schema field names",
            "• Fast and reliable for standard e-commerce sites",
            "• No external dependencies",
            "• Perfect for production/repeated runs"
        ]
    )
    
    # Slide 6: Intelligent Detection Code Example
    code_example = '''// Schema definition:
{
  "name": { "type": "str", "description": "Product name" },
  "customer_price_lc": { "type": "float", "description": "Current price" }
}

// System automatically tries:
// For "name" field:
generateSelectors("name") → ['h1', '.product-title', '.product-name']

// For "customer_price_lc" field:  
generateSelectors("customer_price_lc") → ['.price', '.current-price', '[data-price]']'''
    
    create_code_slide(prs, "🔧 Intelligent Detection - How It Works", code_example)
    
    # Slide 7: Heuristic AI
    create_content_slide(
        prs,
        "🤖 Heuristic AI",
        [
            "• Uses AI-like logic to find elements",
            "• Analyzes page content and schema",
            "• Adapts to different site layouts",
            "• No OpenAI API required",
            "• Good balance of accuracy and cost"
        ]
    )
    
    # Slide 8: OpenAI Auto-Playwright
    create_content_slide(
        prs,
        "🚀 OpenAI Auto-Playwright",
        [
            "• Uses real OpenAI GPT models",
            "• True AI understanding of page content",
            "• Highest accuracy for any layout",
            "• Requires OpenAI API key",
            "• Costs money per request (~$0.001-0.01 per field)"
        ]
    )
    
    # Slide 9: Browser Inspect Element
    create_content_slide(
        prs,
        "👆 Browser Inspect Element",
        [
            "• Visual point-and-click interface",
            "• Like browser dev tools, optimized for scraping",
            "• Most accurate for one-time setup",
            "• Requires human interaction",
            "• Perfect for complex or unusual layouts"
        ]
    )
    
    # Slide 10: Quick Start Commands
    code_example = '''# Installation
npm install
npx playwright install chromium

# Choose your method:
npm run extract        # Intelligent detection
npm run extract:auto   # Heuristic AI
npm run extract:real-ai # OpenAI (needs API key)
npm run inspect        # Browser inspect

# Simple extractor (separated):
cd simple-extractor/
npm run extract'''
    
    create_code_slide(prs, "⚡ Quick Start Commands", code_example)
    
    # Slide 11: Test Results
    results_data = [
        "✅ Simple Extractor Test:",
        "   URL: https://www.rohlik.cz/1462815-grikios-syr-do-salatu",
        "   Result: Successfully extracted all fields",
        "",
        "✅ Intelligent Detection Test:",
        "   URL: https://plazalama.com.do/p/agua-purificada-dasani-591ml-49000409772",
        "   Result: Extracted 8/10 fields successfully",
        "",
        "✅ Heuristic AI Test:",
        "   Result: Extracted 5/10 fields with AI selectors"
    ]
    create_results_slide(prs, "📊 Test Results", results_data)
    
    # Slide 12: Extracted Data Example
    code_example = '''{
  "name": "Grikios Sýr do salátu",
  "price": "44,90 Kč",
  "brand": "Grikios",
  "availability": "In Stock",
  "image": "https://example.com/image.jpg",
  "description": "Product description...",
  "url": "https://example.com/product",
  "extractedAt": "2024-01-15T10:30:00.000Z"
}'''
    
    create_code_slide(prs, "📄 Extracted Data Example", code_example)
    
    # Slide 13: Project Structure
    structure_data = [
        "📁 playwright-scraper/",
        "├── 📁 simple-extractor/          # Separated simple extractor",
        "│   ├── simple-product-extractor.ts",
        "│   ├── package.json",
        "│   └── README.md",
        "├── dynamic-extractor.ts          # Intelligent detection",
        "├── auto-playwright-extractor.ts  # Heuristic AI",
        "├── real-auto-playwright-extractor.ts # OpenAI integration",
        "├── selector-inspector.ts         # Browser inspect tool",
        "├── config.json                   # Schema configuration",
        "└── README.md                     # Complete documentation"
    ]
    create_content_slide(prs, "📁 Project Structure", structure_data)
    
    # Slide 14: Business Value
    create_content_slide(
        prs,
        "💼 Business Value",
        [
            "• Automated data collection from e-commerce sites",
            "• Structured product information in JSON format",
            "• Multi-language support (Czech, English, European currencies)",
            "• Ready for integration into larger data pipelines",
            "• Scalable to handle multiple products simultaneously",
            "• Cost-effective (free methods available)"
        ]
    )
    
    # Slide 15: When to Use Each Method
    usage_data = [
        "🎯 Best possible accuracy → OpenAI Auto-Playwright",
        "🏭 Standard e-commerce → Intelligent Detection",
        "🔀 Unusual layouts → OpenAI Auto-Playwright",
        "💰 No budget/API key → Heuristic AI → Inspect",
        "⚡ Production scraping → Intelligent Detection",
        "🆕 New/unknown sites → OpenAI Auto-Playwright",
        "📊 Complex data → OpenAI Auto-Playwright",
        "💸 Budget-conscious → Heuristic AI"
    ]
    create_content_slide(prs, "🎯 When to Use Each Method", usage_data)
    
    # Slide 16: Cost Considerations
    cost_data = [
        "💰 Cost Analysis:",
        "",
        "• Intelligent Detection: Free, Instant, Good accuracy",
        "• Heuristic AI: Free, Fast, Good accuracy",
        "• OpenAI Auto-Playwright: ~$0.01-0.05 per page, 2-5 seconds, Excellent accuracy",
        "• Browser Inspect: Free, Manual, Perfect accuracy"
    ]
    create_content_slide(prs, "💰 Cost Considerations", cost_data)
    
    # Slide 17: Next Steps
    create_content_slide(
        prs,
        "🔄 Next Steps",
        [
            "• Deploy to production environments",
            "• Add support for additional websites",
            "• Integrate with existing data systems",
            "• Scale to handle multiple products simultaneously",
            "• Customize selectors for specific sites",
            "• Set up automated monitoring and alerts"
        ]
    )
    
    # Slide 18: Conclusion
    create_content_slide(
        prs,
        "🎉 Conclusion",
        [
            "✅ Four-method approach gives maximum flexibility",
            "✅ From free quick extraction to premium AI-powered accuracy",
            "✅ Production-ready solution",
            "✅ Successfully extracts product data from any e-commerce site",
            "✅ Ready for immediate deployment",
            "✅ Scalable and maintainable architecture"
        ]
    )
    
    # Save the presentation
    output_file = "Playwright_Scraper_Presentation.pptx"
    prs.save(output_file)
    print(f"✅ Presentation created successfully: {output_file}")
    print(f"📁 Location: {os.path.abspath(output_file)}")

if __name__ == "__main__":
    main() 