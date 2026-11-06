import { defineConfig, devices } from '@playwright/test';
const testPort = Number(process.env.TEST_PORT || '4175');
if (!Number.isInteger(testPort) || testPort < 1024 || testPort > 65535) throw new Error('TEST_PORT must be a valid port number.');
const localURL = `http://127.0.0.1:${testPort}${process.env.TEST_BASE_PATH || '/'}`;
export default defineConfig({
  testDir: './tests', testMatch: '**/*.e2e.ts', fullyParallel: false, workers: 1,
  timeout: 90_000,
  use: { baseURL: process.env.LIVE_URL || localURL, serviceWorkers: 'allow', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {} } }],
  webServer: process.env.LIVE_URL ? undefined : {
    command: `node node_modules/vite/bin/vite.js preview --port ${testPort} --strictPort`,
    url: localURL,
    env: { BASE_PATH: process.env.TEST_BASE_PATH || '/' },
    reuseExistingServer: false,
  },
});
