import i18next, { type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LOCALE, DEFAULT_NAMESPACE } from './constants';
import { normalizeResources } from './resources';
import type { CreateI18nOptions } from './types';

export function createI18n(options: CreateI18nOptions): i18n {
  const {
    locale,
    fallbackLocale = DEFAULT_LOCALE,
    resources,
    defaultNamespace = DEFAULT_NAMESPACE,
  } = options;

  const instance = i18next.createInstance();

  instance.use(initReactI18next).init({
    lng: locale,
    fallbackLng: fallbackLocale,
    defaultNS: defaultNamespace,
    ns: [defaultNamespace],
    resources: normalizeResources(resources, defaultNamespace),
    debug: false,
    showSupportNotice: false,
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
    initImmediate: false,
  });

  return instance;
}