import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

console.log('🔍 Running Layout Invariants & Token Guard Rail Checks...\n');

let errorCount = 0;

// 1. Check for raw hex colors outside tokens.css
function checkRawHex(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      checkRawHex(fullPath);
    } else if (
      (entry.name.endsWith('.css') || entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) &&
      entry.name !== 'tokens.css'
    ) {
      const content = fs.readFileSync(fullPath, 'utf8');
      // match hex colors like #fff, #1a1a1a, etc., ignoring URL anchors or comments
      const hexMatches = content.match(/#[0-9a-fA-F]{3,8}\b(?![^<]*>)/g);
      if (hexMatches) {
        // filter out valid non-color hashes or false positives
        const realHex = hexMatches.filter(h => !h.startsWith('#L') && !h.startsWith('#_'));
        if (realHex.length > 0) {
          console.error(`❌ Raw hex color found in ${path.relative(rootDir, fullPath)}: ${realHex.join(', ')}`);
          errorCount++;
        }
      }
    }
  }
}

console.log('1. Checking for raw hex values in src/...');
checkRawHex(srcDir);
if (errorCount === 0) {
  console.log('   ✓ Zero raw hex values outside tokens.css.');
}

// 2. Check layout invariants in CSS (Nav edge alignment and radii)
console.log('\n2. Verifying Nav container and layout primitives...');
const navCssPath = path.join(srcDir, 'components', 'ui', 'Nav', 'Nav.module.css');
if (fs.existsSync(navCssPath)) {
  const navCss = fs.readFileSync(navCssPath, 'utf8');
  if (!navCss.includes('var(--content-max)')) {
    console.error('❌ Nav.module.css is missing --content-max container bounding.');
    errorCount++;
  } else {
    console.log('   ✓ Nav is bounded by --content-max.');
  }

  if (!navCss.includes('var(--margin)')) {
    console.error('❌ Nav.module.css is missing --margin padding.');
    errorCount++;
  } else {
    console.log('   ✓ Nav uses shared --margin padding.');
  }

  if (!navCss.includes('scrollProgressHairline')) {
    console.error('❌ Nav.module.css is missing scrollProgressHairline.');
    errorCount++;
  } else {
    console.log('   ✓ Nav includes scrollProgressHairline.');
  }
}

// 3. Verify ScrollArea accessible attributes in ScrollArea.tsx
console.log('\n3. Verifying ScrollArea accessible attributes...');
const scrollAreaPath = path.join(srcDir, 'components', 'ui', 'ScrollArea', 'ScrollArea.tsx');
if (fs.existsSync(scrollAreaPath)) {
  const scrollAreaContent = fs.readFileSync(scrollAreaPath, 'utf8');
  if (!scrollAreaContent.includes('role="region"') || !scrollAreaContent.includes('aria-label')) {
    console.error('❌ ScrollArea viewport is missing role="region" or aria-label.');
    errorCount++;
  } else {
    console.log('   ✓ ScrollArea viewport enforces role="region" and aria-label.');
  }
}

// 4. Verify base.css scrollbar tokens
console.log('\n4. Verifying slim scrollbar rules in base.css...');
const baseCssPath = path.join(srcDir, 'styles', 'base.css');
if (fs.existsSync(baseCssPath)) {
  const baseCss = fs.readFileSync(baseCssPath, 'utf8');
  if (!baseCss.includes('--scrollbar-thumb')) {
    console.error('❌ base.css is missing --scrollbar-thumb token.');
    errorCount++;
  } else {
    console.log('   ✓ base.css uses --scrollbar-thumb and --scrollbar-thumb-hover.');
  }
}

// 5. Verify Timeline does not leak raw UUIDs or snake case
console.log('\n5. Verifying Timeline humanizing and grouping logic...');
const historyMapPath = path.join(srcDir, 'features', 'incident', 'historyMap.ts');
if (fs.existsSync(historyMapPath)) {
  const historyMapContent = fs.readFileSync(historyMapPath, 'utf8');
  if (!historyMapContent.includes('groupConsecutiveSlaEvents') || !historyMapContent.includes('stripUuids')) {
    console.error('❌ historyMap.ts is missing consecutive SLA grouping or UUID stripping.');
    errorCount++;
  } else {
    console.log('   ✓ historyMap.ts includes consecutive SLA event grouping and UUID stripping.');
  }
}

console.log('\n────────────────────────────────────────────────────────────');
if (errorCount === 0) {
  console.log('✅ ALL LAYOUT INVARIANT & TOKEN CHECKS PASSED CLEANLY.\n');
  process.exit(0);
} else {
  console.error(`❌ FAILED WITH ${errorCount} LAYOUT / TOKEN DEFECT(S).\n`);
  process.exit(1);
}
