import 'antd/dist/reset.css'

import {
  Button,
  ConfigProvider,
  Divider,
  Form,
  InputNumber,
  Segmented,
  Space,
  Switch,
  Typography,
  theme,
} from 'antd'
import antdEnUS from 'antd/locale/en_US'
import antdZhCN from 'antd/locale/zh_CN'
import { mergeIntlResources, useIntl, ZbyIntlProvider } from '@zby/intl'
import { zbyProLocales } from '@zby/pro'
import { InputNumberRange, zbyUiLocales } from '@zby/ui'
import React from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

const { Text, Title } = Typography

const resources = mergeIntlResources(zbyUiLocales, zbyProLocales)

const antdLocales = {
  'zh-CN': antdZhCN,
  'en-US': antdEnUS,
}

type PlaygroundLocale = 'zh-CN' | 'en-US'
type ThemeMode = 'light' | 'dark'
type DensityMode = 'default' | 'compact'
type ComponentSize = 'small' | 'middle' | 'large'
type RangeVariant = 'outlined' | 'filled' | 'borderless' | 'underlined'
type RangeStatus = 'default' | 'warning' | 'error'
type RangeValue = [number | string | null, number | string | null]
type ViewTransitionLike = {
  ready: Promise<void>
  finished: Promise<void>
}
type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => ViewTransitionLike
}

type PlaygroundDebugProps = {
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

function ControlField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <Text type="secondary">{label}</Text>
      {children}
    </div>
  )
}

function PlaygroundDebug({
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
}: PlaygroundDebugProps) {
  const intl = useIntl()
  const { token } = theme.useToken()
  const nextLocale: PlaygroundLocale = intl.locale === 'zh-CN' ? 'en-US' : 'zh-CN'
  const [rangeValue, setRangeValue] = React.useState<RangeValue>([10, 30])
  const [formStatus, setFormStatus] = React.useState<RangeStatus>('default')
  const [allowClear, setAllowClear] = React.useState(true)
  const [allowEmpty, setAllowEmpty] = React.useState(true)
  const [order, setOrder] = React.useState(true)
  const themeSwitchPointRef = React.useRef<{ x: number; y: number } | null>(null)

  const recordThemeSwitchPoint = React.useCallback<React.PointerEventHandler<HTMLDivElement>>(
    (event) => {
      themeSwitchPointRef.current = { x: event.clientX, y: event.clientY }
    },
    [],
  )

  const handleThemeModeChange = React.useCallback(
    (nextThemeMode: ThemeMode) => {
      if (nextThemeMode === themeMode) {
        return
      }

      const viewTransitionDocument = document as ViewTransitionDocument

      if (
        !viewTransitionDocument.startViewTransition ||
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ) {
        onThemeModeChange(nextThemeMode)
        return
      }

      const { x, y } = themeSwitchPointRef.current ?? {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      }
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      )
      const clipPath = [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`]
      const enteringDark = nextThemeMode === 'dark'
      const styleElement = document.createElement('style')
      styleElement.textContent = `
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}

::view-transition-old(root) {
  z-index: ${enteringDark ? 1 : 999};
}

::view-transition-new(root) {
  z-index: ${enteringDark ? 999 : 1};
}
`
      document.head.appendChild(styleElement)

      const transition = viewTransitionDocument.startViewTransition(() => {
        flushSync(() => onThemeModeChange(nextThemeMode))
      })

      void transition.ready
        .then(() => {
          document.documentElement.animate(
            {
              clipPath: enteringDark ? clipPath : [...clipPath].reverse(),
            },
            {
              duration: 520,
              easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
              fill: 'forwards',
              pseudoElement: `::view-transition-${enteringDark ? 'new' : 'old'}(root)`,
            } as KeyframeAnimationOptions,
          )
        })
        .catch(() => undefined)

      void transition.finished
        .finally(() => {
          styleElement.remove()
        })
        .catch(() => undefined)
    },
    [onThemeModeChange, themeMode],
  )

  const status = formStatus === 'default' ? undefined : formStatus
  const startPlaceholder = intl.getMessage('zby.ui.inputNumberRange.startPlaceholder', '最小值')
  const endPlaceholder = intl.getMessage('zby.ui.inputNumberRange.endPlaceholder', '最大值')

  const sectionStyle: React.CSSProperties = {
    display: 'grid',
    gap: 16,
    paddingBlockStart: 20,
    borderBlockStart: token.lineWidth + 'px ' + token.lineType + ' ' + token.colorBorderSecondary,
  }
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
  }
  const caseStyle: React.CSSProperties = {
    display: 'grid',
    gap: 8,
    minWidth: 0,
    padding: 12,
    border: token.lineWidth + 'px ' + token.lineType + ' ' + token.colorBorderSecondary,
    borderRadius: 8,
    background: token.colorBgContainer,
  }

  const renderCase = (title: string, node: React.ReactNode) => (
    <div style={caseStyle}>
      <Text strong>{title}</Text>
      {node}
    </div>
  )

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: 24,
        color: token.colorText,
        background: token.colorBgLayout,
      }}
    >
      <Space orientation="vertical" size={24} style={{ width: '100%', maxWidth: 1120 }}>
        <header>
          <Title level={3} style={{ margin: 0 }}>
            zby-ui InputNumberRange playground
          </Title>
          <Text type="secondary">
            locale: {locale} / theme: {themeMode} / density: {densityMode}
          </Text>
        </header>

        <section style={sectionStyle}>
          <Title level={5} style={{ margin: 0 }}>
            调试开关
          </Title>
          <div style={gridStyle}>
            <ControlField label="语言">
              <Button type="primary" onClick={() => void intl.changeLocale(nextLocale)}>
                Switch to {nextLocale}
              </Button>
            </ControlField>

            <ControlField label="主题">
              <div onPointerDown={recordThemeSwitchPoint}>
                <Segmented
                  value={themeMode}
                  options={[
                    { label: 'Light', value: 'light' },
                    { label: 'Dark', value: 'dark' },
                  ]}
                  onChange={(value) => handleThemeModeChange(value as ThemeMode)}
                />
              </div>
            </ControlField>

            <ControlField label="密度">
              <Segmented
                value={densityMode}
                options={[
                  { label: 'Default', value: 'default' },
                  { label: 'Compact', value: 'compact' },
                ]}
                onChange={(value) => onDensityModeChange(value as DensityMode)}
              />
            </ControlField>

            <ControlField label="ConfigProvider size">
              <Segmented
                value={componentSize}
                options={[
                  { label: 'Small', value: 'small' },
                  { label: 'Middle', value: 'middle' },
                  { label: 'Large', value: 'large' },
                ]}
                onChange={(value) => onComponentSizeChange(value as ComponentSize)}
              />
            </ControlField>

            <ControlField label="ConfigProvider disabled">
              <Switch
                checked={componentDisabled}
                checkedChildren="禁用"
                unCheckedChildren="启用"
                onChange={onComponentDisabledChange}
              />
            </ControlField>

            <ControlField label="ConfigProvider variant">
              <Segmented
                value={variant}
                options={[
                  { label: 'Outlined', value: 'outlined' },
                  { label: 'Filled', value: 'filled' },
                  { label: 'Borderless', value: 'borderless' },
                  { label: 'Underlined', value: 'underlined' },
                ]}
                onChange={(value) => onVariantChange(value as RangeVariant)}
              />
            </ControlField>
          </div>
        </section>

        <section style={sectionStyle}>
          <Title level={5} style={{ margin: 0 }}>
            核心预览
          </Title>
          <div style={gridStyle}>
            <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
              <ControlField label="Form.Item status">
                <Segmented
                  value={formStatus}
                  options={[
                    { label: 'Default', value: 'default' },
                    { label: 'Warning', value: 'warning' },
                    { label: 'Error', value: 'error' },
                  ]}
                  onChange={(value) => setFormStatus(value as RangeStatus)}
                />
              </ControlField>

              <Space wrap>
                <Switch checked={allowClear} onChange={setAllowClear} checkedChildren="清除" />
                <Switch checked={allowEmpty} onChange={setAllowEmpty} checkedChildren="空值" />
                <Switch checked={order} onChange={setOrder} checkedChildren="排序" />
              </Space>

              <Form layout="vertical" style={{ margin: 0 }}>
                <Form.Item
                  label="受控范围"
                  validateStatus={status}
                  hasFeedback={!!status}
                  help={status ? 'Form status: ' + status : undefined}
                  style={{ margin: 0 }}
                >
                  <InputNumberRange
                    value={rangeValue}
                    onChange={(nextValue) => setRangeValue(nextValue)}
                    min={0}
                    max={1000}
                    step={5}
                    precision={0}
                    allowClear={allowClear}
                    allowEmpty={allowEmpty}
                    order={order}
                    suffix="RMB"
                    style={{ width: '100%', maxWidth: 360 }}
                  />
                </Form.Item>
              </Form>

              <Space wrap>
                <Button size="small" onClick={() => setRangeValue([10, 30])}>
                  10 / 30
                </Button>
                <Button size="small" onClick={() => setRangeValue([60, 20])}>
                  60 / 20
                </Button>
                <Button size="small" onClick={() => setRangeValue([null, null])}>
                  置空
                </Button>
              </Space>
            </div>

            <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
              <Text type="secondary">placeholder</Text>
              <Text code>
                {startPlaceholder} / {endPlaceholder}
              </Text>
              <Divider style={{ margin: 0 }} />
              <Text type="secondary">controlled value</Text>
              <Text code>{JSON.stringify(rangeValue)}</Text>
              <Divider style={{ margin: 0 }} />
              <Text type="secondary">zby-pro intl smoke</Text>
              <Text>{intl.getMessage('zby.pro.layout.title', '控制台')}</Text>
            </div>
          </div>
        </section>

        <section style={sectionStyle}>
          <Title level={5} style={{ margin: 0 }}>
            状态矩阵
          </Title>
          <div style={gridStyle}>
            {renderCase(
              '默认上下文',
              <InputNumberRange
                defaultValue={[1, 9]}
                allowClear
                suffix="kg"
                style={{ width: '100%' }}
              />,
            )}
            {renderCase(
              'value={undefined} 非受控',
              <InputNumberRange
                value={undefined}
                defaultValue={[5, 15]}
                allowClear
                style={{ width: '100%' }}
              />,
            )}
            {renderCase(
              '局部禁用右侧',
              <InputNumberRange
                defaultValue={[100, 200]}
                disabled={[false, true]}
                allowClear
                suffix="pcs"
                style={{ width: '100%' }}
              />,
            )}
            {renderCase(
              '显式 error 状态',
              <InputNumberRange
                defaultValue={[3, 7]}
                status="error"
                allowClear
                style={{ width: '100%' }}
              />,
            )}
            {renderCase(
              '大尺寸 + filled',
              <InputNumberRange
                defaultValue={[8, 18]}
                size="large"
                variant="filled"
                allowClear
                style={{ width: '100%' }}
              />,
            )}
            {renderCase(
              '自定义分隔符',
              <InputNumberRange
                defaultValue={[2, 8]}
                separator="to"
                allowClear
                style={{ width: '100%' }}
              />,
            )}
            {renderCase('inputNumber', <InputNumber style={{ width: '100%' }} />)}
          </div>
        </section>
      </Space>
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
      componentSize={componentSize}
      componentDisabled={componentDisabled}
      variant={variant}
      theme={{ algorithm: algorithms, cssVar: { prefix: 'zby-playground' } }}
    >
      <ZbyIntlProvider
        locale={locale}
        fallbackLocale="zh-CN"
        resources={resources}
        onLocaleChange={(nextLocale) => setLocale(nextLocale as PlaygroundLocale)}
      >
        <PlaygroundDebug
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
    <PlaygroundApp />
  </React.StrictMode>,
)
