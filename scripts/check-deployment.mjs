import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootFiles = new Set(['index.html', 'manifest.webmanifest', 'sw.js', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png']);
export async function checkDeployment(root) {
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      const relative = path.relative(root, file).split(path.sep).join('/');
      if (entry.isSymbolicLink()) throw new Error(`Symbolic link in deployment: ${relative}`);
      if (entry.isDirectory()) { await visit(file); continue; }
      const allowed = rootFiles.has(relative) || /^workbox-[\w-]+\.js$/.test(relative) || /^assets\/[\w.-]+\.(js|css)$/.test(relative);
      if (!entry.isFile() || !allowed) throw new Error(`Unapproved file in deployment: ${relative}. Only the app shell, compiled assets, and three app icons may be published.`);
      if (/\.(html|js|css|webmanifest)$/.test(file)) {
        const text = await readFile(file, 'utf8');
        if (/data:image\/jpeg|P00[1-4]\.jpg|FICTIONAL TEST PERSON\./i.test(text)) throw new Error(`Imported study content found in deployment: ${relative}`);
      }
    }
  }
  await visit(root);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await checkDeployment(path.resolve('dist'));
  console.log('Deployment privacy check passed: only approved app files and icons are present.');
}
