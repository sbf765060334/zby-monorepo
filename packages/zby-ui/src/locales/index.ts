import enUS from './en-US'
import zhCN from './zh-CN'

type LocaleMessageValue = string | number | boolean | null | LocaleMessages | LocaleMessageValue[]

interface LocaleMessages {
  [key: string]: LocaleMessageValue
}

type IntlResources = Record<string, LocaleMessages>

export const zbyUiLocales = {
  'zh-CN': zhCN,
  'en-US': enUS,
} satisfies IntlResources

export { enUS as zbyUiEnUS, zhCN as zbyUiZhCN }
