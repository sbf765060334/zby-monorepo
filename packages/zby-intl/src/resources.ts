import type { Resource } from 'i18next';

import { DEFAULT_NAMESPACE } from './constants';
import type { IntlResources, LocaleMessages } from './types';

export function normalizeResources(
  resources: IntlResources = {},
  defaultNamespace = DEFAULT_NAMESPACE,
): Resource {
  return Object.keys(resources).reduce<Resource>((current, locale) => {
    current[locale] = {
      [defaultNamespace]: resources[locale] as LocaleMessages,
    };
    return current;
  }, {});
}
