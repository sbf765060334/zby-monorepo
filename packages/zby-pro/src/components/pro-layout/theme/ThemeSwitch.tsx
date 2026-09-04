import {
  CompressOutlined,
  ExpandOutlined,
  MoonOutlined,
  SunOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { useThemeModeTransition } from '@zby/hooks'
import { useIntl } from '@zby/intl'
import { Button, Dropdown, theme as antdTheme } from 'antd'
import { clsx } from 'clsx'
import { useCallback, useRef } from 'react'

import type { MenuProps } from 'antd'
import { PRO_LAYOUT_THEME_VIEW_TRANSITION_NAME } from './constants'
import useThemeSwitchStyles from './style'
import type { ProThemeAppearance, ProThemeMode, ProThemePreference } from './types'
import { resolveThemeAppearance } from './useThemePreference'

const DEFAULT_PREFIX_CLS = 'zby-pro-layout'
const THEME_ICON_PATH = 'M7.02 3.635l12.518 12.518a1.863 1.863 0 010 2.635l-1.317 1.318a1.863 1.863 0 01-2.635 0L3.068 7.588A2.795 2.795 0 117.02 3.635zm2.09 14.428a.932.932 0 110 1.864.932.932 0 010-1.864zm-.043-9.747L7.75 9.635l9.154 9.153 1.318-1.317-9.154-9.155zM3.52 12.473c.514 0 .931.417.931.931v.932h.932a.932.932 0 110 1.864h-.932v.931a.932.932 0 01-1.863 0l-.001-.931h-.93a.932.932 0 010-1.864h.93v-.932c0-.514.418-.931.933-.931zm15.374-3.727a1.398 1.398 0 110 2.795 1.398 1.398 0 010-2.795zM4.385 4.953a.932.932 0 000 1.317l12.046 12.047L7.75 7 5.703 4.953a.932.932 0 00-1.318 0zM14.701.36a.932.932 0 01.931.932v.931h.932a.932.932 0 010 1.864h-.933l.001.932a.932.932 0 11-1.863 0l-.001-.932h-.93a.932.932 0 110-1.864h.93v-.931a.932.932 0 01.933-.932z'

/** 使用 Ant Design 官网主题入口的图形，并保持与 antd 图标一致的尺寸和颜色继承方式。 */
function ThemeIcon() {
  return (
    <span role="img" className="anticon">
      <svg
        width="1em"
        height="1em"
        viewBox="0 0 21 21"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
        data-icon="theme"
      >
        <g fillRule="evenodd">
          <g fillRule="nonzero">
            <path d={THEME_ICON_PATH} />
          </g>
        </g>
      </svg>
    </span>
  )
}

/** 主题按钮是受控组件，业务收到 onChange 后自行更新外层 ConfigProvider。 */
export interface ProThemeSwitchProps {
  /** 用户当前选择的明暗模式和布局密度。 */
  value: ProThemePreference
  /** mode 解析后的实际明暗外观，用于判断明暗切换方向。 */
  appearance: ProThemeAppearance
  /** 偏好变化通知；组件本身不保存状态，也不直接配置 antd。 */
  onChange: (value: ProThemePreference) => void
  /** 生成样式类名的前缀，默认与 ProLayout 一致。 */
  prefixCls?: string
  /** 附加到触发按钮上的业务类名。 */
  className?: string
}

/** 只负责主题偏好的选择 UI，最终 Ant Design 主题由业务 ConfigProvider 应用。 */
export default function ProThemeSwitch(props: ProThemeSwitchProps) {
  const {
    appearance,
    className,
    onChange,
    prefixCls = DEFAULT_PREFIX_CLS,
    value,
  } = props
  const intl = useIntl()
  const { token } = antdTheme.useToken()
  const hashId = useThemeSwitchStyles(prefixCls)

  // 动画回调只接收实际 light/dark，ref 用来暂存同时包含 auto 和 density 的完整偏好。
  const pendingPreferenceRef = useRef<ProThemePreference | null>(null)
  const themeTriggerRef = useRef<HTMLButtonElement>(null)
  const themeTransitionOriginRef = useRef<{ x: number, y: number } | undefined>(undefined)

  // 明暗和密度是两组选项，各自在当前选项右侧显示主题色圆点。
  const renderOptionLabel = (label: string, selected: boolean) => (
    <span
      className={selected ? `${prefixCls}-theme-option-selected` : undefined}
      style={{
        display: 'flex',
        minWidth: 104,
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: token.marginLG,
      }}
    >
      <span>{label}</span>
      {selected ? (
        <span
          aria-hidden
          className={`${prefixCls}-theme-selected-dot`}
          style={{
            width: 6,
            height: 6,
            flex: '0 0 auto',
            borderRadius: '50%',
            background: token.colorPrimary,
          }}
        />
      ) : null}
    </span>
  )

  const commitPendingPreference = useCallback(() => {
    const pendingPreference = pendingPreferenceRef.current
    pendingPreferenceRef.current = null
    if (pendingPreference)
      onChange(pendingPreference)
  }, [onChange])

  const { handleThemeModeChange } = useThemeModeTransition({
    themeMode: appearance,
    viewTransitionName: PRO_LAYOUT_THEME_VIEW_TRANSITION_NAME,
    background: token.colorBgLayout,
    onThemeModeChange: commitPendingPreference,
  })

  const recordThemeTriggerCenter = useCallback(
    (event: { currentTarget: HTMLElement }) => {
      const rect = event.currentTarget.getBoundingClientRect()
      themeTransitionOriginRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      }
    },
    [],
  )

  const getThemeTriggerCenter = useCallback(() => {
    const trigger = themeTriggerRef.current
    if (!trigger)
      return themeTransitionOriginRef.current

    const rect = trigger.getBoundingClientRect()
    const origin = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }
    themeTransitionOriginRef.current = origin
    return origin
  }, [])

  const selectMode = useCallback((mode: ProThemeMode) => {
    const nextValue = { ...value, mode }
    const nextAppearance = resolveThemeAppearance(mode)

    // auto 与 light/dark 可能解析成相同外观，此时只更新偏好，不启动空动画。
    if (nextAppearance === appearance) {
      onChange(nextValue)
      return
    }

    pendingPreferenceRef.current = nextValue
    handleThemeModeChange(nextAppearance, getThemeTriggerCenter())
  }, [appearance, getThemeTriggerCenter, handleThemeModeChange, onChange, value])

  // key 前缀用于区分明暗模式和布局密度，二者互不覆盖。
  const items: NonNullable<MenuProps['items']> = [
    {
      key: 'mode:auto',
      icon: <SyncOutlined />,
      label: renderOptionLabel(
        intl.getMessage('zby.pro.layout.theme.auto', '跟随系统'),
        value.mode === 'auto',
      ),
    },
    {
      key: 'mode:light',
      icon: <SunOutlined />,
      label: renderOptionLabel(
        intl.getMessage('zby.pro.layout.theme.light', '亮色主题'),
        value.mode === 'light',
      ),
    },
    {
      key: 'mode:dark',
      icon: <MoonOutlined />,
      label: renderOptionLabel(
        intl.getMessage('zby.pro.layout.theme.dark', '暗黑主题'),
        value.mode === 'dark',
      ),
    },
    { type: 'divider' },
    {
      key: 'density:default',
      icon: <ExpandOutlined />,
      label: renderOptionLabel(
        intl.getMessage('zby.pro.layout.theme.defaultDensity', '默认布局'),
        value.density === 'default',
      ),
    },
    {
      key: 'density:compact',
      icon: <CompressOutlined />,
      label: renderOptionLabel(
        intl.getMessage('zby.pro.layout.theme.compactDensity', '紧凑布局'),
        value.density === 'compact',
      ),
    },
  ]
  const title = intl.getMessage('zby.pro.layout.theme.trigger', '主题设置')

  return (
    <Dropdown
      trigger={['hover']}
      placement="bottomRight"
      destroyOnHidden
      menu={{
        items,
        onClick: ({ key }) => {
          if (key === 'mode:auto' || key === 'mode:light' || key === 'mode:dark') {
            selectMode(key.slice('mode:'.length) as ProThemeMode)
            return
          }

          if (key === 'density:default' || key === 'density:compact') {
            // 密度切换会改变大量几何尺寸，直接更新以避免圆形快照动画产生跳动。
            onChange({
              ...value,
              density: key === 'density:compact' ? 'compact' : 'default',
            })
          }
        },
      }}
    >
      <Button
        type="text"
        size="small"
        className={clsx(`${prefixCls}-theme-trigger`, hashId, className)}
        icon={<ThemeIcon />}
        aria-label={title}
        title={title}
        ref={themeTriggerRef}
        onFocus={recordThemeTriggerCenter}
        onPointerEnter={recordThemeTriggerCenter}
      />
    </Dropdown>
  )
}
