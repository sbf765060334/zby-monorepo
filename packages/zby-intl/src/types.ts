import type { i18n, TOptions } from 'i18next';
import type React from 'react';

export type Locale = string;

export type LocaleMessageValue =
  string | number | boolean | null | LocaleMessages | LocaleMessageValue[];

export interface LocaleMessages {
  [key: string]: LocaleMessageValue;
}

export type IntlResources = Record<Locale, LocaleMessages>;

export type FormatValues = Record<string, string | number | boolean | Date | null | undefined> & {
  context?: string;
};

export type DateInput = Date | string | number;

export type ChangeLocale = (locale: Locale) => Promise<void>;

export type TranslateOptions = Omit<TOptions<Record<string, unknown>>, 'context'> & {
  context?: string;
};

export type IntlShape = {
  locale: Locale;
  fallbackLocale: Locale;
  i18n: i18n;
  t: (id: string, options?: TranslateOptions) => string;
  getMessage: (id: string, defaultMessage?: string, values?: FormatValues) => string;
  formatMessage: (id: string, values?: FormatValues, defaultMessage?: string) => string;
  formatDate: (value: DateInput, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  changeLocale: ChangeLocale;
};

export type IntlProviderProps = {
  children?: React.ReactNode;
  locale: Locale;
  fallbackLocale?: Locale;
  resources?: IntlResources;
  defaultNamespace?: string;
  i18n?: i18n;
  onLocaleChange?: (locale: Locale) => void;
};

export type CreateI18nOptions = {
  locale: Locale;
  fallbackLocale?: Locale;
  resources?: IntlResources;
  defaultNamespace?: string;
};

export type CreateIntlOptions = CreateI18nOptions & {
  i18n?: i18n;
};
