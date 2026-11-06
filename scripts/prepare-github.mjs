import { readFile, writeFile, mkdir, readdir, lstat, rename } from 'node:fs/promises';
import path from 'node:path';
import { zipSync } from 'fflate';

// Intentionally explicit. Never recursively package the working directory:
// it may contain private fixtures, browser screenshots, or local exports.
const files = [
  '.gitignore', '.github/workflows/deploy.yml',
  'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig.json',
  'vite.config.ts', 'playwright.config.ts', 'index.html',
  'README.md', 'TEST_REPORT.md', 'DEPLOY_GITHUB_PAGES.md',
  'src/App.tsx', 'src/main.tsx', 'src/style.css', 'src/model.ts', 'src/db.ts',
  'src/importer.ts', 'src/workbook.ts', 'src/quiz.ts',
  'scripts/check-deployment.mjs', 'scripts/create-private-pack.mjs', 'scripts/prepare-github.mjs',
  'tests/core.test.ts', 'tests/deployment.test.mjs', 'tests/offline.e2e.ts', 'tests/update.e2e.ts',
  'public/icon-192.png', 'public/icon-512.png', 'public/apple-touch-icon.png',
];
const source = process.cwd();
const output = path.resolve('..', 'District_Study_Deck_GitHub_Upload');
const archive = path.resolve('..', 'District_Study_Deck_v0.1_Source.zip');
const allowed = new Set(files);
async function checkExisting(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    const relative = path.relative(output, file).split(path.sep).join('/');
    if (entry.isSymbolicLink()) throw new Error(`Unexpected link in upload folder: ${relative}`);
    if (entry.isDirectory()) {
      if (!files.some(f => f.startsWith(`${relative}/`))) throw new Error(`Unexpected directory in upload folder: ${relative}`);
      await checkExisting(file);
    } else if (!entry.isFile() || !allowed.has(relative)) throw new Error(`Unexpected file in upload folder: ${relative}. Use a separate clean folder.`);
  }
}
await mkdir(output, { recursive: true });
await checkExisting(output);
const entries = {};
for (const relative of files) {
  const filename = path.join(source, relative);
  if (!(await lstat(filename)).isFile()) throw new Error(`Source must be a regular file: ${relative}`);
  const bytes = new Uint8Array(await readFile(filename));
  entries[`district-study-deck/${relative}`] = bytes;
  const target = path.join(output, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
}
await writeFile(`${archive}.tmp`, zipSync(entries));
await rename(`${archive}.tmp`, archive);
console.log(`Prepared ${files.length} approved source files. No workbook, private ZIP, portraits, progress, or test screenshots were copied.`);
console.log(`Upload the CONTENTS of: ${output}`);
console.log(`Clean source archive: ${archive}`);
