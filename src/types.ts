export type Language = 'auto' | 'en' | 'zh-CN';
export type ResolvedLanguage = 'en' | 'zh-CN';
export type TranslationParams = Record<string, string | number>;
export type LocaleTree = Record<string, unknown>;

export interface DeleteEmptyLinesSettings {
    language: Language;
    whitespaceOnlyLinesAsEmpty: boolean;
    defaultFullMaxLines: number;
    defaultSelectionMaxLines: number;
}

export interface StoredDeleteEmptyLinesSettings extends Partial<DeleteEmptyLinesSettings> {
    preserveIndentation?: boolean;
}

export const DEFAULT_SETTINGS: DeleteEmptyLinesSettings = {
    language: 'auto',
    whitespaceOnlyLinesAsEmpty: true,
    defaultFullMaxLines: 0,
    defaultSelectionMaxLines: 0
};
