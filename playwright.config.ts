import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:55281',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: [
    {
      command:
        'dotnet run --project src/BookACall.Api/BookACall.Api.csproj --urls http://localhost:5105',
      url: 'http://localhost:5105/swagger',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1',
      cwd: 'src/bookacall.client',
      url: 'http://localhost:55281',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
