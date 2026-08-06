import { ProLayoutContentContainer } from '@zby/pro'
import { Space, Tag, Typography, theme } from 'antd'
import * as React from 'react'

const { Text, Title } = Typography

export interface PlaygroundPageProps {
  title: string
  description: React.ReactNode
  children: React.ReactNode
}

export function PlaygroundPage(props: PlaygroundPageProps) {
  const { title, description, children } = props

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
                @zby/ui
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
  minItemWidth?: number
  style?: React.CSSProperties
}

export function PlaygroundGrid(props: PlaygroundGridProps) {
  const { children, minItemWidth = 280, style } = props

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minItemWidth}px), 1fr))`,
        gap: 16,
        ...style,
      }}
    >
      {children}
    </div>
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

  return (
    <article
      style={{
        display: 'grid',
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
      {children}
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
