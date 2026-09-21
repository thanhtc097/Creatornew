import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

function walk(dir) {
  let results = [];
  for (const item of readdirSync(dir)) {
    if (item === 'node_modules' || item === '.git' || item === 'dist' || item === 'free-sounds-dist' || item === 'free-videos-dist') continue;
    const full = join(dir, item);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (item.endsWith('.html') || item.endsWith('.jsx') || item.endsWith('.webmanifest')) {
      results.push(full);
    }
  }
  return results;
}

const files = walk(root);
let modifiedCount = 0;

for (const file of files) {
  let content = readFileSync(file, 'utf8');
  let original = content;

  // Replace logo and icon references with ?v=2 (avoiding ?v=2?v=2)
  content = content.replace(/creatornew-logo\.webp(?!\?v=\d+)/g, 'creatornew-logo.webp?v=2');
  content = content.replace(/creatornew-logo\.png(?!\?v=\d+)/g, 'creatornew-logo.png?v=2');
  content = content.replace(/creatornew-icon\.png(?!\?v=\d+)/g, 'creatornew-icon.png?v=2');

  if (content !== original) {
    writeFileSync(file, content, 'utf8');
    modifiedCount++;
  }
}

console.log(`Updated cache-busting in ${modifiedCount} files.`);
