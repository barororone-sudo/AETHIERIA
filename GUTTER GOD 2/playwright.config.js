import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir:   './tests',
  timeout:   45000,
  use: {
    baseURL:           'http://127.0.0.1:5173',
    headless:          false,   // visible pour voir ce qui se passe
    viewport:          { width: 1280, height: 720 },
    launchOptions:     { args: ['--use-gl=angle'] }, // WebGL dans Chromium
  },
  webServer: {
    command:   'npm run dev',
    url:       'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout:   45000,
  },
});
