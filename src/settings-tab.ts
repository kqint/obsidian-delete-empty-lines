import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { DeleteEmptyLinesSettings, TranslationParams } from './types';

export interface PluginInterface {
    settings: DeleteEmptyLinesSettings;
    setLanguage(language: string): Promise<void>;
    saveSettings(): Promise<void>;
    t(key: string, params?: TranslationParams): string;
    getLocaleValue(key: string): unknown;
}

export class DeleteEmptyLinesSettingTab extends PluginSettingTab {
    plugin: PluginInterface;

    constructor(app: App, plugin: PluginInterface) {
        super(app, plugin as unknown as Plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName(this.plugin.t('settings.title'))
            .setHeading();

        new Setting(containerEl)
            .setName(this.plugin.t('settings.language.name'))
            .setDesc(this.plugin.t('settings.language.desc'))
            .addDropdown((dropdown) => {
                const options = this.plugin.getLocaleValue('settings.language.options');
                const optionMap = options && typeof options === 'object'
                    ? (options as Record<string, string>)
                    : {};

                dropdown.addOption('auto', optionMap.auto ?? this.plugin.t('settings.language.options.auto'));
                dropdown.addOption('zh-CN', optionMap['zh-CN'] ?? this.plugin.t('settings.language.options.zh-CN'));
                dropdown.addOption('en', optionMap.en ?? this.plugin.t('settings.language.options.en'));
                dropdown.setValue(this.plugin.settings.language);
                dropdown.onChange(async (value) => {
                    await this.plugin.setLanguage(value);
                });
            });

        new Setting(containerEl)
            .setName(this.plugin.t('settings.whitespaceOnlyLinesAsEmpty.name'))
            .setDesc(this.plugin.t('settings.whitespaceOnlyLinesAsEmpty.desc'))
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.whitespaceOnlyLinesAsEmpty)
                    .onChange(async (value) => {
                        this.plugin.settings.whitespaceOnlyLinesAsEmpty = value;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName(this.plugin.t('settings.defaultFullMaxLines.name'))
            .setDesc(this.plugin.t('settings.defaultFullMaxLines.desc'))
            .addText((text) => {
                text
                    .setValue(String(this.plugin.settings.defaultFullMaxLines))
                    .setPlaceholder(this.plugin.t('settings.numberInputPlaceholder'))
                    .onChange(async (value) => {
                        const num = Number.parseInt(value, 10);
                        if (!Number.isNaN(num) && num >= 0) {
                            this.plugin.settings.defaultFullMaxLines = num;
                            await this.plugin.saveSettings();
                            this.display();
                        } else {
                            text.setValue(String(this.plugin.settings.defaultFullMaxLines));
                            new Notice(this.plugin.t('notices.invalidNumber'));
                        }
                    });
            });

        new Setting(containerEl)
            .setName(this.plugin.t('settings.defaultSelectionMaxLines.name'))
            .setDesc(this.plugin.t('settings.defaultSelectionMaxLines.desc'))
            .addText((text) => {
                text
                    .setValue(String(this.plugin.settings.defaultSelectionMaxLines))
                    .setPlaceholder(this.plugin.t('settings.numberInputPlaceholder'))
                    .onChange(async (value) => {
                        const num = Number.parseInt(value, 10);
                        if (!Number.isNaN(num) && num >= 0) {
                            this.plugin.settings.defaultSelectionMaxLines = num;
                            await this.plugin.saveSettings();
                            this.display();
                        } else {
                            text.setValue(String(this.plugin.settings.defaultSelectionMaxLines));
                            new Notice(this.plugin.t('notices.invalidNumber'));
                        }
                    });
            });

        new Setting(containerEl)
            .setName(this.plugin.t('settings.usage.title'))
            .setHeading();

        const usageEl = containerEl.createEl('div', { cls: 'setting-item-description' });
        this.createUsageParagraph(usageEl, 'settings.usage.commandPalette', 'settings.usage.commandPaletteDesc');
        this.createUsageParagraph(usageEl, 'settings.usage.contextMenu', 'settings.usage.contextMenuDesc');
    }

    createUsageParagraph(containerEl: HTMLElement, labelKey: string, descKey: string): void {
        const paragraph = containerEl.createEl('p');
        paragraph.createEl('strong', { text: `${this.plugin.t(labelKey)}: ` });
        paragraph.appendChild(document.createTextNode(this.plugin.t(descKey)));
    }
}
