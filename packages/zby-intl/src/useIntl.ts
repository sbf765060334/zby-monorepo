import React from 'react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_NAMESPACE } from './constants'
import { createIntlShape } from './intl'
import { IntlConfigContext } from './provider'
import type { IntlShape } from './types'

// React 组件内使用的统一入口。
// 它从 react-i18next 拿到底层 i18next 实例，再包装成项目自己的 IntlShape。
export function useIntl(): IntlShape {
  // fallbackLocale/defaultNamespace/onLocaleChange 来自 ZbyIntlProvider 的补充配置。
  const { fallbackLocale, defaultNamespace, onLocaleChange } = React.useContext(IntlConfigContext)

  // useTranslation 会读取最近的 I18nextProvider，
  // 因此组件库和业务代码只要处在 ZbyIntlProvider 下面，就能共享同一个 i18next 实例。
  const { i18n } = useTranslation(defaultNamespace || DEFAULT_NAMESPACE)

  // createIntlShape 只是包装方法，不应该在每次渲染时重复创建。
  return React.useMemo(
    () => createIntlShape(i18n, fallbackLocale, onLocaleChange, defaultNamespace),
    [defaultNamespace, fallbackLocale, i18n, onLocaleChange],
  )
}
