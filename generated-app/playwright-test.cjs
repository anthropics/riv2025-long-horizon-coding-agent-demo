#!/usr/bin/env node
/**
 * playwright-test.cjs - Playwright helper for screenshot and console capture
 *
 * Usage:
 *   node playwright-test.cjs --url <URL> --test-id <ID> --output-dir <DIR> [--operation <OP>]
 *
 * Operations:
 *   full       - Both screenshot and console capture (default)
 *   screenshot - Take screenshot only
 *   console    - Capture console errors only
 *
 * Examples:
 *   node playwright-test.cjs --url http://localhost:6174 --test-id home-page --output-dir screenshots/issue-5 --operation full
 *   node playwright-test.cjs --url http://localhost:6174/settings --test-id settings-v1 --output-dir screenshots/issue-5
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    url: null,
    testId: null,
    outputDir: null,
    operation: 'full',
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
        config.url = args[++i];
        break;
      case '--test-id':
        config.testId = args[++i];
        break;
      case '--output-dir':
        config.outputDir = args[++i];
        break;
      case '--operation':
        config.operation = args[++i];
        break;
      case '--help':
        printHelp();
        process.exit(0);
    }
  }

  return config;
}

function printHelp() {
  console.log(`
playwright-test.cjs - Playwright helper for screenshot and console capture

Required arguments:
  --url <URL>          Target URL (e.g., http://localhost:6174 or http://localhost:6174/settings)
  --test-id <ID>       Test identifier for output filenames
  --output-dir <DIR>   Directory for output files

Optional arguments:
  --operation <OP>     Operation: full, screenshot, or console (default: full)
  --help               Show this help message

Output files:
  <output-dir>/<test-id>-<timestamp>.png   Screenshot
  <output-dir>/<test-id>-console.txt       Console output (NO_CONSOLE_ERRORS or ERRORS:...)
`);
}

function validate(config) {
  const errors = [];

  if (!config.url) errors.push('--url is required');
  if (!config.testId) errors.push('--test-id is required');
  if (!config.outputDir) errors.push('--output-dir is required');

  // Validate URL - only allow localhost
  if (config.url) {
    try {
      const url = new URL(config.url);
      if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
        errors.push('URL must be localhost or 127.0.0.1');
      }
    } catch {
      errors.push('Invalid URL format');
    }
  }

  // Validate output directory - prevent path traversal
  if (config.outputDir) {
    const normalized = path.normalize(config.outputDir);
    if (normalized.includes('..')) {
      errors.push('output-dir cannot contain path traversal (..)');
    }
  }

  // Validate operation
  const validOps = ['full', 'screenshot', 'console'];
  if (!validOps.includes(config.operation)) {
    errors.push(`operation must be one of: ${validOps.join(', ')}`);
  }

  if (errors.length > 0) {
    console.error('Validation errors:');
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
}

async function run() {
  const config = parseArgs();
  validate(config);

  // Ensure output directory exists
  fs.mkdirSync(config.outputDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];

  try {
    // Collect console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Navigate to page
    await page.goto(config.url);
    await page.waitForLoadState('networkidle');
    await new Promise((r) => setTimeout(r, 2000));

    // Handle screenshot
    if (config.operation === 'screenshot' || config.operation === 'full') {
      const timestamp = Date.now().toString().slice(-5);
      const screenshotPath = path.join(
        config.outputDir,
        `${config.testId}-${timestamp}.png`
      );
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Screenshot saved: ${screenshotPath}`);
    }

    // Handle console capture
    if (config.operation === 'console' || config.operation === 'full') {
      const consolePath = path.join(
        config.outputDir,
        `${config.testId}-console.txt`
      );
      const content =
        errors.length > 0
          ? 'ERRORS:\n' + errors.join('\n')
          : 'NO_CONSOLE_ERRORS';
      fs.writeFileSync(consolePath, content);
      console.log(`Console log saved: ${consolePath}`);

      if (errors.length > 0) {
        console.log(`\nConsole errors detected (${errors.length}):`);
        errors.forEach((e) => console.log(`  - ${e}`));
      } else {
        console.log('\nNo console errors detected.');
      }
    }
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
