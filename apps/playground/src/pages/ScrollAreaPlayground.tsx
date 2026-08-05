import {
  Button,
  ColorPicker,
  ConfigProvider,
  InputNumber,
  Segmented,
  Slider,
  Space,
  Typography,
  theme,
} from 'antd'
import { ScrollArea } from '@zby/ui'
import type { ScrollAreaDirection, ScrollAreaScrollbar, ScrollAreaWheelBehavior } from '@zby/ui'
import React from 'react'
import {
  PlaygroundCase,
  PlaygroundControl,
  PlaygroundPage,
  PlaygroundStatus,
} from '../components/ComponentPlayground'

const { Text, Title } = Typography
const ControlField = PlaygroundControl
const DemoCase = PlaygroundCase

type ScrollbarMode = 'hover' | 'scrolling' | 'always' | 'native' | 'off'

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
  const [wheelBehavior, setWheelBehavior] = React.useState<ScrollAreaWheelBehavior>('native')
  const [scrollPosition, setScrollPosition] = React.useState({ left: 0, top: 0 })
  const [wheelEventSource, setWheelEventSource] = React.useState('等待滚轮事件')
  const [trackSize, setTrackSize] = React.useState(10)
  const [thumbBg, setThumbBg] = React.useState('#1677ff')
  const [thumbHoverBg, setThumbHoverBg] = React.useState('#52c41a')
  const [zIndex, setZIndex] = React.useState(24)
  const [refStatus, setRefStatus] = React.useState('未检查')
  const viewportRef = React.useRef<HTMLDivElement>(null)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const viewportPropsRef = React.useRef<HTMLDivElement>(null)

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
    <PlaygroundPage
      title="ScrollArea"
      description="滚动方向、滚动条策略、滚轮映射、语义节点、组件 Token 和嵌套场景完整预览。"
    >
      <PlaygroundStatus label="滚动位置">
        scrollLeft={Math.round(scrollPosition.left)} / scrollTop={Math.round(scrollPosition.top)}
      </PlaygroundStatus>

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
              options={[
                { label: 'hover', value: 'hover' },
                { label: 'scroll', value: 'scrolling' },
                { label: 'always', value: 'always' },
                { label: 'native', value: 'native' },
                { label: 'off', value: 'off' },
              ]}
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
        </div>

        <DemoCase title="实时预览">
          <ScrollArea
            direction={direction}
            scrollbar={scrollbar}
            wheelBehavior={wheelBehavior}
            onWheel={() => setWheelEventSource('root onWheel 已触发')}
            style={{ ...scrollFrameStyle, height: 260 }}
            viewportProps={{
              'aria-label': 'ScrollArea interactive viewport',
              onWheel: () => setWheelEventSource('viewportProps.onWheel 已触发'),
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
          <Text code>{wheelEventSource}</Text>
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
          <DemoCase title="vertical / scrolling">
            <ScrollArea direction="vertical" scrollbar="scrolling" style={scrollFrameStyle}>
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
          <DemoCase title='scrollbar="native"'>
            <ScrollArea direction="both" scrollbar="native" style={scrollFrameStyle}>
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
              <Button
                onClick={() =>
                  setRefStatus(
                    rootRef.current &&
                          viewportRef.current &&
                          viewportRef.current === viewportPropsRef.current
                      ? 'root 与两个 viewport ref 均已就绪'
                      : 'Ref 尚未就绪',
                  )
                }
              >
                检查 Ref
              </Button>
            </Space>
            <ScrollArea
              ref={rootRef}
              className="scroll-area-ref-class"
              rootClassName="scroll-area-ref-root-class"
              data-preview="ref"
              direction="vertical"
              scrollbar="always"
              viewportRef={viewportRef}
              viewportProps={{
                ref: viewportPropsRef,
                tabIndex: 0,
                'aria-label': 'Imperative scroll viewport',
              }}
              style={scrollFrameStyle}
            >
              <VerticalContent />
            </ScrollArea>
            <Text code>{refStatus}</Text>
          </DemoCase>

          <DemoCase title="classNames / styles">
            <ScrollArea
              direction="vertical"
              scrollbar="always"
              classNames={({ props }) => ({
                root:
                      props.direction === 'vertical'
                        ? 'scroll-area-semantic-root'
                        : undefined,
                viewport: 'scroll-area-semantic-viewport',
                content: 'scroll-area-semantic-content',
                verticalTrack: 'scroll-area-semantic-track',
                verticalThumb: 'scroll-area-semantic-thumb',
              })}
              styles={({ props }) => ({
                root: {
                  ...scrollFrameStyle,
                  borderColor:
                        props.scrollbar === false
                          ? token.colorBorder
                          : token.colorPrimary,
                },
                viewport: { background: token.colorFillQuaternary },
                content: { minHeight: '100%' },
                verticalTrack: { insetInlineEnd: 6, width: 8 },
                verticalThumb: { background: token.colorSuccess },
              })}
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
    </PlaygroundPage>
  )
}
