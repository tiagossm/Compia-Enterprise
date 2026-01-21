import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

/**
 * Authentication Setup
 * Este arquivo configura a autenticação para os testes E2E.
 * Você precisa definir as variáveis de ambiente:
 * - PLAYWRIGHT_TEST_EMAIL
 * - PLAYWRIGHT_TEST_PASSWORD
 */
setup('authenticate', async ({ page }) => {
    const email = process.env.PLAYWRIGHT_TEST_EMAIL || 'test@compia.tech';
    const password = process.env.PLAYWRIGHT_TEST_PASSWORD || 'testpassword123';

    // Navegar para página de login
    await page.goto('/login');

    // Preencher formulário de login
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Senha').fill(password);

    // Submeter
    await page.getByRole('button', { name: /entrar/i }).click();

    // Aguardar redirecionamento para dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Verificar que está logado
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

    // Salvar estado de autenticação
    await page.context().storageState({ path: authFile });
});
