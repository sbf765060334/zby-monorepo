// 默认语言。业务没有显式传 fallbackLocale 时，会回退到中文。
export const DEFAULT_LOCALE = 'zh-CN'

// i18next 的默认命名空间。当前包把所有语言资源先统一放进这个 namespace，
// 这样组件内部调用 getMessage('a.b.c') 时，不需要每次手动传 ns。
export const DEFAULT_NAMESPACE = 'translation'
