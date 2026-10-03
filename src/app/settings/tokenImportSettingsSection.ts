import type { SettingsService } from '../services/SettingsService';
import type { AtlasSettingSection } from './settingSections';

/** How images become tokens. */
export function tokenImportSettingsSection(settings: SettingsService): AtlasSettingSection {
  return {
    heading: 'Token import',
    rows: [{
      name: 'Trim transparent borders',
      desc: 'Tokens without the Atlas ring are created without the transparent space around their art, so art padded for another VTT fills its square. Turn off for art drawn small on purpose.',
      aliases: ['padding', 'margin', 'crop', 'transparent', 'foundry', 'ring', 'token size'],
      render: (setting) => {
        let unsubscribe: (() => void) | undefined;
        setting.addToggle((toggle) => {
          toggle.setValue(settings.getSetting('trimTokenPadding'))
            .onChange((enabled) => {
              if (settings.getSetting('trimTokenPadding') !== enabled) settings.setSetting('trimTokenPadding', enabled);
            });
          unsubscribe = settings.onChange((value) => { toggle.setValue(value.trimTokenPadding); });
        });
        return unsubscribe;
      },
    }],
  };
}
