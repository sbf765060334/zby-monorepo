import { useThemeModeTransition } from '@zby/hooks'
import { MoonOutlined, SunOutlined, SyncOutlined } from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { Button, ConfigProvider, Dropdown, theme as antdTheme, Tooltip } from 'antd'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import type { MenuProps } from 'antd'
import type { PointerEventHandler, ReactNode } from 'react'
import type { ProLayoutThemeAppearance, ProLayoutThemeConfig, ProLayoutThemeMode } from '../types'

const DEFAULT_MODE: ProLayoutThemeMode = 'auto'
const VIEW_TRANSITION_NAME = 'zby-pro-layout-theme'

interface ThemeContextValue {
  enabled: boolean
  mode: ProLayoutThemeMode
  appearance: ProLayoutThemeAppearance
  viewTransitionName: string
  recordSwitchPoint: PointerEventHandler<HTMLElement>
  setMode: (mode: ProLayoutThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  enabled: false,
  mode: 'light',
  appearance: 'light',
  viewTransitionName: VIEW_TRANSITION_NAME,
  recordSwitchPoint: () => undefined,
  setMode: () => undefined,
})

export function ProLayoutThemeProvider(props: {
  config?: ProLayoutThemeConfig
  children: ReactNode
}) {
  const { children, config } = props
  const enabled = Boolean(config?.enabled)
  const controlledMode = config?.mode
  const storageKey = config?.storageKey || 'zby-pro-layout:theme-mode'
  const [systemAppearance, setSystemAppearance] = useState<ProLayoutThemeAppearance>(getSystemMode)
  const [uncontrolledMode, setUncontrolledMode] = useState<ProLayoutThemeMode>(
    () => readMode(storageKey, config?.defaultMode || DEFAULT_MODE),
  )
  const pendingModeRef = useRef<ProLayoutThemeMode | null>(null)
  const mode = controlledMode ?? uncontrolledMode
  const appearance = mode === 'auto' ? systemAppearance : mode
  const { token } = antdTheme.useToken()

  const commitMode = useCallback((nextMode: ProLayoutThemeMode) => {
    persistMode(storageKey, nextMode)
    if (controlledMode === undefined)
      setUncontrolledMode(nextMode)
    config?.onModeChange?.(nextMode)
  }, [config, controlledMode, storageKey])

  const { handleThemeModeChange, recordThemeSwitchPoint } = useThemeModeTransition({
    themeMode: appearance,
    viewTransitionName: VIEW_TRANSITION_NAME,
    background: token.colorBgLayout,
    onThemeModeChange: () => {
      const pendingMode = pendingModeRef.current
      pendingModeRef.current = null
      if (pendingMode)
        commitMode(pendingMode)
    },
  })

  const setMode = useCallback((nextMode: ProLayoutThemeMode) => {
    const nextAppearance = nextMode === 'auto' ? systemAppearance : nextMode
    if (nextAppearance === appearance) {
      commitMode(nextMode)
      return
    }
    pendingModeRef.current = nextMode
    handleThemeModeChange(nextAppearance)
  }, [appearance, commitMode, handleThemeModeChange, systemAppearance])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined')
      return undefined
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media)
      return undefined
    const handleChange = () => setSystemAppearance(media.matches ? 'dark' : 'light')
    handleChange()
    media.addEventListener?.('change', handleChange)
    return () => media.removeEventListener?.('change', handleChange)
  }, [enabled])

  const value = useMemo<ThemeContextValue>(() => ({
    enabled,
    mode,
    appearance,
    viewTransitionName: VIEW_TRANSITION_NAME,
    recordSwitchPoint: recordThemeSwitchPoint,
    setMode,
  }), [appearance, enabled, mode, recordThemeSwitchPoint, setMode])

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider
        theme={enabled
          ? { algorithm: appearance === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm }
          : undefined}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  )
}

export function useProLayoutTheme() {
  return useContext(ThemeContext)
}

/** Header 中的三态主题切换入口。 */
export function ThemeSwitch(props: { prefixCls: string }) {
  const intl = useIntl()
  const { appearance, enabled, mode, recordSwitchPoint, setMode } = useProLayoutTheme()
  if (!enabled)
    return null

  const items: NonNullable<MenuProps['items']> = [
    {
      key: 'auto',
      icon: <SyncOutlined />,
      label: intl.getMessage('zby.pro.layout.theme.auto', '跟随系统'),
    },
    {
      key: 'light',
      icon: <SunOutlined />,
      label: intl.getMessage('zby.pro.layout.theme.light', '亮色主题'),
    },
    {
      key: 'dark',
      icon: <MoonOutlined />,
      label: intl.getMessage('zby.pro.layout.theme.dark', '暗黑主题'),
    },
  ]
  const icon = mode === 'auto'
    ? <SyncOutlined />
    : appearance === 'dark' ? <MoonOutlined /> : <SunOutlined />

  return (
    <Tooltip
      title={mode === 'auto'
        ? intl.getMessage('zby.pro.layout.theme.auto', '跟随系统')
        : appearance === 'dark'
          ? intl.getMessage('zby.pro.layout.theme.dark', '暗黑主题')
          : intl.getMessage('zby.pro.layout.theme.light', '亮色主题')}
    >
      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        menu={{
          items,
          selectedKeys: [mode],
          onClick: ({ key }) => setMode(key as ProLayoutThemeMode),
        }}
      >
        <Button
          type="text"
          size="small"
          className={`${props.prefixCls}-theme-trigger`}
          icon={icon}
          onPointerDown={recordSwitchPoint}
        />
      </Dropdown>
    </Tooltip>
  )
}

function getSystemMode(): ProLayoutThemeAppearance {
  if (typeof window === 'undefined')
    return 'light'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readMode(storageKey: string, fallback: ProLayoutThemeMode) {
  if (typeof window === 'undefined')
    return fallback
  try {
    const mode = window.localStorage.getItem(storageKey)
    return mode === 'auto' || mode === 'light' || mode === 'dark' ? mode : fallback
  } catch {
    return fallback
  }
}

function persistMode(storageKey: string, mode: ProLayoutThemeMode) {
  if (typeof window === 'undefined')
    return
  try {
    window.localStorage.setItem(storageKey, mode)
  } catch {
    // localStorage 不可用时仍保留当前内存主题，不让持久化失败打断 UI。
  }
}
