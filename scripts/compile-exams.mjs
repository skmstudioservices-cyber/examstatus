import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const itemsDir = path.join(rootDir, 'src', 'data', 'items');
const targetFile = path.join(rootDir, 'src', 'data', 'exams.json');

// Read existing original exams
const originalExams = JSON.parse(fs.readFileSync(targetFile, 'utf8'));

const allExams = [];
const seenSlugs = new Set();

// Add original exams first
for (const ex of originalExams) {
  if (!seenSlugs.has(ex.slug)) {
    seenSlugs.add(ex.slug);
    allExams.push(ex);
  }
}

// Read all item files in src/data/items/
const files = fs.readdirSync(itemsDir).filter(f => f.endsWith('.json'));

for (const file of files) {
  const filePath = path.join(itemsDir, file);
  const items = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  for (const item of items) {
    if (!seenSlugs.has(item.slug)) {
      seenSlugs.add(item.slug);
      allExams.push(item);
    } else {
      console.warn(`[compile-exams] duplicate slug skipped: ${item.slug}`);
    }
  }
}

// Validation
for (const ex of allExams) {
  if (!ex.slug || !ex.title || !ex.category || !ex.officialUrl) {
    throw new Error(`Invalid exam entry: ${JSON.stringify(ex)}`);
  }
}

// Write back to src/data/exams.json
fs.writeFileSync(targetFile, JSON.stringify(allExams, null, 2), 'utf8');

const breakdown = {};
for (const ex of allExams) {
  breakdown[ex.category] = (breakdown[ex.category] || 0) + 1;
}

console.log('----------------------------------------------------');
console.log(`[compile-exams] SUCCESSFULLY COMPILED ${allExams.length} TOTAL EXAMS!`);
console.log('Category breakdown:');
for (const [cat, count] of Object.entries(breakdown)) {
  console.log(`  - ${cat.padEnd(16)}: ${count} exams`);
}
console.log('----------------------------------------------------');
