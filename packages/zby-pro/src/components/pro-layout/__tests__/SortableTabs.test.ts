import { describe, expect, it } from 'vitest'

import { getTabReorderRejection } from '../header/SortableTabs'

describe('getTabReorderRejection', () => {
  const fixedKeys = ['/fixed-a', '/fixed-b']

  it('rejects moving an unfixed tab before a fixed tab', () => {
    expect(getTabReorderRejection('/normal-a', '/fixed-a', fixedKeys))
      .toBe('unfixedBeforeFixed')
  })

  it('rejects moving a fixed tab after an unfixed tab', () => {
    expect(getTabReorderRejection('/fixed-a', '/normal-a', fixedKeys))
      .toBe('fixedAfterUnfixed')
  })

  it('allows reordering within the same tab group', () => {
    expect(getTabReorderRejection('/fixed-a', '/fixed-b', fixedKeys)).toBeNull()
    expect(getTabReorderRejection('/normal-a', '/normal-b', fixedKeys)).toBeNull()
  })
})
