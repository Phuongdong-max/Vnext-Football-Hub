
// scripts/build.js
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Ensure dist directory exists and is clean
const projectRoot = path.join(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

try {
  fs.rmSync(distDir, { recursive: true, force: true });
} catch (e) { /* ignore if dir doesn't exist */ }
fs.mkdirSync(distDir, { recursive: true });

// Copy index.html
fs.copyFileSync(
  path.join(projectRoot, 'index.html'),
  path.join(distDir, 'index.html')
);

// esbuild build configuration
const footballApiKey = process.env.FOOTBALL_DATA_API_KEY || "";
const geminiApiKey = process.env.GEMINI_API_KEY || ""; // Added Gemini API Key

esbuild.build({
  entryPoints: [path.join(projectRoot, 'index.tsx')],
  bundle: true,
  outfile: path.join(distDir, 'index.js'),
  platform: 'browser',
  format: 'esm',
  jsx: 'automatic',
  loader: { '.tsx': 'tsx' },
  define: {
    'process.env.NODE_ENV': '"production"',
    // Crucial: JSON.stringify ensures the API key becomes a valid JavaScript string literal
    'process.env.FOOTBALL_DATA_API_KEY': JSON.stringify(footballApiKey),
    'process.env.GEMINI_API_KEY': JSON.stringify(geminiApiKey) // Added Gemini API Key
  },
  external: ['react', 'react/*', 'react-dom/*', 'react-router-dom'],
  absWorkingDir: projectRoot // Set working directory to project root
}).then(() => {
  console.log('Build successful! Output in ./dist directory.');
}).catch((err) => {
  console.error('Build failed:');
  // esbuild errors are usually quite descriptive.
  // err object might have 'errors' and 'warnings' arrays.
  process.exit(1);
});
