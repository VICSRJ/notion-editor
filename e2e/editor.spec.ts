import { test, expect } from '@playwright/test'

const sizes = [375, 430, 768, 1024, 1440]

test.describe('responsive editor', () => {
  for (const width of sizes) {
    test(`renders without horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 700 ? 844 : 900 })
      await page.goto('/')
      await expect(page.locator('[data-editor="notion-editor"]')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth))
    })
  }

  test('customization changes the actual editor style', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Nastavení editoru' }).click()
    await expect(page.getByRole('dialog', { name: 'Nastavení editoru' })).toBeVisible()
    const range = page.locator("input[type='range']")
    await range.fill('20')
    const fontSize = await page.locator('.ProseMirror').evaluate((el) => getComputedStyle(el).fontSize)
    expect(fontSize).toBe('20px')
    await page.getByRole('button', { name: 'Široká' }).click()
    expect(await page.locator('.editor-shell').evaluate((el) => getComputedStyle(el).width)).not.toBe('980px')
  })

  test('keyboard search opens and Escape closes it', async ({ page }) => {
    await page.goto('/')
    await page.locator('.ProseMirror').click()
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K')
    await expect(page.getByRole('dialog', { name: 'Hledat na webu' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Hledat na webu' })).toBeHidden()
  })

  test('right click opens the custom block menu', async ({ page }) => {
    await page.goto('/')
    await page.locator('.ProseMirror').locator('p').first().click({ button: 'right' })
    await expect(page.getByRole('menu', { name: 'Nabídka bloku' })).toBeVisible()
  })
})
