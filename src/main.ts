import {
    Editor,
    MarkdownView,
    Notice,
    Plugin
} from 'obsidian';

import { I18nManager } from './i18n';
import { DeleteEmptyLinesSettingTab, PluginInterface } from './settings-tab';
import { processText } from './text-processor';
import { DEFAULT_SETTINGS } from './types';
import type {
    DeleteEmptyLinesSettings,
    LocaleTree,
    ResolvedLanguage,
    StoredDeleteEmptyLinesSettings,
    TranslationParams
} from './types';

export default class DeleteEmptyLinesPlugin extends Plugin implements PluginInterface {
    settings: DeleteEmptyLinesSettings = { ...DEFAULT_SETTINGS };
    i18n: I18nManager = new I18nManager();
    settingTab?: DeleteEmptyLinesSettingTab;
    updateCommands?: () => void;

    get currentLang(): ResolvedLanguage {
        return this.i18n.currentLang;
    }

    get localeData(): LocaleTree {
        return this.i18n.localeData;
    }

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

        console.debug(this.t('notices.pluginLoaded'));
    }

    initI18n(): void {
        this.i18n.init(this.settings.language);
    }

    t(key: string, params: TranslationParams = {}): string {
        return this.i18n.t(key, params);
    }

    getLocaleValue(key: string): unknown {
        return this.i18n.getLocaleValue(key);
    }

    async setLanguage(language: string): Promise<void> {
        this.settings.language = this.i18n.normalizeLanguage(language);
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
            const processedContent = processText(content, maxLines, this.settings);

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
        const processed = processText(selection, maxLines, this.settings);

        if (selection !== processed) {
            currentEditor.replaceSelection(processed);
            new Notice(this.t('notices.processSuccess', { count: maxLines }));
        } else {
            new Notice(this.t('notices.noEmptyLines'));
        }
    }

    async loadSettings(): Promise<void> {
        const saved = (await this.loadData()) as StoredDeleteEmptyLinesSettings | null;
        this.settings = Object.assign({}, DEFAULT_SETTINGS, saved ?? {}, {
            whitespaceOnlyLinesAsEmpty:
                saved?.whitespaceOnlyLinesAsEmpty ??
                saved?.preserveIndentation ??
                DEFAULT_SETTINGS.whitespaceOnlyLinesAsEmpty,
        });
        this.settings.language = this.i18n.normalizeLanguage(this.settings.language);
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
        if (this.updateCommands) {
            this.updateCommands();
        }
    }

    onunload(): void {
        console.debug(this.t('notices.pluginUnloaded'));
    }
}
