import { it, expect } from 'vitest';
import { mkdtemp, writeFile, mkdir, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkDeployment } from '../scripts/check-deployment.mjs';

it('accepts app files and rejects private data, unexpected assets, and symbolic links', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'study-deploy-'));
  try {
    await mkdir(path.join(root, 'assets'));
    await writeFile(path.join(root, 'index.html'), '<html>App shell</html>');
    await writeFile(path.join(root, 'assets', 'index-123.js'), 'console.log("app")');
    await writeFile(path.join(root, 'icon-192.png'), 'icon fixture');
    await expect(checkDeployment(root)).resolves.toBeUndefined();
    for (const filename of ['database.xlsx', 'portrait.jpg', 'progress.json', 'personal-notes.txt', 'backup.sqlite', 'another-image.png']) {
      await writeFile(path.join(root, filename), 'private fixture');
      await expect(checkDeployment(root)).rejects.toThrow('Unapproved file');
      await rm(path.join(root, filename));
    }
    await writeFile(path.join(root, 'assets', 'index-123.js'), 'const portrait = "data:image/jpeg;base64,fixture"');
    await expect(checkDeployment(root)).rejects.toThrow('Imported study content');
    await writeFile(path.join(root, 'assets', 'index-123.js'), 'console.log("app")');
    await symlink(path.join(root, 'index.html'), path.join(root, 'sw.js'));
    await expect(checkDeployment(root)).rejects.toThrow('Symbolic link');
  } finally { await rm(root, { recursive: true, force: true }); }
});
