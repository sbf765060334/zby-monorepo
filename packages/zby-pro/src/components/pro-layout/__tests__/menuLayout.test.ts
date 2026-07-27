import { describe, expect, it } from 'vitest'

import { createMenuDrawerLayout } from '../menu/menuLayout'

const columnWidth = 232
const frameInlineSize = 1
const scrollbarSize = { width: 17, height: 17 }

describe('createMenuDrawerLayout', () => {
  it('does not infer an eighth column when seven real columns fit', () => {
    const layout = createMenuDrawerLayout({
      itemHeights: Array.from({ length: 7 }).fill(600) as number[],
      drawerBodyHeight: 700,
      availableWidth: 1836,
      columnWidth,
      frameInlineSize,
      scrollbarSize,
    })

    expect(layout.columnCount).toBe(7)
    expect(layout.maxColumns).toBe(7)
    expect(layout.drawerWidth).toBe(columnWidth * 7 + frameInlineSize)
    expect(layout.shouldScrollX).toBe(false)
    expect(layout.shouldScrollY).toBe(false)
  })

  it('expands the shared column height to keep the tallest group intact', () => {
    const layout = createMenuDrawerLayout({
      itemHeights: [300, 1100, 350, 400],
      drawerBodyHeight: 700,
      availableWidth: 1000,
      columnWidth,
      frameInlineSize,
      scrollbarSize,
    })

    expect(layout.columnHeight).toBe(1100)
    expect(layout.columnStartIndexes).toEqual([0, 1, 2])
    expect(layout.columnCount).toBe(3)
    expect(layout.drawerWidth).toBe(
      columnWidth * 3 + scrollbarSize.width + frameInlineSize,
    )
    expect(layout.shouldScrollX).toBe(false)
    expect(layout.shouldScrollY).toBe(true)
  })

  it('reserves both scrollbar dimensions before final packing', () => {
    const layout = createMenuDrawerLayout({
      itemHeights: Array.from({ length: 8 }).fill(690) as number[],
      drawerBodyHeight: 700,
      availableWidth: columnWidth * 7 + scrollbarSize.width + frameInlineSize,
      columnWidth,
      frameInlineSize,
      scrollbarSize,
    })

    expect(layout.columnHeight).toBe(690)
    expect(layout.columnCount).toBe(8)
    expect(layout.maxColumns).toBe(7)
    expect(layout.shouldScrollX).toBe(true)
    expect(layout.shouldScrollY).toBe(true)
  })

  it('keeps an exact height boundary in the current column', () => {
    const layout = createMenuDrawerLayout({
      itemHeights: [300, 400, 200],
      drawerBodyHeight: 700,
      availableWidth: 1000,
      columnWidth,
      frameInlineSize,
      scrollbarSize,
    })

    expect(layout.columnStartIndexes).toEqual([0, 2])
    expect(layout.columnCount).toBe(2)
  })

  it('starts a new column when fractional heights exceed the boundary', () => {
    const layout = createMenuDrawerLayout({
      itemHeights: [300.3, 371.9],
      drawerBodyHeight: 672,
      availableWidth: 1000,
      columnWidth,
      frameInlineSize,
      scrollbarSize,
    })

    expect(layout.columnStartIndexes).toEqual([0, 1])
    expect(layout.columnCount).toBe(2)
  })
})
