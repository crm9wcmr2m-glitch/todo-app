const { test, expect } = require('@playwright/test');

const URL = 'https://crm9wcmr2m-glitch.github.io/todo-app/';
const EMAIL = 'osahim@hotmail.com';
const PASSWORD = 'test123456'; // kayıt sırasında kullandığınız şifre

test.describe('Auth', () => {
  test('giriş ekranı açılır', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('[data-view="login"].active')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Hoş Geldiniz');
  });

  test('boş form hata gösterir', async ({ page }) => {
    await page.goto(URL);
    await page.click('[data-view="login"] .btn-primary');
    await expect(page.locator('#login-msg')).toContainText('zorunludur');
  });

  test('yanlış şifre hata gösterir', async ({ page }) => {
    await page.goto(URL);
    await page.fill('#login-email', EMAIL);
    await page.fill('#login-password', 'yanlisSifre');
    await page.click('[data-view="login"] .btn-primary');
    await expect(page.locator('#login-msg')).toContainText('hatalı', { timeout: 8000 });
  });

  test('kayıt ekranına geçiş', async ({ page }) => {
    await page.goto(URL);
    await page.click('[data-view="login"] .switch-link a');
    await expect(page.locator('[data-view="register"].active')).toBeVisible();
  });
});

test.describe('Todo Uygulaması', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
    await page.fill('#login-email', EMAIL);
    await page.fill('#login-password', PASSWORD);
    await page.click('[data-view="login"] .btn-primary');
    await expect(page.locator('[data-view="app"].active')).toBeVisible({ timeout: 10000 });
  });

  test('görev ekler', async ({ page }) => {
    const gorev = 'Test görevi ' + Date.now();
    await page.fill('#todo-input', gorev);
    await page.click('.input-row button');
    await expect(page.locator(`#todo-list span:has-text("${gorev}")`)).toBeVisible({ timeout: 6000 });
  });

  test('Enter ile görev ekler', async ({ page }) => {
    const gorev = 'Enter testi ' + Date.now();
    await page.fill('#todo-input', gorev);
    await page.press('#todo-input', 'Enter');
    await expect(page.locator(`#todo-list span:has-text("${gorev}")`)).toBeVisible({ timeout: 6000 });
  });

  test('görevi tamamlar', async ({ page }) => {
    const gorev = 'Tamamlanacak ' + Date.now();
    await page.fill('#todo-input', gorev);
    await page.press('#todo-input', 'Enter');
    const li = page.locator(`li:has(span:has-text("${gorev}"))`);
    await li.locator('input[type="checkbox"]').click();
    await expect(li).toHaveClass(/done/, { timeout: 6000 });
  });

  test('görevi siler', async ({ page }) => {
    const gorev = 'Silinecek ' + Date.now();
    await page.fill('#todo-input', gorev);
    await page.press('#todo-input', 'Enter');
    const li = page.locator(`li:has(span:has-text("${gorev}"))`);
    await li.locator('.delete-btn').click();
    await expect(page.locator(`#todo-list span:has-text("${gorev}")`)).toHaveCount(0, { timeout: 6000 });
  });

  test('görevi düzenler', async ({ page }) => {
    const gorev = 'Düzenlenecek ' + Date.now();
    await page.fill('#todo-input', gorev);
    await page.press('#todo-input', 'Enter');
    const li = page.locator(`li:has(span:has-text("${gorev}"))`);
    await li.locator('.edit-btn').click();
    await page.fill(`#edit-${await li.getAttribute('data-id')}`, 'Düzenlendi');
    await li.locator('.save-btn').click();
    await expect(page.locator('#todo-list span:has-text("Düzenlendi")')).toBeVisible({ timeout: 6000 });
  });

  test('filtre çalışır', async ({ page }) => {
    await page.click('.filters button:has-text("Bekleyen")');
    await expect(page.locator('.filters button.active')).toContainText('Bekleyen');
  });

  test('çıkış yapar', async ({ page }) => {
    await page.click('.logout-btn');
    await expect(page.locator('[data-view="login"].active')).toBeVisible();
  });
});
