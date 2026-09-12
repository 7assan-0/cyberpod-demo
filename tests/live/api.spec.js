import { test, expect } from '@playwright/test'

test('desktop renews its short-lived grant and releases it when paused', async ({ page }) => {
  let grants = 0
  await page.route('**/api/v1/sessions/*/access', (route) => route.fulfill({
    json: { browser_url: `/desktop/probe/?grant=${++grants}`, expires_at: new Date(Date.now() + 1500).toISOString() },
  }))
  await page.route('**/desktop/probe/**', (route) => route.fulfill({ contentType: 'text/html', body: '<p>Desktop connection probe</p>' }))
  await page.goto('/')
  await page.getByLabel('Username', { exact: true }).fill('demo@cyberpod.local')
  await page.getByLabel('Password', { exact: true }).fill('CyberPodDemo123!')
  await page.getByRole('button', { name: 'Unlock' }).click()
  await page.getByRole('button', { name: 'Start Hydra Lab', exact: true }).click()
  await expect(page.frameLocator('iframe').getByText('Desktop connection probe')).toBeVisible()
  await expect.poll(() => grants).toBeGreaterThan(1)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(page.locator('iframe')).toHaveCount(0)
  await page.getByRole('button', { name: 'End lab', exact: true }).click()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
})

test('browser uses the real student API across refresh and lifecycle changes', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await page.getByLabel('Username', { exact: true }).fill('demo@cyberpod.local')
  await page.getByLabel('Password', { exact: true }).fill('CyberPodDemo123!')
  await page.getByRole('button', { name: 'Unlock' }).click()
  await page.getByRole('button', { name: 'Start Hydra Lab', exact: true }).click()
  await expect(page.locator('main')).toContainText('RUNNING')
  await expect(page.locator('main')).toContainText('API simulation')
  await page.getByLabel('Flag', { exact: true }).fill('wrong')
  await page.getByRole('button', { name: 'Submit flag', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('INCORRECT')
  await page.reload()
  await expect(page.locator('main')).toContainText('RUNNING')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(page.locator('main')).toContainText('STOPPED')
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  await expect(page.locator('main')).toContainText('RUNNING')
  await page.getByRole('button', { name: 'Restart lab', exact: true }).click()
  await expect(page.locator('main')).toContainText('Score 0/100')
  await page.getByRole('button', { name: 'End lab', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Labs', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Unlock' })).toBeVisible()
  expect(errors).toEqual([])
})
