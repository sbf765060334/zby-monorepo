import { describe, expect, it } from 'vitest'

import { mergeLocales, toIntlResources } from '../mergeLocales'
import type { AntdLocale, ZbyLocalePack } from '../types'

const antdZhCN = {
  locale: 'zh-CN',
  Pagination: { items_per_page: '条/页' },
} as AntdLocale

const uiZhCN = {
  locale: 'zh-CN',
  zby: {
    ui: {
      actionText: { copy: '复制' },
    },
  },
}

const proZhCN = {
  locale: 'zh-CN',
  zby: {
    pro: {
      table: { refresh: '刷新' },
    },
  },
}

const appZhCN = {
  locale: 'zh-CN',
  zby: {
    ui: {
      actionText: { copy: '拷贝' },
    },
  },
  app: {
    title: '工作台',
  },
}

describe('mergeLocales', () => {
  it('把 antd 语言包和文案拆开，后写入的文案覆盖先写入的同名 key', () => {
    const pack = mergeLocales({
      antd: antdZhCN,
      packs: [uiZhCN, proZhCN, appZhCN],
    })

    expect(pack.locale).toBe('zh-CN')
    expect(pack.antd).toBe(antdZhCN)
    expect(pack.antd?.Pagination).toEqual({ items_per_page: '条/页' })
    expect('Pagination' in pack).toBe(false)
    expect(toIntlResources(pack)).toEqual({
      'zh-CN': {
        zby: {
          ui: { actionText: { copy: '拷贝' } },
          pro: { table: { refresh: '刷新' } },
        },
        app: { title: '工作台' },
      },
    })
  })

  it('没有 antd 语言包时只保留文案', () => {
    const pack = mergeLocales({ packs: [uiZhCN] })

    expect(pack.locale).toBe('zh-CN')
    expect(pack.antd).toBeUndefined()
    expect(toIntlResources(pack)).toEqual({
      'zh-CN': {
        zby: {
          ui: { actionText: { copy: '复制' } },
        },
      },
    })
  })

  it('拆掉 antd 语言包外层多包的 default', () => {
    const wrapped = { default: antdZhCN } as AntdLocale
    const pack = mergeLocales({
      antd: wrapped,
      packs: [uiZhCN],
    })

    expect(pack.antd).toBe(antdZhCN)
    expect(pack.antd?.locale).toBe('zh-CN')
  })

  it('接受 antd 省略区域的语言码，例如 en_US 写成 en', () => {
    const pack = mergeLocales({
      antd: { locale: 'en' } as AntdLocale,
      packs: [{ locale: 'en-US', zby: { ui: { actionText: { copy: 'Copy' } } } }],
    })

    expect(pack.locale).toBe('en-US')
    expect(pack.antd?.locale).toBe('en')
  })

  it('接受 antd 的 zh-cn、zh_CN 与 pack 的 zh-CN', () => {
    expect(mergeLocales({
      antd: { locale: 'zh-cn' } as AntdLocale,
      packs: [uiZhCN],
    }).locale).toBe('zh-CN')

    expect(mergeLocales({
      antd: { locale: 'zh_CN' } as AntdLocale,
      packs: [uiZhCN],
    }).locale).toBe('zh-CN')
  })

  it('pack 写成短语言码时仍能对上带区域的 antd 语言码', () => {
    const pack = mergeLocales({
      antd: { locale: 'en-US' } as AntdLocale,
      packs: [{ locale: 'en', zby: { ui: { ok: 'OK' } } }],
    })

    expect(pack.locale).toBe('en')
    expect(toIntlResources(pack)).toEqual({
      en: { zby: { ui: { ok: 'OK' } } },
    })
  })

  it('没有带 locale 的 pack 时失败', () => {
    expect(() => mergeLocales({ packs: [] })).toThrow(/at least one pack/)
    expect(() => mergeLocales({
      antd: antdZhCN,
      packs: [{ zby: {} } as ZbyLocalePack],
    })).toThrow(/at least one pack/)
  })

  it('拒绝把不同语言码合成一份', () => {
    expect(() => mergeLocales({
      packs: [uiZhCN, { locale: 'en-US', zby: { ui: {} } }],
    })).toThrow(/mixed locales/)
  })

  it('拒绝和 pack 对不上的 antd 语言包', () => {
    expect(() => mergeLocales({
      antd: { ...antdZhCN, locale: 'en-us' },
      packs: [uiZhCN],
    })).toThrow(/does not match pack locale/)
  })
})
