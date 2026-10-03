import { afterEach, describe, expect, it } from 'vitest';
import { Setting } from 'obsidian';
import { SettingsService } from '../../src/app/services/SettingsService';
import { tokenImportSettingsSection } from '../../src/app/settings/tokenImportSettingsSection';

async function renderSection(): Promise<{ settings: SettingsService; toggle: HTMLElement }> {
  const files = new Map<string, string>();
  const app = { vault: { adapter: {
    exists: async (path: string) => files.has(path), mkdir: async () => {},
    read: async (path: string) => files.get(path)!, write: async (path: string, data: string) => { files.set(path, data); },
  } } } as never;
  const settings = new SettingsService(app);
  await settings.initialize();
  const container = document.body.createDiv();
  for (const { name, desc, render } of tokenImportSettingsSection(settings).rows) {
    const setting = new Setting(container).setName(name);
    if (desc) setting.setDesc(desc);
    render(setting);
  }
  return { settings, toggle: container.querySelector<HTMLElement>('.setting-item-control div')! };
}

afterEach(() => { document.body.empty(); });

describe('token import settings', () => {
  it('keeps transparent borders by default and follows the setting when it changes elsewhere', async () => {
    const { settings, toggle } = await renderSection();
    expect(settings.getSetting('trimTokenPadding')).toBe(false);
    expect(toggle.classList.contains('is-enabled')).toBe(false);
    settings.setSetting('trimTokenPadding', true);
    expect(toggle.classList.contains('is-enabled')).toBe(true);
  });
});
