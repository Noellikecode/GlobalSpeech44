import { spawn } from 'child_process';

console.log('🚀 Starting Speech Access Map...');

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.log('💡 This should be automatically set by your hosting platform');
  process.exit(1);
}

console.log('✅ DATABASE_URL configured');
console.log('🗄️ Importing database if needed...');

// Start the server
const server = spawn('node', ['server.js'], {
  stdio: 'inherit',
  env: process.env
});

server.on('error', (error) => {
  console.error('❌ Server failed to start:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`🛑 Server exited with code ${code}`);
  process.exit(code);
});