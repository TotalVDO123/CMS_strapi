import { test, expect } from '@playwright/test';
import { describeOnCondition, navToHeader } from '../../utils/shared';
import { resetDatabaseAndImportDataFromPath } from '../../scripts/dts-import';
import { login } from '../../utils/login';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

describeOnCondition(edition === 'EE')('Releases page', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('A user should be able to create a release without scheduling it and view their pending and done releases', async ({
    page,
  }) => {
    // Navigate to the releases page
    await page.getByRole('link', { name: 'Releases' }).click();

    await expect(page.getByRole('link', { name: `Trent Crimm: The Independent` })).toBeVisible();

    // Open the 'Done' tab panel
    await page.getByRole('tab', { name: 'Done' }).click();
    await expect(page.getByRole('link', { name: `Nate: A wonder kid` })).toBeVisible();

    // Open the create release dialog
    await page.getByRole('button', { name: 'New release' }).click();
    await expect(page.getByRole('dialog', { name: 'New release' })).toBeVisible();

    // Create a release
    const newReleaseName = 'The Diamond Dogs';
    await page.getByRole('textbox', { name: 'Name' }).fill(newReleaseName);
    // Uncheck default scheduling of a release and save
    await page.getByRole('checkbox', { name: 'Schedule release' }).uncheck();
    await page.getByRole('button', { name: 'Continue' }).click();
    // Wait for client side redirect to created release
    await page.waitForURL('/admin/plugins/content-releases/*');
    await expect(page.getByRole('heading', { name: newReleaseName })).toBeVisible();

    // Navigate back to the release page to see the newly created release
    await page.getByRole('link', { name: 'Releases' }).click();
    await expect(page.getByRole('link', { name: `${newReleaseName}` })).toBeVisible();
  });

  test('A user should be able to create a release with scheduling info and view their pending and done releases', async ({
    page,
  }) => {
    // Navigate to the releases page
    await page.getByRole('link', { name: 'Releases' }).click();

    // Open the create release dialog
    await page.getByRole('button', { name: 'New release' }).click();
    await expect(page.getByRole('dialog', { name: 'New release' })).toBeVisible();

    // Create a release
    const newReleaseName = 'The Diamond Dogs';
    await page.getByRole('textbox', { name: 'Name' }).fill(newReleaseName);

    // Select valid date and time
    await page
      .getByRole('combobox', {
        name: 'Date',
      })
      .click();

    const date = new Date();
    date.setDate(date.getDate() + 1);
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    await page.getByRole('gridcell', { name: formattedDate }).click();

    await page
      .getByRole('combobox', {
        name: 'Time *',
      })
      .click();

    await page.getByRole('option', { name: '14:00' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    // Wait for client side redirect to created release
    await page.waitForURL('/admin/plugins/content-releases/*');
    await expect(page.getByRole('heading', { name: newReleaseName })).toBeVisible();

    // Navigate back to the release page to see the newly created release
    await page.getByRole('link', { name: 'Releases' }).click();
    await expect(page.getByRole('link', { name: `${newReleaseName}` })).toBeVisible();
  });

  test.skip('A user should be able to perform bulk release on entries', async ({ page }) => {
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');

    const publishedItems = page.getByRole('gridcell', { name: 'published' });
    expect(publishedItems).toHaveCount(2);
    const checkbox = page.getByRole('checkbox', { name: 'Select all entries' });

    // Select all entries to release
    await checkbox.check();
    const addToRelease = page.getByRole('button', { name: 'add to release' });
    await addToRelease.click();

    // Wait for the add to release dialog to appear
    await page
      .getByRole('combobox', {
        name: 'Select a release',
      })
      .click();

    await page.getByRole('option', { name: 'Trent Crimm: The Independent' }).click();
    const unpublishButton = page.getByText('unpublish', { exact: true });
    await unpublishButton.click();
    await page.getByText('continue').click();
    await page.getByText(/Successfully added to release./).waitFor({
      state: 'visible',
      timeout: 5000,
    });
  });
});
