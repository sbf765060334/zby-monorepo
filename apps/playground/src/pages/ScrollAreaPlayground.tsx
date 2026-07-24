import {
  Button,
  ColorPicker,
  ConfigProvider,
  InputNumber,
  Segmented,
  Slider,
  Space,
  Switch,
  Typography,
  theme,
} from 'antd'
import { ScrollArea } from '@zby/ui'
import type { ScrollAreaDirection, ScrollAreaScrollbar, ScrollAreaWheelBehavior } from '@zby/ui'
import React from 'react'

const { Text, Title } = Typography

type ScrollbarMode = 'hover' | 'scrolling' | 'always' | 'off'

const verticalRows = Array.from({ length: 24 }, (_, index) => ({
  id: String(index + 1).padStart(2, '0'),
  name: `运输任务 ZBY-${String(index + 1).padStart(3, '0')}`,
  status: index % 3 === 0 ? '待处理' : index % 3 === 1 ? '执行中' : '已完成',
}))

const horizontalItems = Array.from({ length: 10 }, (_, index) => ({
  id: index + 1,
  title: `节点 ${index + 1}`,
  value: `${18 + index * 7}%`,
}))

const gridCells = Array.from({ length: 30 }, (_, index) => `单元格 ${index + 1}`)

function ControlField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
      <Text type="secondary">{label}</Text>
      {children}
    </div>
  )
}

function DemoCase({
  title,
  children,
  style,
}: {
  title: string
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  const { token } = theme.useToken()

  return (
    <article
      style={{
        display: 'grid',
        gap: 10,
        minWidth: 0,
        padding: 14,
        border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
        borderRadius: 8,
        background: token.colorBgContainer,
        ...style,
      }}
    >
      <Text strong>{title}</Text>
      {children}
    </article>
  )
}

function VerticalContent() {
  const { token } = theme.useToken()

  return (
    <div style={{ minWidth: 360 }}>
      {verticalRows.map((row) => (
        <div
          key={row.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '40px minmax(180px, 1fr) 64px',
            gap: 12,
            alignItems: 'center',
            minHeight: 42,
            paddingInline: 12,
            borderBlockEnd: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
          }}
        >
          <Text type="secondary">{row.id}</Text>
          <Text>{row.name}</Text>
          <Text
            style={{
              color:
                row.status === '已完成'
                  ? token.colorSuccess
                  : row.status === '执行中'
                    ? token.colorPrimary
                    : token.colorWarning,
            }}
          >
            {row.status}
          </Text>
        </div>
      ))}
    </div>
  )
}

function HorizontalContent() {
  const { token } = theme.useToken()

  return (
    <div style={{ display: 'flex', gap: 12, width: 'max-content', padding: 12 }}>
      {horizontalItems.map((item) => (
        <div
          key={item.id}
          style={{
            display: 'grid',
            alignContent: 'space-between',
            width: 148,
            height: 104,
            padding: 12,
            border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
            borderRadius: 6,
            background: item.id % 2 === 0 ? token.colorFillAlter : token.colorBgElevated,
          }}
        >
          <Text type="secondary">{item.title}</Text>
          <Text style={{ color: token.colorPrimary, fontSize: token.fontSizeHeading4 }}>
            {item.value}
          </Text>
        </div>
      ))}
    </div>
  )
}

function BothContent() {
  const { token } = theme.useToken()

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 156px)',
        gap: 8,
        width: 836,
        padding: 12,
      }}
    >
      {gridCells.map((cell, index) => (
        <div
          key={cell}
          style={{
            display: 'grid',
            placeItems: 'center',
            height: 52,
            border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
            borderRadius: 4,
            color: index % 4 === 0 ? token.colorPrimary : token.colorText,
            background: index % 3 === 0 ? token.colorFillSecondary : token.colorBgContainer,
          }}
        >
          {cell}
        </div>
      ))}
    </div>
  )
}

function getContent(direction: ScrollAreaDirection) {
  if (direction === 'horizontal') return <HorizontalContent />
  if (direction === 'both') return <BothContent />
  return <VerticalContent />
}

export default function ScrollAreaPlayground() {
  const { token } = theme.useToken()
  const [direction, setDirection] = React.useState<ScrollAreaDirection>('vertical')
  const [scrollbarMode, setScrollbarMode] = React.useState<ScrollbarMode>('hover')
  const [wheelBehavior, setWheelBehavior] = React.useState<ScrollAreaWheelBehavior>('axis-mapping')
  const [nativeScrollbar, setNativeScrollbar] = React.useState(false)
  const [scrollPosition, setScrollPosition] = React.useState({ left: 0, top: 0 })
  const [trackSize, setTrackSize] = React.useState(10)
  const [thumbBg, setThumbBg] = React.useState('#1677ff')
  const [thumbHoverBg, setThumbHoverBg] = React.useState('#52c41a')
  const [zIndex, setZIndex] = React.useState(24)
  const viewportRef = React.useRef<HTMLDivElement>(null)

  const scrollbar: ScrollAreaScrollbar =
    scrollbarMode === 'off' ? false : (scrollbarMode as Exclude<ScrollbarMode, 'off'>)

  const sectionStyle: React.CSSProperties = {
    display: 'grid',
    gap: 16,
    paddingBlockStart: 20,
    borderBlockStart: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
  }
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 16,
  }
  const controlGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: 14,
  }
  const scrollFrameStyle: React.CSSProperties = {
    width: '100%',
    height: 210,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: 6,
    background: token.colorBgContainer,
  }

  return (
    <Space orientation="vertical" size={24} style={{ width: '100%' }}>
      <header>
        <Title level={3} style={{ margin: 0 }}>
          ScrollArea
        </Title>
        <Text type="secondary">@zby/ui component playground</Text>
      </header>

      <section style={sectionStyle}>
        <Title level={5} style={{ margin: 0 }}>
          交互实验台
        </Title>
        <div style={controlGridStyle}>
          <ControlField label="direction">
            <Segmented
              block
              value={direction}
              options={['vertical', 'horizontal', 'both']}
              onChange={(value) => setDirection(value as ScrollAreaDirection)}
            />
          </ControlField>
          <ControlField label="scrollbar">
            <Segmented
              block
              value={scrollbarMode}
              options={['hover', 'scrolling', 'always', 'off']}
              onChange={(value) => setScrollbarMode(value as ScrollbarMode)}
            />
          </ControlField>
          <ControlField label="wheelBehavior">
            <Segmented
              block
              value={wheelBehavior}
              options={['axis-mapping', 'native']}
              onChange={(value) => setWheelBehavior(value as ScrollAreaWheelBehavior)}
            />
          </ControlField>
          <ControlField label="nativeScrollbar">
            <Switch
              checked={nativeScrollbar}
              checkedChildren="Native"
              unCheckedChildren="Custom"
              onChange={setNativeScrollbar}
            />
          </ControlField>
        </div>

        <DemoCase title="实时预览">
          <ScrollArea
            direction={direction}
            scrollbar={scrollbar}
            wheelBehavior={wheelBehavior}
            nativeScrollbar={nativeScrollbar}
            style={{ ...scrollFrameStyle, height: 260 }}
            viewportProps={{
              'aria-label': 'ScrollArea interactive viewport',
              onScroll: (event) =>
                setScrollPosition({
                  left: event.currentTarget.scrollLeft,
                  top: event.currentTarget.scrollTop,
                }),
            }}
          >
            {getContent(direction)}
          </ScrollArea>
          <Text code>
            scrollLeft: {Math.round(scrollPosition.left)} / scrollTop:{' '}
            {Math.round(scrollPosition.top)}
          </Text>
        </DemoCase>
      </section>

      <section style={sectionStyle}>
        <Title level={5} style={{ margin: 0 }}>
          方向与展示策略
        </Title>
        <div style={gridStyle}>
          <DemoCase title="vertical / hover">
            <ScrollArea direction="vertical" scrollbar="hover" style={scrollFrameStyle}>
              <VerticalContent />
            </ScrollArea>
          </DemoCase>
          <DemoCase title="horizontal / scrolling">
            <ScrollArea
              direction="horizontal"
              scrollbar="scrolling"
              wheelBehavior="axis-mapping"
              style={scrollFrameStyle}
            >
              <HorizontalContent />
            </ScrollArea>
          </DemoCase>
          <DemoCase title="both / always">
            <ScrollArea direction="both" scrollbar="always" style={scrollFrameStyle}>
              <BothContent />
            </ScrollArea>
          </DemoCase>
          <DemoCase title="scrollbar={false}">
            <ScrollArea direction="vertical" scrollbar={false} style={scrollFrameStyle}>
              <VerticalContent />
            </ScrollArea>
          </DemoCase>
          <DemoCase title="nativeScrollbar">
            <ScrollArea direction="both" nativeScrollbar style={scrollFrameStyle}>
              <BothContent />
            </ScrollArea>
          </DemoCase>
          <DemoCase title="horizontal / native wheel">
            <ScrollArea
              direction="horizontal"
              scrollbar="always"
              wheelBehavior="native"
              style={scrollFrameStyle}
            >
              <HorizontalContent />
            </ScrollArea>
          </DemoCase>
        </div>
      </section>

      <section style={sectionStyle}>
        <Title level={5} style={{ margin: 0 }}>
          Ref、Semantic 与前缀
        </Title>
        <div style={gridStyle}>
          <DemoCase title="viewportRef / viewportProps">
            <Space wrap>
              <Button onClick={() => viewportRef.current?.scrollTo({ top: 0 })}>顶部</Button>
              <Button
                onClick={() =>
                  viewportRef.current?.scrollTo({
                    top: viewportRef.current.scrollHeight,
                    behavior: 'smooth',
                  })
                }
              >
                底部
              </Button>
            </Space>
            <ScrollArea
              direction="vertical"
              scrollbar="always"
              viewportRef={viewportRef}
              viewportProps={{ tabIndex: 0, 'aria-label': 'Imperative scroll viewport' }}
              style={scrollFrameStyle}
            >
              <VerticalContent />
            </ScrollArea>
          </DemoCase>

          <DemoCase title="classNames / styles">
            <ScrollArea
              direction="vertical"
              scrollbar="always"
              classNames={{
                root: 'scroll-area-semantic-root',
                viewport: 'scroll-area-semantic-viewport',
                verticalTrack: 'scroll-area-semantic-track',
                verticalThumb: 'scroll-area-semantic-thumb',
              }}
              styles={{
                root: { ...scrollFrameStyle, borderColor: token.colorPrimary },
                viewport: { background: token.colorFillQuaternary },
                verticalTrack: { insetInlineEnd: 6, width: 8 },
                verticalThumb: { background: token.colorSuccess },
              }}
              viewportProps={{ tabIndex: 0, 'aria-label': 'Semantic styles viewport' }}
            >
              <VerticalContent />
            </ScrollArea>
          </DemoCase>

          <DemoCase title="custom prefixCls">
            <ScrollArea
              prefixCls="zby-demo-scroll-area"
              direction="horizontal"
              scrollbar="always"
              style={scrollFrameStyle}
            >
              <HorizontalContent />
            </ScrollArea>
            <Text code>zby-demo-scroll-area</Text>
          </DemoCase>
        </div>
      </section>

      <section style={sectionStyle}>
        <Title level={5} style={{ margin: 0 }}>
          Component Token
        </Title>
        <div style={controlGridStyle}>
          <ControlField label={`trackSize: ${trackSize}px`}>
            <Slider min={4} max={16} value={trackSize} onChange={setTrackSize} />
          </ControlField>
          <ControlField label="thumbBg">
            <ColorPicker showText value={thumbBg} onChange={(_, css) => setThumbBg(css)} />
          </ControlField>
          <ControlField label="thumbHoverBg">
            <ColorPicker
              showText
              value={thumbHoverBg}
              onChange={(_, css) => setThumbHoverBg(css)}
            />
          </ControlField>
          <ControlField label="zIndex">
            <InputNumber
              min={0}
              max={999}
              value={zIndex}
              onChange={(value) => setZIndex(value ?? 0)}
            />
          </ControlField>
        </div>
        <ConfigProvider
          theme={{
            components: {
              ScrollArea: {
                trackSize,
                thumbBg,
                thumbHoverBg,
                zIndex,
              },
            },
          }}
        >
          <ScrollArea
            direction="vertical"
            scrollbar="always"
            style={{ ...scrollFrameStyle, height: 220 }}
          >
            <VerticalContent />
          </ScrollArea>
        </ConfigProvider>
      </section>

      <section style={sectionStyle}>
        <Title level={5} style={{ margin: 0 }}>
          嵌套与 RTL
        </Title>
        <div style={gridStyle}>
          <DemoCase title="horizontal + nested vertical">
            <ScrollArea
              direction="horizontal"
              scrollbar="always"
              wheelBehavior="axis-mapping"
              style={scrollFrameStyle}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 24,
                  width: 840,
                  minHeight: '100%',
                  padding: 16,
                }}
              >
                <Title level={4} style={{ width: 220, margin: 0 }}>
                  外层横向区域
                </Title>
                <ScrollArea
                  direction="vertical"
                  scrollbar="always"
                  style={{ ...scrollFrameStyle, width: 360, height: 170 }}
                >
                  <VerticalContent />
                </ScrollArea>
                <Text style={{ width: 180 }}>尾部区域</Text>
              </div>
            </ScrollArea>
          </DemoCase>

          <DemoCase title="RTL horizontal">
            <ConfigProvider direction="rtl">
              <ScrollArea
                direction="horizontal"
                scrollbar="always"
                wheelBehavior="axis-mapping"
                style={scrollFrameStyle}
              >
                <HorizontalContent />
              </ScrollArea>
            </ConfigProvider>
          </DemoCase>
        </div>
      </section>
    </Space>
  )
}
