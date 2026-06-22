#!/usr/bin/env node
// Build script for Render deployment
// Installs dependencies and builds the client

const { execSync } = require('child_process');
const path = require('path');

const ROOT = __dirname;

function run(cmd, cwd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd: cwd || ROOT, stdio: 'inherit' });
}

console.log('=== Installing server dependencies ===');
run('npm install --omit=dev', path.join(ROOT, 'server'));

console.log('\n=== Installing client dependencies ===');
run('npm install --include=dev', path.join(ROOT, 'client'));

console.log('\n=== Building client ===');
run('npx vite build', path.join(ROOT, 'client'));

console.log('\n=== Build complete! ===');
console.log('  Client: client/dist/');
