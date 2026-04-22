import {
    App,
    Editor,
    MarkdownView,
    Notice,
    Plugin,
    PluginSettingTab,
    Setting
} from 'obsidian';

import enLocale from '../locales/en.json';
import zhCnLocale from '../locales/zh-CN.json';

type Language = 'auto' | 'en' | 'zh-CN';
type ResolvedLanguage = 'en' | 'zh-CN';
type TranslationParams = Record<string, string | number>;
type LocaleTree = Record<string, unknown>;

interface DeleteEmptyLinesSettings {
    language: Language;
    whitespaceOnlyLinesAsEmpty: boolean;
    defaultFullMaxLines: number;
    defaultSelectionMaxLines: number;
}

interface StoredDeleteEmptyLinesSettings extends Partial<DeleteEmptyLinesSettings> {
    preserveIndentation?: boolean;
}

const BUILT_IN_LOCALES: Readonly<Record<ResolvedLanguage, LocaleTree>> = Object.freeze({
    en: enLocale as LocaleTree,
    'zh-CN': zhCnLocale as LocaleTree
});

const DEFAULT_SETTINGS: DeleteEmptyLinesSettings = {
    language: 'auto',
    whitespaceOnlyLinesAsEmpty: true,
    defaultFullMaxLines: 0,
    defaultSelectionMaxLines: 0
};

export default class DeleteEmptyLinesPlugin extends Plugin {
    settings: DeleteEmptyLinesSettings = { ...DEFAULT_SETTINGS };
    currentLang: ResolvedLanguage = 'en';
    localeData: LocaleTree = BUILT_IN_LOCALES.en;
    settingTab?: DeleteEmptyLinesSettingTab;
    updateCommands?: () => void;

    async onload(): Promise<void> {
        await this.loadSettings();
        this.initI18n();

        this.updateCommands = () => {
            this.removeCommand('full-default');
            this.removeCommand('selection-default');

            this.addCommand({
                id: 'full-default',
                name: this.t('commands.fullDefault.name', { count: this.settings.defaultFullMaxLines }),
                callback: () => {
                    void this.processDocument(this.settings.defaultFullMaxLines);
                }
            });

            this.addCommand({
                id: 'selection-default',
                name: this.t('commands.selectionDefault.name', { count: this.settings.defaultSelectionMaxLines }),
                callback: () => {
                    void this.processSelection(this.settings.defaultSelectionMaxLines);
                }
            });
        };

        this.updateCommands();

        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu, editor) => {
                if (editor.somethingSelected()) {
                    menu.addItem((item) => {
                        item.setTitle(this.t('contextMenu.selection', { count: this.settings.defaultSelectionMaxLines }))
                            .setIcon('minimize-2')
                            .onClick(() => {
                                void this.processSelection(this.settings.defaultSelectionMaxLines, editor);
                            });
                    });
                } else {
                    menu.addItem((item) => {
                        item.setTitle(this.t('contextMenu.fullDocument', { count: this.settings.defaultFullMaxLines }))
                            .setIcon('minimize-2')
                            .onClick(() => {
                                void this.processDocument(this.settings.defaultFullMaxLines);
                            });
                    });
                }
            })
        );

        this.settingTab = new DeleteEmptyLinesSettingTab(this.app, this);
        this.addSettingTab(this.settingTab);

        console.log(this.t('notices.pluginLoaded'));
    }

    normalizeLanguage(languageSetting: string | null | undefined): Language {
        if (languageSetting === 'auto') {
            return 'auto';
        }

        const normalized = String(languageSetting ?? '').toLowerCase();
        if (normalized.startsWith('zh')) {
            return 'zh-CN';
        }
        if (normalized.startsWith('en')) {
            return 'en';
        }
        return 'en';
    }

    initI18n(): void {
        const language = this.resolveLanguage(this.settings.language);
        this.currentLang = language;
        this.localeData = BUILT_IN_LOCALES[language] ?? BUILT_IN_LOCALES.en;
    }

    resolveLanguage(languageSetting: Language): ResolvedLanguage {
        if (languageSetting !== 'auto') {
            return this.normalizeLanguage(languageSetting) === 'zh-CN' ? 'zh-CN' : 'en';
        }

        const obsidianLang =
            window.localStorage.getItem('language') ??
            navigator.language ??
            'en';

        return this.normalizeLanguage(obsidianLang) === 'zh-CN' ? 'zh-CN' : 'en';
    }

    getNestedValue(source: unknown, key: string): unknown {
        return key.split('.').reduce<unknown>((acc, currentKey) => {
            if (acc && typeof acc === 'object') {
                const objectValue = acc as Record<string, unknown>;
                if (currentKey in objectValue) {
                    return objectValue[currentKey];
                }
            }
            return undefined;
        }, source);
    }

    getLocaleValue(key: string): unknown {
        return (
            this.getNestedValue(this.localeData, key) ??
            this.getNestedValue(BUILT_IN_LOCALES[this.currentLang], key) ??
            this.getNestedValue(BUILT_IN_LOCALES.en, key)
        );
    }

    t(key: string, params: TranslationParams = {}): string {
        const rawValue = this.getLocaleValue(key);
        const template = typeof rawValue === 'string' ? rawValue : key;

        return template.replace(/\{(\w+)\}/g, (match, paramKey) => {
            return params[paramKey] !== undefined ? String(params[paramKey]) : match;
        });
    }

    async setLanguage(language: string): Promise<void> {
        this.settings.language = this.normalizeLanguage(language);
        this.initI18n();
        await this.saveSettings();

        this.settingTab?.display();

        const options = this.getLocaleValue('settings.language.options');
        const optionMap = options && typeof options === 'object'
            ? (options as Record<string, string>)
            : {};
        const languageLabel = optionMap[this.settings.language] ?? this.settings.language;

        new Notice(this.t('notices.languageChanged', { language: languageLabel }));
    }

    async processDocument(maxLines: number): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice(this.t('notices.noActiveFile'));
            return;
        }

        try {
            const content = await this.app.vault.read(activeFile);
            const processedContent = this.processText(content, maxLines);

            if (content !== processedContent) {
                await this.app.vault.modify(activeFile, processedContent);
                new Notice(this.t('notices.processSuccess', { count: maxLines }));
            } else {
                new Notice(this.t('notices.noEmptyLines'));
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            new Notice(this.t('notices.processFailed', { error: message }));
            console.error('Processing failed:', error);
        }
    }

    async processSelection(maxLines: number, editor?: Editor): Promise<void> {
        let currentEditor = editor;
        if (!currentEditor) {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!view) {
                new Notice(this.t('notices.noEditor'));
                return;
            }
            currentEditor = view.editor;
        }

        if (!currentEditor.somethingSelected()) {
            new Notice(this.t('notices.noSelection'));
            return;
        }

        const selection = currentEditor.getSelection();
        const processed = this.processText(selection, maxLines);

        if (selection !== processed) {
            currentEditor.replaceSelection(processed);
            new Notice(this.t('notices.processSuccess', { count: maxLines }));
        } else {
            new Notice(this.t('notices.noEmptyLines'));
        }
    }

    processText(text: string, maxEmptyLines: number): string {
        const lines = text.split('\n');
        const processedLines: string[] = [];
        let emptyLineCount = 0;

        for (const line of lines) {
            if (this.isEmptyLine(line)) {
                emptyLineCount += 1;
                if (emptyLineCount <= maxEmptyLines) {
                    processedLines.push('');
                }
            } else {
                emptyLineCount = 0;
                processedLines.push(line);
            }
        }

        let tailEmpty = 0;
        for (let i = processedLines.length - 1; i >= 0; i -= 1) {
            if (this.isEmptyLine(processedLines[i])) {
                tailEmpty += 1;
            } else {
                break;
            }
        }

        if (tailEmpty > maxEmptyLines) {
            processedLines.splice(processedLines.length - (tailEmpty - maxEmptyLines));
        }

        return processedLines.join('\n');
    }

    isEmptyLine(line: string): boolean {
        if (this.settings.whitespaceOnlyLinesAsEmpty) {
            return line.trim() === '';
        }
        return line === '';
    }

    async loadSettings(): Promise<void> {
        const saved = (await this.loadData()) as StoredDeleteEmptyLinesSettings | null;
        this.settings = Object.assign({}, DEFAULT_SETTINGS, saved ?? {}, {
            whitespaceOnlyLinesAsEmpty:
                saved?.whitespaceOnlyLinesAsEmpty ??
                saved?.preserveIndentation ??
                DEFAULT_SETTINGS.whitespaceOnlyLinesAsEmpty,
        });
        this.settings.language = this.normalizeLanguage(this.settings.language);
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
        if (this.updateCommands) {
            this.updateCommands();
        }
    }

    onunload(): void {
        console.log(this.t('notices.pluginUnloaded'));
    }
}

class DeleteEmptyLinesSettingTab extends PluginSettingTab {
    plugin: DeleteEmptyLinesPlugin;

    constructor(app: App, plugin: DeleteEmptyLinesPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: this.plugin.t('settings.title') });

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

        containerEl.createEl('h3', { text: this.plugin.t('settings.usage.title') });
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
