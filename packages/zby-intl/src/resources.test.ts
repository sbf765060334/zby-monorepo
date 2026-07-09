import { describe, expect, it } from 'vitest'

import { mergeIntlResources } from './resources'

describe('mergeIntlResources', () => {
  it('deep merges locale messages by locale', () => {
    expect(
      mergeIntlResources(
        {
          'zh-CN': {
            zby: {
              ui: {
                inputNumberRange: {
                  startPlaceholder: 'Min',
                },
              },
            },
          },
        },
        {
          'zh-CN': {
            zby: {
              pro: {
                layout: {
                  title: 'Console',
                },
              },
            },
          },
        },
      ),
    ).toEqual({
      'zh-CN': {
        zby: {
          ui: {
            inputNumberRange: {
              startPlaceholder: 'Min',
            },
          },
          pro: {
            layout: {
              title: 'Console',
            },
          },
        },
      },
    })
  })

  it('lets later resources override earlier messages', () => {
    expect(
      mergeIntlResources(
        {
          'en-US': {
            common: {
              confirm: 'Confirm',
            },
          },
        },
        {
          'en-US': {
            common: {
              confirm: 'OK',
            },
          },
        },
      ),
    ).toEqual({
      'en-US': {
        common: {
          confirm: 'OK',
        },
      },
    })
  })
})
