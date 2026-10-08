// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'

import { lockBodyScroll, unlockBodyScroll } from '../body-scroll-lock'

afterEach(() => {
  unlockBodyScroll()
  unlockBodyScroll()
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
})

describe('body scroll lock', () => {
  it('locks overflow on first call and restores after the last unlock', () => {
    document.body.style.overflow = 'auto'

    lockBodyScroll()
    expect(document.body.style.overflow).toBe('hidden')
    lockBodyScroll()
    expect(document.body.style.overflow).toBe('hidden')

    unlockBodyScroll()
    expect(document.body.style.overflow).toBe('hidden')
    unlockBodyScroll()
    expect(document.body.style.overflow).toBe('auto')
  })
})
