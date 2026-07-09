import React from 'react'
import { useTranslation } from 'react-i18next'

import { DEFAULT_NAMESPACE } from './constants'
import { createIntlShape } from './intl'
import { IntlConfigContext } from './provider'
import type { IntlShape } from './types'

export function useIntl(): IntlShape {
  const { fallbackLocale, defaultNamespace, onLocaleChange } = React.useContext(IntlConfigContext)
  const { i18n } = useTranslation(defaultNamespace || DEFAULT_NAMESPACE)

  return React.useMemo(
    () => createIntlShape(i18n, fallbackLocale, onLocaleChange, defaultNamespace),
    [defaultNamespace, fallbackLocale, i18n, onLocaleChange],
  )
}
