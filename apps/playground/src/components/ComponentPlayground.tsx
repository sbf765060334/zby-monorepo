import { ProLayoutContentContainer } from '@zby/pro'
import { Space, Tag, Typography, theme } from 'antd'
import * as React from 'react'

const { Text, Title } = Typography

const PlaygroundHeavyContext = React.createContext(false)

function PlaygroundDeferredMount(props: {
  children: React.ReactNode
  minHeight: number
}) {
  const { children, minHeight } = props
  const ref = React.useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = React.useState(
    () => typeof IntersectionObserver === 'undefined',
  )

  React.useLayoutEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      setMounted(true)
      return undefined
    }

    const margin = 480
    const syncVisible = () => {
      const rect = node.getBoundingClientRect()
      return rect.bottom > -margin && rect.top < window.innerHeight + margin
    }

    setMounted(syncVisible())

    const observer = new IntersectionObserver(
      ([entry]) => {
        setMounted(entry.isIntersecting)
      },
      { rootMargin: `${margin}px 0px`, threshold: 0 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ minHeight: mounted ? undefined : minHeight }}>
      {mounted ? children : null}
    </div>
  )
}

export interface PlaygroundPageProps {
  title: string
  description: React.ReactNode
  children: React.ReactNode
  packageName?: string
}

export function PlaygroundPage(props: PlaygroundPageProps) {
  const { title, description, children, packageName = '@zby/ui' } = props

  return (
    <ProLayoutContentContainer mode="stack">
      <ProLayoutContentContainer.Item>
        <Space orientation="vertical" size={24} style={{ width: '100%' }}>
          <header style={{ display: 'grid', gap: 6 }}>
            <Space wrap size={8} align="center">
              <Title level={3} style={{ margin: 0 }}>
                {title}
              </Title>
              <Tag color="blue" variant="filled">
                {packageName}
              </Tag>
            </Space>
            <Text type="secondary">{description}</Text>
          </header>
          {children}
        </Space>
      </ProLayoutContentContainer.Item>
    </ProLayoutContentContainer>
  )
}

export interface PlaygroundSectionProps {
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
}

export function PlaygroundSection(props: PlaygroundSectionProps) {
  const { title, description, children } = props
  const { token } = theme.useToken()

  return (
    <section
      style={{
        display: 'grid',
        gap: 16,
        paddingBlockStart: 20,
        borderBlockStart: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
      }}
    >
      <div style={{ display: 'grid', gap: 4 }}>
        <Title level={5} style={{ margin: 0 }}>
          {title}
        </Title>
        {description ? <Text type="secondary">{description}</Text> : null}
      </div>
      {children}
    </section>
  )
}

export interface PlaygroundGridProps {
  children: React.ReactNode
  /** 小组件一行三列；Table / ProTable 等大组件一行一张卡片。 */
  columns?: 1 | 3
  style?: React.CSSProperties
}

export function PlaygroundGrid(props: PlaygroundGridProps) {
  const { children, columns = 3, style } = props

  return (
    <PlaygroundHeavyContext.Provider value={columns === 1}>
      <div
        style={{
          display: 'grid',
          width: '100%',
          gridTemplateColumns:
            columns === 1 ? 'minmax(0, 1fr)' : 'repeat(3, minmax(0, 1fr))',
          gap: 16,
          alignItems: 'start',
          ...style,
        }}
      >
        {children}
      </div>
    </PlaygroundHeavyContext.Provider>
  )
}

export interface PlaygroundCaseProps {
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  style?: React.CSSProperties
}

export function PlaygroundCase(props: PlaygroundCaseProps) {
  const { title, description, children, style } = props
  const { token } = theme.useToken()
  const deferHeavyExample = React.useContext(PlaygroundHeavyContext)

  return (
    <article
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        gap: 12,
        alignContent: 'start',
        minWidth: 0,
        padding: 16,
        border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        background: token.colorBgContainer,
        ...style,
      }}
    >
      <div style={{ display: 'grid', gap: 4 }}>
        <Text strong>{title}</Text>
        {description ? <Text type="secondary">{description}</Text> : null}
      </div>
      {deferHeavyExample ? (
        <PlaygroundDeferredMount minHeight={360}>{children}</PlaygroundDeferredMount>
      ) : (
        children
      )}
    </article>
  )
}

export function PlaygroundControl(props: {
  label: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
      <Text type="secondary">{props.label}</Text>
      {props.children}
    </div>
  )
}

export function PlaygroundStatus(props: {
  label?: React.ReactNode
  children: React.ReactNode
}) {
  const { label = '最近事件', children } = props
  const { token } = theme.useToken()

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
        minHeight: token.controlHeight,
        padding: 12,
        borderRadius: token.borderRadiusLG,
        background: token.colorInfoBg,
      }}
    >
      <Text strong>{label}：</Text>
      <Text code>{children}</Text>
    </div>
  )
}
