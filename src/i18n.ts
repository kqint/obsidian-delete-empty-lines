import enLocale from '../locales/en.json';
import zhCnLocale from '../locales/zh-CN.json';
import { Language, ResolvedLanguage, TranslationParams, LocaleTree } from './types';

const BUILT_IN_LOCALES: Readonly<Record<ResolvedLanguage, LocaleTree>> = Object.freeze({
    en: enLocale as LocaleTree,
    'zh-CN': zhCnLocale as LocaleTree
});

export class I18nManager {
    currentLang: ResolvedLanguage = 'en';
    localeData: LocaleTree = BUILT_IN_LOCALES.en;

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

    init(language: Language): void {
        const resolved = this.resolveLanguage(language);
        this.currentLang = resolved;
        this.localeData = BUILT_IN_LOCALES[resolved] ?? BUILT_IN_LOCALES.en;
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
}
