import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './tests/live', timeout: 30000, retries: 0,
  use: { baseURL: 'http://127.0.0.1:3000', trace: 'retain-on-failure', ...devices['Desktop Chrome'] },
  webServer: { command: 'npm run dev:live', url: 'http://127.0.0.1:3000', reuseExistingServer: false },
})
