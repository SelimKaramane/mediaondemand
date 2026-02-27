const { test, expect } = require('@playwright/test')

test('homepage renders', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Votre médiathèque')).toBeVisible()
})
