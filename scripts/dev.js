// scripts/dev.js
const path = require('node:path');
const esbuild = require('esbuild');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const projectRoot = path.join(__dirname, '..');
const footballApiKey = process.env.FOOTBALL_DATA_API_KEY || "";
// Read QWEN_API_KEY from .env, but we will define it as process.env.API_KEY for the client
const geminiApiKeyFromEnv = process.env.QWEN_API_KEY || "";
const geminiApiKey2FromEnv = process.env.QWEN_API_KEY_2 || "";

// esbuild >= 0.17 removed the old two-argument esbuild.serve(). The build is
// now described by a context, and serving hangs off that context.
//
// splitting requires outdir (incompatible with a single outfile), so chunks
// are written to disk under projectRoot; serve() overlays servedir on top of
// that, so index.html can still request /index.js (and any chunk-*.js).
esbuild.context({
  entryPoints: [path.join(projectRoot, 'index.tsx')],
  bundle: true,
  outdir: projectRoot,
  splitting: true,
  platform: 'browser',
  format: 'esm',
  jsx: 'automatic',
  loader: { '.tsx': 'tsx', '.json': 'json' }, // Added .json loader
  define: {
    'process.env.NODE_ENV': '"development"',
    'process.env.FOOTBALL_DATA_API_KEY': JSON.stringify(footballApiKey),
    'process.env.API_KEY': JSON.stringify(geminiApiKeyFromEnv), // Define process.env.API_KEY for client
    'process.env.API_KEY_2': JSON.stringify(geminiApiKey2FromEnv)
  },
  external: ['react', 'react/*', 'react-dom/*', 'react-router-dom'],
  absWorkingDir: projectRoot, // Set working directory to project root
  sourcemap: 'inline', // Good for development
}).then(async (ctx) => {
  const { host, port } = await ctx.serve({
    servedir: projectRoot, // Serve files from the project root
    port: 8000,
    host: '127.0.0.1',
    // Single-page app: the router owns paths like /season, but the browser asks
    // the server for them on a reload or a pasted link, and there is no file by
    // that name. Handing back index.html lets the router take over, which is
    // what firebase.json's "**" -> /index.html rewrite does in production.
    fallback: path.join(projectRoot, 'index.html'),
  });
  // esbuild rebuilds on each incoming request, so edits are picked up on reload.
  //
  // Advertise localhost, not the bound IP: Firebase Auth ships "localhost" in
  // its authorized-domains list but not "127.0.0.1", so opening the app by IP
  // fails Google sign-in with auth/unauthorized-domain.
  console.log(`Development server is live at http://localhost:${port}`);
  console.log(`(also bound at http://${host}:${port} - use localhost for Google sign-in)`);
  console.log('Watching for changes... Press Ctrl+C to stop.');
}).catch((err) => {
  console.error('Failed to start development server:');
  console.error(err);
  process.exit(1);
});