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

// Copy logo and mascot assets
const assetsToCopy = [
    'VFLogo-fix.png', 
    'VFLogo-GIF-fix.gif',
    'flaming-ball.png',
    'tiger.png',
    'turtle.png',
    'phoenix.png',
    'dragon.png',
    'stadium-bg.jpg',
    'vnext.png',
    'dang-cai-logo.png',
    'location.png',
    'thank_you_card.png'
];
assetsToCopy.forEach(asset => {
        const sourcePath = path.join(projectRoot, 'assets', asset);
    const destDir = path.join(distDir, 'assets');
    const destPath = path.join(destDir, asset); // Write to new name
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`Copied ${asset} to dist/assets.`);
    } else {
        // Fallback for case where file was already renamed
        const alreadyRenamedSourcePath = path.join(projectRoot, 'assets', asset);
        if(fs.existsSync(alreadyRenamedSourcePath)) {
            fs.copyFileSync(alreadyRenamedSourcePath, destPath);
            console.log(`Copied already renamed ${asset} to dist/assets.`);
        } else {
            console.warn(`Warning: Asset ${asset} not found in assets/. Skipping copy.`);
        }
    }
});

// Copy the VNEXT brand assets (logo variants + favicons) as a whole folder
const vnextSrcDir = path.join(projectRoot, 'assets', 'vnext');
const vnextDestDir = path.join(distDir, 'assets', 'vnext');
if (fs.existsSync(vnextSrcDir)) {
    fs.mkdirSync(vnextDestDir, { recursive: true });
    fs.readdirSync(vnextSrcDir).forEach((file) => {
        fs.copyFileSync(path.join(vnextSrcDir, file), path.join(vnextDestDir, file));
    });
    console.log('Copied VNEXT brand assets to dist/assets/vnext.');
} else {
    console.warn('Warning: assets/vnext not found. Logo and favicon will be missing.');
}

// esbuild build configuration
const footballApiKey = process.env.FOOTBALL_DATA_API_KEY || "";
// Read QWEN_API_KEY from .env, but we will define it as process.env.API_KEY for the client
const geminiApiKeyFromEnv = process.env.QWEN_API_KEY || "";
const geminiApiKey2FromEnv = process.env.QWEN_API_KEY_2 || "";

esbuild.build({
  entryPoints: [path.join(projectRoot, 'index.tsx')],
  
  bundle: true,
  outfile: path.join(distDir, 'index.js'),
  platform: 'browser',
  format: 'esm',
  jsx: 'automatic',
  loader: { '.tsx': 'tsx', '.json': 'json' }, // Added .json loader
  define: {
    'process.env.NODE_ENV': '"production"',
    // Crucial: JSON.stringify ensures the API key becomes a valid JavaScript string literal
    'process.env.FOOTBALL_DATA_API_KEY': JSON.stringify(footballApiKey),
    'process.env.API_KEY': JSON.stringify(geminiApiKeyFromEnv), // Define process.env.API_KEY for client
    'process.env.API_KEY_2': JSON.stringify(geminiApiKey2FromEnv)
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