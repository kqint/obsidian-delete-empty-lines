const { Plugin, PluginSettingTab, Setting, Notice, MarkdownView } = require('obsidian');

const BUILT_IN_LOCALES = {
    en: {
        commands: {
            fullDefault: { name: 'Compress empty lines (Full document, keep {count})' },
            selectionDefault: { name: 'Compress empty lines (Selection, keep {count})' }
        },
        contextMenu: {
            fullDocument: 'Compress empty lines in document (keep {count})',
            selection: 'Compress empty lines in selection (keep {count})'
        },
        notices: {
            noActiveFile: 'No active file',
            noEditor: 'No editor found',
            noSelection: 'Please select text first',
            processSuccess: 'Processed (keep up to {count} consecutive empty lines)',
            noEmptyLines: 'No empty lines to process',
            processFailed: 'Processing failed: {error}',
            invalidNumber: 'Please enter a non-negative integer',
            pluginLoaded: 'Delete Empty Lines plugin loaded',
            pluginUnloaded: 'Delete Empty Lines plugin unloaded',
            languageChanged: 'Language switched to {language}'
        },
        settings: {
            title: 'Delete Empty Lines Settings',
            language: {
                name: 'Language',
                desc: 'Choose display language. Changes take effect immediately.',
                options: {
                    auto: 'Auto',
                    zh: 'Simplified Chinese',
                    en: 'English'
                }
            },
            preserveIndentation: {
                name: 'Delete lines with only whitespace',
                desc: 'When enabled, lines containing only spaces and tabs are treated as empty lines and deleted.'
            },
            defaultFullMaxLines: {
                name: 'Default max consecutive empty lines (Full document)',
                desc: 'Maximum number of consecutive empty lines to keep when processing the entire document (0 = delete all)'
            },
            defaultSelectionMaxLines: {
                name: 'Default max consecutive empty lines (Selection)',
                desc: 'Maximum number of consecutive empty lines to keep when processing selected text (0 = delete all)'
            },
            usage: {
                title: 'Usage Instructions',
                commandPalette: 'Command Palette',
                commandPaletteDesc: 'Press Ctrl/Cmd+P and search for "compress empty lines".',
                contextMenu: 'Context Menu',
                contextMenuDesc: 'Right-click in the editor to see the matching compress command.'
            }
        }
    }
};

const DEFAULT_SETTINGS = {
    language: 'en',
    preserveIndentation: true,
    defaultFullMaxLines: 0,
    defaultSelectionMaxLines: 0
};

module.exports = class DeleteEmptyLinesPlugin extends Plugin {
    async onload() {
        await this.loadSettings();
        await this.initI18n();

        this.updateCommands = () => {
            this.removeCommand('full-default');
            this.removeCommand('selection-default');

            this.addCommand({
                id: 'full-default',
                name: this.t('commands.fullDefault.name', { count: this.settings.defaultFullMaxLines }),
                callback: () => this.processDocument(this.settings.defaultFullMaxLines)
            });

            this.addCommand({
                id: 'selection-default',
                name: this.t('commands.selectionDefault.name', { count: this.settings.defaultSelectionMaxLines }),
                callback: () => this.processSelection(this.settings.defaultSelectionMaxLines)
            });
        };

        this.updateCommands();

        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu, editor) => {
                if (editor.somethingSelected()) {
                    menu.addItem((item) => {
                        item.setTitle(this.t('contextMenu.selection', { count: this.settings.defaultSelectionMaxLines }))
                            .setIcon('minimize-2')
                            .onClick(() => this.processSelection(this.settings.defaultSelectionMaxLines, editor));
                    });
                } else {
                    menu.addItem((item) => {
                        item.setTitle(this.t('contextMenu.fullDocument', { count: this.settings.defaultFullMaxLines }))
                            .setIcon('minimize-2')
                            .onClick(() => this.processDocument(this.settings.defaultFullMaxLines));
                    });
                }
            })
        );

        this.settingTab = new DeleteEmptyLinesSettingTab(this.app, this);
        this.addSettingTab(this.settingTab);

        console.log(this.t('notices.pluginLoaded'));
    }

    async initI18n() {
        const language = this.resolveLanguage(this.settings.language);
        this.currentLang = language;
        this.localeData = await this.loadLocale(language);
    }

    resolveLanguage(languageSetting) {
        if (languageSetting !== 'auto') {
            return languageSetting;
        }

        const obsidianLang = (
            window.localStorage.getItem('language') ||
            navigator.language ||
            'en'
        ).toLowerCase();

        return obsidianLang.startsWith('zh') ? 'zh' : 'en';
    }

    async loadLocale(language) {
        try {
            const localePath = `${this.manifest.dir}/locales/${language}.json`;
            const content = await this.app.vault.adapter.read(localePath);
            return JSON.parse(content);
        } catch (error) {
            console.warn(`[delete-empty-lines] Failed to load locale "${language}", using fallback.`, error);
            return BUILT_IN_LOCALES[language] || BUILT_IN_LOCALES.en;
        }
    }

    getNestedValue(source, key) {
        return key.split('.').reduce((acc, currentKey) => {
            if (acc && typeof acc === 'object' && currentKey in acc) {
                return acc[currentKey];
            }
            return undefined;
        }, source);
    }

    getLocaleValue(key) {
        return (
            this.getNestedValue(this.localeData, key) ||
            this.getNestedValue(BUILT_IN_LOCALES[this.currentLang], key) ||
            this.getNestedValue(BUILT_IN_LOCALES.en, key)
        );
    }

    t(key, params = {}) {
        let value = this.getLocaleValue(key) || key;

        if (typeof value !== 'string') {
            value = key;
        }

        return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
            return params[paramKey] !== undefined ? String(params[paramKey]) : match;
        });
    }

    async setLanguage(language) {
        this.settings.language = language;
        await this.initI18n();
        await this.saveSettings();

        if (this.settingTab) {
            this.settingTab.display();
        }

        const options = this.getLocaleValue('settings.language.options') || {};
        const fallbackOptions = { auto: 'Auto', zh: 'Simplified Chinese', en: 'English' };
        const languageLabel = options[language] || fallbackOptions[language] || language;
        new Notice(this.t('notices.languageChanged', { language: languageLabel }));
    }

    async processDocument(maxLines) {
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
        } catch (error) {
            new Notice(this.t('notices.processFailed', { error: error.message }));
            console.error('Processing failed:', error);
        }
    }

    async processSelection(maxLines, editor) {
        if (!editor) {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!view) {
                new Notice(this.t('notices.noEditor'));
                return;
            }
            editor = view.editor;
        }

        if (!editor.somethingSelected()) {
            new Notice(this.t('notices.noSelection'));
            return;
        }

        const selection = editor.getSelection();
        const processed = this.processText(selection, maxLines);

        if (selection !== processed) {
            editor.replaceSelection(processed);
            new Notice(this.t('notices.processSuccess', { count: maxLines }));
        } else {
            new Notice(this.t('notices.noEmptyLines'));
        }
    }

    processText(text, maxEmptyLines) {
        const lines = text.split('\n');
        const processedLines = [];
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

    isEmptyLine(line) {
        if (this.settings.preserveIndentation) {
            return line.trim() === '';
        }
        return line === '';
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        if (this.updateCommands) {
            this.updateCommands();
        }
    }

    onunload() {
        console.log(this.t('notices.pluginUnloaded'));
    }
};

class DeleteEmptyLinesSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: this.plugin.t('settings.title') });

        new Setting(containerEl)
            .setName(this.plugin.t('settings.language.name'))
            .setDesc(this.plugin.t('settings.language.desc'))
            .addDropdown((dropdown) => {
                const options = this.plugin.getLocaleValue('settings.language.options') || {};
                dropdown.addOption('auto', options.auto || 'Auto');
                dropdown.addOption('zh', options.zh || 'Simplified Chinese');
                dropdown.addOption('en', options.en || 'English');
                dropdown.setValue(this.plugin.settings.language);
                dropdown.onChange(async (value) => {
                    await this.plugin.setLanguage(value);
                });
            });

        new Setting(containerEl)
            .setName(this.plugin.t('settings.preserveIndentation.name'))
            .setDesc(this.plugin.t('settings.preserveIndentation.desc'))
            .addToggle((toggle) => toggle
                .setValue(this.plugin.settings.preserveIndentation)
                .onChange(async (value) => {
                    this.plugin.settings.preserveIndentation = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName(this.plugin.t('settings.defaultFullMaxLines.name'))
            .setDesc(this.plugin.t('settings.defaultFullMaxLines.desc'))
            .addText((text) => text
                .setValue(String(this.plugin.settings.defaultFullMaxLines))
                .setPlaceholder('>=0')
                .onChange(async (value) => {
                    const num = parseInt(value, 10);
                    if (!Number.isNaN(num) && num >= 0) {
                        this.plugin.settings.defaultFullMaxLines = num;
                        await this.plugin.saveSettings();
                        this.display();
                    } else {
                        text.setValue(String(this.plugin.settings.defaultFullMaxLines));
                        new Notice(this.plugin.t('notices.invalidNumber'));
                    }
                }));

        new Setting(containerEl)
            .setName(this.plugin.t('settings.defaultSelectionMaxLines.name'))
            .setDesc(this.plugin.t('settings.defaultSelectionMaxLines.desc'))
            .addText((text) => text
                .setValue(String(this.plugin.settings.defaultSelectionMaxLines))
                .setPlaceholder('>=0')
                .onChange(async (value) => {
                    const num = parseInt(value, 10);
                    if (!Number.isNaN(num) && num >= 0) {
                        this.plugin.settings.defaultSelectionMaxLines = num;
                        await this.plugin.saveSettings();
                        this.display();
                    } else {
                        text.setValue(String(this.plugin.settings.defaultSelectionMaxLines));
                        new Notice(this.plugin.t('notices.invalidNumber'));
                    }
                }));

        containerEl.createEl('h3', { text: this.plugin.t('settings.usage.title') });
        const usageEl = containerEl.createEl('div', { cls: 'setting-item-description' });
        usageEl.innerHTML = `
            <p><strong>${this.plugin.t('settings.usage.commandPalette')}:</strong> ${this.plugin.t('settings.usage.commandPaletteDesc')}</p>
            <p><strong>${this.plugin.t('settings.usage.contextMenu')}:</strong> ${this.plugin.t('settings.usage.contextMenuDesc')}</p>
        `;
    }
}
