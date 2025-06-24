
// scripts/dev.js
const path = require('node:path');
const esbuild = require('esbuild');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const projectRoot = path.join(__dirname, '..');
const footballApiKey = process.env.FOOTBALL_DATA_API_KEY || "";
const geminiApiKey = process.env.GEMINI_API_KEY || ""; // Added Gemini API Key

esbuild.serve({
  servedir: projectRoot, // Serve files from the project root
  port: 8000,
  // host: '127.0.0.1', // Optional: specify host
}, {
  entryPoints: [path.join(projectRoot, 'index.tsx')],
  bundle: true,
  outfile: path.join(projectRoot, 'index.js'), // Output to root for servedir='.'
  platform: 'browser',
  format: 'esm',
  jsx: 'automatic',
  loader: { '.tsx': 'tsx' },
  define: {
    'process.env.NODE_ENV': '"development"',
    'process.env.FOOTBALL_DATA_API_KEY': JSON.stringify(footballApiKey),
    'process.env.GEMINI_API_KEY': JSON.stringify(geminiApiKey) // Added Gemini API Key
  },
  external: ['react', 'react/*', 'react-dom/*', 'react-router-dom'],
  absWorkingDir: projectRoot, // Set working directory to project root
  // sourcemap: 'inline', // Good for development
}).then(result => {
  const { host, port } = result;
  console.log(`Development server is live at http://${host}:${port}`);
  console.log('Watching for changes... Press Ctrl+C to stop.');
  // Keep the process alive. result.stop() can be used to stop the server.
}).catch((err) => {
  console.error('Failed to start development server:');
  process.exit(1);
});
