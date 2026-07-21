import { Button, Segmented, Switch, Tabs, Typography, theme } from 'antd'
import { useThemeModeTransition } from '@zby/hooks'
import { useIntl } from '@zby/intl'
import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const { Text, Title } = Typography
const THEME_VIEW_TRANSITION_NAME = 'zby-playground-theme'

export type PlaygroundLocale = 'zh-CN' | 'en-US'
export type ThemeMode = 'light' | 'dark'
export type DensityMode = 'default' | 'compact'
export type ComponentSize = 'small' | 'middle' | 'large'
export type RangeVariant = 'outlined' | 'filled' | 'borderless' | 'underlined'

type PlaygroundNavigationProps = {
  locale: PlaygroundLocale
  themeMode: ThemeMode
  densityMode: DensityMode
  componentSize: ComponentSize
  componentDisabled: boolean
  variant: RangeVariant
  onThemeModeChange: (value: ThemeMode) => void
  onDensityModeChange: (value: DensityMode) => void
  onComponentSizeChange: (value: ComponentSize) => void
  onComponentDisabledChange: (value: boolean) => void
  onVariantChange: (value: RangeVariant) => void
}

const pageItems = [
  { key: '/input-number-range', label: 'InputNumberRange' },
  { key: '/scroll-area', label: 'ScrollArea' },
]

function NavigationControl({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 4, alignContent: 'start' }}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {label}
      </Text>
      {children}
    </div>
  )
}

export default function PlaygroundNavigation({
  locale,
  themeMode,
  densityMode,
  componentSize,
  componentDisabled,
  variant,
  onThemeModeChange,
  onDensityModeChange,
  onComponentSizeChange,
  onComponentDisabledChange,
  onVariantChange,
}: PlaygroundNavigationProps) {
  const intl = useIntl()
  const { token } = theme.useToken()
  const location = useLocation()
  const navigate = useNavigate()
  const activeKey = location.pathname === '/scroll-area' ? '/scroll-area' : '/input-number-range'
  const nextLocale: PlaygroundLocale = intl.locale === 'zh-CN' ? 'en-US' : 'zh-CN'
  const { handleThemeModeChange, recordThemeSwitchPoint } = useThemeModeTransition({
    themeMode,
    viewTransitionName: THEME_VIEW_TRANSITION_NAME,
    background: token.colorBgLayout,
    onThemeModeChange,
  })

  return (
    <header
      style={{
        position: 'sticky',
        zIndex: token.zIndexPopupBase,
        insetBlockStart: 0,
        display: 'grid',
        gap: 12,
        padding: '12px 16px 0',
        borderBlockEnd: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
        boxShadow: token.boxShadowTertiary,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          zby-ui playground
        </Title>
        <Tabs
          activeKey={activeKey}
          items={pageItems}
          size="small"
          style={{ minWidth: 280, marginBlockEnd: -1 }}
          onChange={(path) => navigate(path)}
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'start',
          paddingBlockEnd: 12,
          overflowX: 'auto',
        }}
      >
        <NavigationControl label="语言">
          <Button size="small" onClick={() => void intl.changeLocale(nextLocale)}>
            {locale} → {nextLocale}
          </Button>
        </NavigationControl>

        <NavigationControl label="主题">
          <div onPointerDown={recordThemeSwitchPoint}>
            <Segmented
              size="small"
              value={themeMode}
              options={[
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
              ]}
              onChange={(value) => handleThemeModeChange(value as ThemeMode)}
            />
          </div>
        </NavigationControl>

        <NavigationControl label="密度">
          <Segmented
            size="small"
            value={densityMode}
            options={[
              { label: 'Default', value: 'default' },
              { label: 'Compact', value: 'compact' },
            ]}
            onChange={(value) => onDensityModeChange(value as DensityMode)}
          />
        </NavigationControl>

        <NavigationControl label="组件尺寸">
          <Segmented
            size="small"
            value={componentSize}
            options={['small', 'middle', 'large']}
            onChange={(value) => onComponentSizeChange(value as ComponentSize)}
          />
        </NavigationControl>

        <NavigationControl label="全局禁用">
          <Switch
            size="small"
            checked={componentDisabled}
            checkedChildren="禁用"
            unCheckedChildren="启用"
            onChange={onComponentDisabledChange}
          />
        </NavigationControl>

        <NavigationControl label="variant">
          <Segmented
            size="small"
            value={variant}
            options={['outlined', 'filled', 'borderless', 'underlined']}
            onChange={(value) => onVariantChange(value as RangeVariant)}
          />
        </NavigationControl>
      </div>
    </header>
  )
}
