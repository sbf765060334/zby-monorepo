// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  BrowserRouter,
  MemoryRouter,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createRouterCore } from '../../createRouterCore'
import { RouterCoreProvider } from '../../react'
import type { RouterRoute } from '../../types'
import { RouterCoreReactRouterAdapter } from '../index'

const routes: RouterRoute[] = [
  { path: '/home', title: '首页', element: 'home' },
  { path: '/project/:id', title: '项目', element: 'project' },
]

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})

describe('RouterCoreReactRouterAdapter', () => {
  it('synchronizes BrowserRouter location and forwards Core navigation commands', async () => {
    window.history.replaceState(null, '', '/home?source=browser#top')
    const router = createRouterCore({ routes, storageAdapter: false })

    render(
      <BrowserRouter>
        <RouterCoreProvider router={router}>
          <RouterCoreReactRouterAdapter>
            <NavigationProbe router={router} />
          </RouterCoreReactRouterAdapter>
        </RouterCoreProvider>
      </BrowserRouter>,
    )

    expect(screen.getByTestId('location').textContent)
      .toBe('/home?source=browser#top')
    expect(router.getState().currentPathname).toBe('/home')

    fireEvent.click(screen.getByRole('button', { name: 'jump' }))

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/project/42')
      expect(router.getState().currentPathname).toBe('/project/42')
    })

    fireEvent.click(screen.getByRole('button', { name: 'replace' }))

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent)
        .toBe('/project/42?tab=detail#summary')
    })
  })

  it('preserves smartNavigate replace semantics in MemoryRouter history', async () => {
    const router = createRouterCore({ routes, storageAdapter: false })

    render(
      <MemoryRouter initialEntries={['/home']}>
        <RouterCoreProvider router={router}>
          <RouterCoreReactRouterAdapter>
            <NavigationProbe router={router} />
          </RouterCoreReactRouterAdapter>
        </RouterCoreProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'jump' }))
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/project/42')
    })

    fireEvent.click(screen.getByRole('button', { name: 'replace' }))
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent)
        .toBe('/project/42?tab=detail#summary')
    })

    fireEvent.click(screen.getByRole('button', { name: 'back' }))
    await waitFor(() => {
      // smartNavigate 替换的是 /project/42 记录；回退应直接返回最初的 /home。
      expect(screen.getByTestId('location').textContent).toBe('/home')
      expect(router.getState().currentPathname).toBe('/home')
    })
  })

  it('derives href from basename and unbinds the host when unmounted', () => {
    const router = createRouterCore({ routes, storageAdapter: false })
    const bindHost = vi.spyOn(router, 'bindHost')

    const view = render(
      <MemoryRouter basename="/platform" initialEntries={['/platform/home']}>
        <RouterCoreProvider router={router}>
          <RouterCoreReactRouterAdapter>
            <span>content</span>
          </RouterCoreReactRouterAdapter>
        </RouterCoreProvider>
      </MemoryRouter>,
    )

    const host = bindHost.mock.calls.find(([value]) => value !== null)?.[0]
    expect(host?.createHref?.('/project/42')).toBe('/platform/project/42')

    view.unmount()
    expect(bindHost).toHaveBeenLastCalledWith(null)
  })
})

/** 同时观察真实地址并触发 Core 与 React Router 两侧的导航动作。 */
function NavigationProbe(props: {
  router: ReturnType<typeof createRouterCore>
}) {
  const { router } = props
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <>
      <span data-testid="location">
        {`${location.pathname}${location.search}${location.hash}`}
      </span>
      <button type="button" onClick={() => router.jumpTo('/project/42')}>
        jump
      </button>
      <button
        type="button"
        onClick={() => router.smartNavigate({
          searchParams: 'tab=detail',
          hash: 'summary',
        })}
      >
        replace
      </button>
      <button type="button" onClick={() => void navigate(-1)}>
        back
      </button>
    </>
  )
}
