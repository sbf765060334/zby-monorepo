import { describe, expect, it } from 'vitest'

import { matchRoutePath } from '../../router/pathMatcher'

describe('matchRoutePath', () => {
  it('matches exact paths after removing query, hash and trailing slashes', () => {
    expect(matchRoutePath('/projects/42/', '/projects/42?tab=detail#summary')).toBe(true)
    expect(matchRoutePath('', '/')).toBe(true)
    expect(matchRoutePath('/projects/42', '/projects/43')).toBe(false)
  })

  it('matches one pathname segment for each dynamic parameter', () => {
    expect(matchRoutePath('/projects/:projectId/tasks/:taskId', '/projects/42/tasks/7')).toBe(
      true,
    )
    expect(matchRoutePath('/projects/:projectId', '/projects')).toBe(false)
    expect(matchRoutePath('/projects/:projectId', '/projects/42/detail')).toBe(false)
  })

  it('supports a terminal wildcard with zero or multiple remaining segments', () => {
    expect(matchRoutePath('/docs/*', '/docs')).toBe(true)
    expect(matchRoutePath('/docs/*', '/docs/guide/start')).toBe(true)
    expect(matchRoutePath('/docs/*/edit', '/docs/guide/edit')).toBe(false)
  })
})
