import { describe, expect, it } from 'vitest'

import { mergeLocales, toIntlResources } from '../mergeLocales'
import type { AntdLocale } from '../../locale/types'

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
  it('assembles antd, library, and app packs without mixing antd into i18n messages', () => {
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

  it('accepts antd locale codes that omit region, such as en_US using "en"', () => {
    const pack = mergeLocales({
      antd: { locale: 'en' } as AntdLocale,
      packs: [{ locale: 'en-US', zby: { ui: { actionText: { copy: 'Copy' } } } }],
    })

    expect(pack.locale).toBe('en-US')
    expect(pack.antd?.locale).toBe('en')
  })

  it('accepts antd zh-cn against pack zh-CN', () => {
    const pack = mergeLocales({
      antd: { locale: 'zh-cn' } as AntdLocale,
      packs: [uiZhCN],
    })

    expect(pack.locale).toBe('zh-CN')
  })

  it('rejects mixed language codes', () => {
    expect(() => mergeLocales({
      packs: [uiZhCN, { locale: 'en-US', zby: { ui: {} } }],
    })).toThrow(/mixed locales/)
  })

  it('rejects antd language that does not match the packs', () => {
    expect(() => mergeLocales({
      antd: { ...antdZhCN, locale: 'en-us' },
      packs: [uiZhCN],
    })).toThrow(/does not match pack locale/)
  })
})
