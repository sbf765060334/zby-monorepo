import 'antd/dist/reset.css'

import { ConfigProvider, theme } from 'antd'
import antdEnUS from 'antd/locale/en_US'
import antdZhCN from 'antd/locale/zh_CN'
import { mergeIntlResources, ZbyIntlProvider } from '@zby/intl'
import { zbyProLocales } from '@zby/pro'
import { zbyUiLocales } from '@zby/ui'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import InputNumberRangePlayground from './InputNumberRangePlayground'
import PlaygroundNavigation from './PlaygroundNavigation'
import type {
  ComponentSize,
  DensityMode,
  PlaygroundLocale,
  RangeVariant,
  ThemeMode,
} from './PlaygroundNavigation'
import ScrollAreaPlayground from './ScrollAreaPlayground'

const resources = mergeIntlResources(zbyUiLocales, zbyProLocales)
const THEME_VIEW_TRANSITION_NAME = 'zby-playground-theme'

const antdLocales = {
  'zh-CN': antdZhCN,
  'en-US': antdEnUS,
}

type PlaygroundWorkspaceProps = {
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

function PlaygroundWorkspace(props: PlaygroundWorkspaceProps) {
  const { token } = theme.useToken()

  return (
    <main
      style={{
        minHeight: '100vh',
        color: token.colorText,
        background: token.colorBgLayout,
        viewTransitionName: THEME_VIEW_TRANSITION_NAME,
      }}
    >
      <PlaygroundNavigation {...props} />
      <ConfigProvider
        componentSize={props.componentSize}
        componentDisabled={props.componentDisabled}
        variant={props.variant}
      >
        <div style={{ width: '100%', maxWidth: 1240, marginInline: 'auto', padding: 24 }}>
          <Routes>
            <Route path="/" element={<Navigate replace to="/input-number-range" />} />
            <Route path="/input-number-range" element={<InputNumberRangePlayground />} />
            <Route path="/scroll-area" element={<ScrollAreaPlayground />} />
            <Route path="*" element={<Navigate replace to="/input-number-range" />} />
          </Routes>
        </div>
      </ConfigProvider>
    </main>
  )
}

function PlaygroundApp() {
  const [locale, setLocale] = React.useState<PlaygroundLocale>('zh-CN')
  const [themeMode, setThemeMode] = React.useState<ThemeMode>('light')
  const [densityMode, setDensityMode] = React.useState<DensityMode>('default')
  const [componentSize, setComponentSize] = React.useState<ComponentSize>('middle')
  const [componentDisabled, setComponentDisabled] = React.useState(false)
  const [variant, setVariant] = React.useState<RangeVariant>('outlined')

  const algorithms = React.useMemo(() => {
    const nextAlgorithms = [themeMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm]

    if (densityMode === 'compact') {
      nextAlgorithms.push(theme.compactAlgorithm)
    }

    return nextAlgorithms
  }, [densityMode, themeMode])

  return (
    <ConfigProvider
      locale={antdLocales[locale]}
      theme={{ algorithm: algorithms, cssVar: { prefix: 'zby-playground' } }}
    >
      <ZbyIntlProvider
        locale={locale}
        fallbackLocale="zh-CN"
        resources={resources}
        onLocaleChange={(nextLocale) => setLocale(nextLocale as PlaygroundLocale)}
      >
        <PlaygroundWorkspace
          locale={locale}
          themeMode={themeMode}
          densityMode={densityMode}
          componentSize={componentSize}
          componentDisabled={componentDisabled}
          variant={variant}
          onThemeModeChange={setThemeMode}
          onDensityModeChange={setDensityMode}
          onComponentSizeChange={setComponentSize}
          onComponentDisabledChange={setComponentDisabled}
          onVariantChange={setVariant}
        />
      </ZbyIntlProvider>
    </ConfigProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <PlaygroundApp />
    </BrowserRouter>
  </React.StrictMode>,
)
