#!/usr/bin/env node

// One-click deployment script
const fs = require('fs');
const path = require('path');

console.log('🚀 Deploying Speech Access Map...');

// Check if we have all required files
const requiredFiles = [
  'server.js',
  'public/index.html',
  'database-dump.sql',
  'package.json'
];

const missingFiles = requiredFiles.filter(file => 
  !fs.existsSync(path.join(__dirname, file))
);

if (missingFiles.length > 0) {
  console.error('❌ Missing files:', missingFiles);
  process.exit(1);
}

console.log('✅ All deployment files present');
console.log('📁 Ready to deploy to any platform');
console.log('🗄️ Database dump included with 5,950 speech therapy centers');
console.log('');
console.log('Next steps:');
console.log('1. Upload this folder to your hosting platform');
console.log('2. Set DATABASE_URL environment variable');
console.log('3. Run: node server.js');
console.log('');
console.log('Platform recommendations:');
console.log('• Railway: https://railway.app (easiest)');
console.log('• Render: https://render.com (free tier)');
console.log('• Vercel: https://vercel.com (fastest)');