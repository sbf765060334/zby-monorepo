import { describe, expect, it } from 'vitest'

import { distributeActionWidths } from '../layout'

describe('action width distribution', () => {
  it.each([
    [[30, 100, 100], 120, [30, 45, 45]],
    [[100, 30, 30], 120, [60, 30, 30]],
    [[20, 30, 100], 120, [20, 30, 70]],
    [[20, 30, 100], 200, [20, 30, 100]],
    [[100, 30], 0, [0, 0]],
    [[], 100, []],
  ])('distributes %j within %s pixels', (widths, available, expected) => {
    expect(distributeActionWidths(widths, available)).toEqual(expected)
  })
})
