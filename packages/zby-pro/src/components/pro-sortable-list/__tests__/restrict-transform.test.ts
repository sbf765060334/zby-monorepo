import { describe, expect, it } from 'vitest'

import {
  restrictToFirstScrollableAncestor,
  restrictTransformToRect,
} from '../restrict-transform'

const base = { x: 0, y: 0, scaleX: 1, scaleY: 1 }
const item = { top: 100, bottom: 140, left: 20, right: 180 }
const bounds = { top: 80, left: 0, width: 200, height: 220 }

describe('restrictTransformToRect', () => {
  it('keeps a transform that stays inside the bounds', () => {
    expect(restrictTransformToRect({ ...base, y: 20 }, item, bounds)).toEqual({ ...base, y: 20 })
  })

  it('stops the item at the bottom edge of the bounds', () => {
    expect(restrictTransformToRect({ ...base, y: 400 }, item, bounds).y).toBe(160)
  })

  it('stops the item at the top edge of the bounds', () => {
    expect(restrictTransformToRect({ ...base, y: -80 }, item, bounds).y).toBe(-20)
  })
})

describe('restrictToFirstScrollableAncestor', () => {
  it('returns the original transform when the scroll container has not been measured', () => {
    const transform = { ...base, y: 40 }
    expect(restrictToFirstScrollableAncestor({
      activatorEvent: null,
      active: null,
      activeNodeRect: null,
      draggingNodeRect: null,
      containerNodeRect: null,
      over: null,
      overlayNodeRect: null,
      scrollableAncestors: [],
      scrollableAncestorRects: [],
      transform,
      windowRect: null,
    })).toBe(transform)
  })
})
