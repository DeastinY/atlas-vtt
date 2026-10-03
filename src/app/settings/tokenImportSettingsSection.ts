import type { SettingsService } from '../services/SettingsService';
import type { AtlasSettingSection } from './settingSections';

/** How tokens are created from statblocks. */
export function tokenImportSettingsSection(settings: SettingsService): AtlasSettingSection {
  return {
    heading: 'Token import',
    rows: [{
      name: 'Use token images as they are',
      desc: 'When a statblock names a finished token in its token property, create the token from that image, whole and without the Atlas ring. Statblocks without one use their image as before.',
      aliases: ['statblock', 'fantasy statblocks', 'bestiary', 'token image', 'ring', 'frame'],
      render: (setting) => {
        let unsubscribe: (() => void) | undefined;
        setting.addToggle((toggle) => {
          toggle.setValue(settings.getSetting('preferTokenField'))
            .onChange((enabled) => {
              if (settings.getSetting('preferTokenField') !== enabled) settings.setSetting('preferTokenField', enabled);
            });
          unsubscribe = settings.onChange((value) => { toggle.setValue(value.preferTokenField); });
        });
        return unsubscribe;
      },
    }],
  };
}
