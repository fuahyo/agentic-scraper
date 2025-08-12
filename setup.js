const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Enhanced Agentic Web Scraper...\n');

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.log('📝 Creating .env file...');
  const envContent = `# OpenAI API Key (required for AI analysis)
OPENAI_API_KEY=your-openai-api-key-here

# Server Configuration
PORT=3000

# Optional: Custom browser path (if needed)
# BROWSER_PATH=/path/to/chrome
`;
  fs.writeFileSync('.env', envContent);
  console.log('✅ .env file created. Please add your OpenAI API key.\n');
} else {
  console.log('✅ .env file already exists.\n');
}

// Install dependencies
console.log('📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully.\n');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Install Playwright browsers
console.log('🌐 Installing Playwright browsers...');
try {
  execSync('npx playwright install chromium', { stdio: 'inherit' });
  console.log('✅ Playwright browsers installed successfully.\n');
} catch (error) {
  console.error('❌ Failed to install Playwright browsers:', error.message);
  console.log('💡 You can try running: npx playwright install chromium\n');
}

console.log('🎉 Setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Add your OpenAI API key to the .env file');
console.log('2. Run: npm start');
console.log('3. Open http://localhost:3000 in your browser');
console.log('\n🔧 For troubleshooting:');
console.log('- Make sure you have Node.js 16+ installed');
console.log('- Check that your OpenAI API key is valid');
console.log('- Ensure you have sufficient disk space for browsers'); 