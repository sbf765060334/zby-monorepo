import enUS from './en-US'
import zhCN from './zh-CN'

type LocaleMessageValue = string | number | boolean | null | LocaleMessages | LocaleMessageValue[]

interface LocaleMessages {
  [key: string]: LocaleMessageValue
}

type IntlResources = Record<string, LocaleMessages>

export const zbyProLocales = {
  'zh-CN': zhCN,
  'en-US': enUS,
} satisfies IntlResources

export { enUS as zbyProEnUS, zhCN as zbyProZhCN }
