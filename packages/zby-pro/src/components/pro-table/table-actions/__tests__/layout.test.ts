import { describe, expect, it } from 'vitest'

import { distributeActionWidths, normalizeActionCount, resolveActionLayout } from '../layout'

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

describe('responsive action layout', () => {
  const single = {
    actionCount: 4,
    limit: 3,
    sizes: [100, 30, 30].map((natural) => ({ natural, minimum: 28 })),
    more: 16,
    gap: 4,
  }

  it.each([
    [300, 3, [100, 30, 30]],
    [148, 3, [60, 30, 30]],
    [96, 2, [42, 30]],
    [60, 1, [40]],
    [40, 0, []],
  ])('keeps an ordered prefix at %s pixels', (available, count, widths) => {
    expect(resolveActionLayout({ ...single, available })).toMatchObject({ visibleCount: count, widths })
  })

  it('allows naturally short labels and releases their unused width', () => {
    expect(resolveActionLayout({ ...single, limit: 2, sizes: [{ natural: 100, minimum: 28 }, { natural: 10, minimum: 10 }], available: 66 }))
      .toMatchObject({ visibleCount: 2, widths: [32, 10] })
  })

  it('reserves more only when needed, including a new menu caused by width overflow', () => {
    const input = { ...single, actionCount: 2, limit: 2, sizes: [{ natural: 5, minimum: 5 }, { natural: 5, minimum: 5 }], more: 40 }
    expect(resolveActionLayout({ ...input, available: 14 }).visibleCount).toBe(2)
    expect(resolveActionLayout({ ...input, available: 13 })).toMatchObject({ visibleCount: 0, moreWidth: 13 })
  })

  it.each([[8, 8], [0, 0], [-5, 0]])('bounds the final more entry at %s pixels', (available, moreWidth) => {
    expect(resolveActionLayout({ ...single, available })).toMatchObject({ visibleCount: 0, moreWidth })
  })

  const grid = {
    actionCount: 7,
    limit: 5,
    grid: { maxRows: 2, maxColumns: 3 },
    sizes: Array.from({ length: 5 }, () => ({ natural: 100, minimum: 40 })),
    more: 36,
    gap: 6,
  }

  it.each([[180, 5, 3], [120, 3, 2], [80, 1, 1], [39, 0, 1]])('reduces grid columns within the row bound at %s pixels', (available, visibleCount, columns) => {
    const result = resolveActionLayout({ ...grid, available })
    expect(result).toMatchObject({ visibleCount, columns })
    expect(Math.ceil((visibleCount + 1) / columns)).toBeLessThanOrEqual(2)
  })

  it('can collapse an initially full grid without an existing overflow menu', () => {
    expect(resolveActionLayout({ ...grid, actionCount: 6, limit: 6, sizes: [...grid.sizes, grid.sizes[0]], available: 120 }))
      .toMatchObject({ visibleCount: 3, columns: 2 })
  })

  it('uses the full width for vertical actions independently of the more entry', () => {
    const input = { ...grid, grid: { maxRows: 3, maxColumns: 1 }, limit: 2, more: 52 }
    expect(resolveActionLayout({ ...input, available: 56 })).toMatchObject({ visibleCount: 2, columns: 1 })
    expect(resolveActionLayout({ ...input, available: 39 })).toMatchObject({ visibleCount: 0, moreWidth: 39 })
  })

  it('keeps natural layout when no width constraint is given', () => {
    expect(resolveActionLayout(grid)).toMatchObject({ visibleCount: 5, columns: 3, widths: undefined })
  })

  it.each([undefined, { maxRows: 1, maxColumns: 2 }])('does not overflow gaps even for empty labels in %j', (grid) => {
    expect(resolveActionLayout({ actionCount: 2, limit: 2, grid, sizes: [{ natural: 0, minimum: 0 }, { natural: 0, minimum: 0 }], more: 16, gap: 4, available: 3 }))
      .toMatchObject({ visibleCount: 0, moreWidth: 3 })
  })

  it.each([[undefined, 0], [-1, 0], [2.9, 2], [Number.NaN, 0], [Number.POSITIVE_INFINITY, 0]])('normalizes count %s', (value, expected) => {
    expect(normalizeActionCount(value)).toBe(expected)
  })
})
