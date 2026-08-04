import {
  CloseOutlined,
  FilterOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { ActionReveal, type ActionRevealContentRender } from '@zby/ui'
import {
  App,
  Button,
  ConfigProvider,
  Input,
  Space,
  Switch,
  Tag,
  Typography,
  theme,
  type InputRef,
} from 'antd'
import * as React from 'react'
import {
  PlaygroundCase,
  PlaygroundGrid,
  PlaygroundPage,
  PlaygroundSection,
  PlaygroundStatus,
} from '../components/ComponentPlayground'

const { Text } = Typography

function renderInputContent(
  placeholder: string,
  prefix: React.ReactNode = <SearchOutlined />,
): ActionRevealContentRender {
  return ({ contentProps }) => (
    <Input
      ref={contentProps.ref as React.Ref<InputRef>}
      className={contentProps.className}
      style={contentProps.style}
      hidden={contentProps.hidden}
      onBlur={contentProps.onBlur}
      prefix={prefix}
      placeholder={placeholder}
    />
  )
}

export default function ActionRevealPlayground() {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const [controlledOpen, setControlledOpen] = React.useState(false)
  const [hidden, setHidden] = React.useState(false)
  const [lastSearch, setLastSearch] = React.useState('')
  const [lastEvent, setLastEvent] = React.useState('等待交互')

  const reportEvent = (event: string) => {
    setLastEvent(event)
    void message.success(event)
  }

  return (
    <PlaygroundPage
      title="ActionReveal"
      description="行内展开、自动测宽、焦点管理、受控状态和语义样式的完整预览。"
    >
      <PlaygroundStatus>{lastEvent}</PlaygroundStatus>

      <PlaygroundSection
        title="基础展开与宽度"
        description="覆盖显式宽度、内容自然测宽和语义样式宽度三种动画终点来源。"
      >
        <PlaygroundGrid>
          <PlaygroundCase
            title="显式 width"
            description="点击图标展开为 240px 输入框，焦点离开后自动收起。"
          >
            <ActionReveal
              triggerIcon={<SearchOutlined />}
              actionIconProps={{ 'aria-label': '打开基础搜索' }}
              width={240}
              onOpenChange={(open) => setLastEvent(open ? '基础搜索已展开' : '基础搜索已收起')}
              content={renderInputContent('搜索门店')}
            />
          </PlaygroundCase>

          <PlaygroundCase
            title="无 width 自动测量"
            description="目标宽度来自内容自然尺寸，点击内容可主动收起。"
          >
            <ActionReveal
              triggerIcon={<SettingOutlined />}
              actionIconProps={{ 'aria-label': '打开自动测宽内容' }}
              content={({ close, contentProps }) => {
                const { ref, ...restProps } = contentProps

                return (
                  <button
                    {...restProps}
                    ref={ref as React.Ref<HTMLButtonElement>}
                    type="button"
                    onClick={() => {
                      reportEvent('自动测宽内容主动收起')
                      close()
                    }}
                  >
                    自动测宽内容，点击收起
                  </button>
                )
              }}
            />
          </PlaygroundCase>

          <PlaygroundCase
            title="styles.content 提供宽度"
            description="语义样式中的 width、overflow 和 transition 保持调用方优先级。"
          >
            <ActionReveal
              triggerIcon={<FilterOutlined />}
              actionIconProps={{ 'aria-label': '打开语义样式筛选' }}
              styles={{
                content: {
                  width: 280,
                  overflow: 'visible',
                  transition: `width ${token.motionDurationSlow} ${token.motionEaseInOut}`,
                },
              }}
              content={renderInputContent('筛选条件', <FilterOutlined />)}
            />
          </PlaygroundCase>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection
        title="尺寸、初始状态与触发器"
        description="验证按钮尺寸、defaultOpen、autoFocus、hidden、disabled 和 actionIconProps。"
      >
        <PlaygroundGrid>
          <PlaygroundCase
            title="small / middle / large"
            description="关闭态复用 ActionIcon，三档尺寸保持一致。"
          >
            <Space wrap>
              {(['small', 'middle', 'large'] as const).map((size) => (
                <ActionReveal
                  key={size}
                  size={size}
                  width={size === 'small' ? 180 : size === 'large' ? 260 : 220}
                  triggerIcon={<SearchOutlined />}
                  actionIconProps={{ 'aria-label': `打开 ${size} 搜索`, title: size }}
                  content={renderInputContent(`${size} 搜索`)}
                />
              ))}
            </Space>
          </PlaygroundCase>

          <PlaygroundCase
            title="defaultOpen + 主动关闭"
            description="默认展开但不抢焦点，collapseOnBlur=false 时只能主动关闭。"
          >
            <ActionReveal
              defaultOpen
              autoFocus={false}
              collapseOnBlur={false}
              width={300}
              triggerIcon={<SettingOutlined />}
              actionIconProps={{ 'aria-label': '重新打开默认内容' }}
              content={({ close, contentProps, open, expanded }) => {
                const { ref, ...restProps } = contentProps

                return (
                  <div
                    {...restProps}
                    ref={ref as React.Ref<HTMLDivElement>}
                    tabIndex={-1}
                  >
                    <Space style={{ width: '100%', paddingInline: 8 }}>
                      <Text ellipsis style={{ flex: 1 }}>
                        open={String(open)} / expanded={String(expanded)}
                      </Text>
                      <Button
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={() => {
                          reportEvent('默认展开内容已主动关闭')
                          close()
                        }}
                      >
                        收起
                      </Button>
                    </Space>
                  </div>
                )
              }}
            />
          </PlaygroundCase>

          <PlaygroundCase
            title="hidden / disabled / 阻止展开"
            description="原生状态和触发按钮事件都由关闭态按钮承接。"
          >
            <Space orientation="vertical">
              <Switch
                checked={hidden}
                onChange={setHidden}
                checkedChildren="隐藏"
                unCheckedChildren="显示"
              />
              <Space wrap>
                <ActionReveal
                  hidden={hidden}
                  triggerIcon={<SearchOutlined />}
                  actionIconProps={{ 'aria-label': '可隐藏触发器' }}
                  content={renderInputContent('可隐藏内容')}
                />
                <ActionReveal
                  disabled
                  triggerIcon={<SearchOutlined />}
                  actionIconProps={{ 'aria-label': '禁用触发器' }}
                  content={renderInputContent('不会展开')}
                />
                <ActionReveal
                  triggerIcon={<SearchOutlined />}
                  actionIconProps={{
                    'aria-label': '阻止展开触发器',
                    danger: true,
                    onClick: (event) => {
                      event.preventDefault()
                      reportEvent('actionIconProps.onClick 已阻止展开')
                    },
                  }}
                  content={renderInputContent('不会展开')}
                />
              </Space>
            </Space>
          </PlaygroundCase>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection
        title="焦点与受控状态"
        description="验证复合输入焦点边界、受控开合和关闭后的焦点恢复。"
      >
        <PlaygroundGrid>
          <PlaygroundCase
            title="复合 Input.Search"
            description="输入框与搜索按钮之间移动焦点时保持展开。"
          >
            <ActionReveal
              triggerIcon={<SearchOutlined />}
              actionIconProps={{ 'aria-label': '打开复合搜索' }}
              width={320}
              content={({ contentProps }) => (
                <Input.Search
                  ref={contentProps.ref as React.Ref<InputRef>}
                  className={contentProps.className}
                  style={contentProps.style}
                  hidden={contentProps.hidden}
                  onBlur={contentProps.onBlur}
                  enterButton="搜索"
                  placeholder="输入后按 Tab"
                  onSearch={(value) => {
                    setLastSearch(value)
                    reportEvent(`搜索：${value || '空内容'}`)
                  }}
                />
              )}
            />
            <Text type="secondary">最近搜索：{lastSearch || '—'}</Text>
          </PlaygroundCase>

          <PlaygroundCase
            title="受控 open + close"
            description="外部状态是唯一真值，内容主动关闭后焦点回到触发按钮。"
          >
            <Space orientation="vertical">
              <Space>
                <Switch checked={controlledOpen} onChange={setControlledOpen} />
                <Text>{controlledOpen ? '已展开' : '已收起'}</Text>
              </Space>
              <ActionReveal
                open={controlledOpen}
                onOpenChange={(open) => {
                  setControlledOpen(open)
                  setLastEvent(open ? '受控内容请求展开' : '受控内容请求收起')
                }}
                triggerIcon={<SettingOutlined />}
                actionIconProps={{ 'aria-label': '打开受控内容' }}
                collapseOnBlur={false}
                width={300}
                content={({ close, contentProps }) => {
                  const { ref, ...restProps } = contentProps

                  return (
                    <div
                      {...restProps}
                      ref={ref as React.Ref<HTMLDivElement>}
                      tabIndex={-1}
                    >
                      <Space style={{ width: '100%', paddingInline: 8 }}>
                        <Input placeholder="受控内容" />
                        <Button size="small" onClick={close}>
                          收起
                        </Button>
                      </Space>
                    </div>
                  )
                }}
              />
            </Space>
          </PlaygroundCase>

          <PlaygroundCase
            title="collapsedWidth"
            description="显式指定 56px 动画起点，展开到 260px。"
          >
            <ActionReveal
              collapsedWidth={56}
              width={260}
              triggerIcon={<FilterOutlined />}
              actionIconProps={{ 'aria-label': '打开自定义折叠宽度' }}
              content={renderInputContent('自定义折叠宽度', <FilterOutlined />)}
            />
          </PlaygroundCase>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection
        title="语义节点、主题与前缀"
        description="覆盖 className/styles 回调、原生类名、自定义 prefixCls、暗色主题和 RTL。"
      >
        <PlaygroundGrid>
          <PlaygroundCase title="classNames / styles 回调">
            <ActionReveal
              className="action-reveal-content-class"
              rootClassName="action-reveal-root-class"
              style={{ borderRadius: token.borderRadius }}
              width={280}
              triggerIcon={<SearchOutlined />}
              actionIconProps={{ 'aria-label': '打开语义样式内容' }}
              classNames={({ props }) => ({
                trigger: props.open ? undefined : 'action-reveal-semantic-trigger',
                content: props.open ? 'action-reveal-semantic-content' : undefined,
              })}
              styles={({ props }) => ({
                trigger: { color: props.disabled ? token.colorTextDisabled : token.colorPrimary },
                content: {
                  border: `${token.lineWidth}px ${token.lineType} ${token.colorPrimaryBorder}`,
                  background: token.colorPrimaryBg,
                },
              })}
              content={renderInputContent('语义样式输入框')}
            />
          </PlaygroundCase>

          <PlaygroundCase title="暗色 + RTL + 自定义前缀">
            <ConfigProvider
              prefixCls="preview"
              direction="rtl"
              theme={{ algorithm: theme.darkAlgorithm, cssVar: { key: 'action-reveal-dark' } }}
            >
              <div
                style={{
                  padding: 16,
                  borderRadius: token.borderRadiusLG,
                  background: '#141414',
                }}
              >
                <ActionReveal
                  prefixCls="preview-action-reveal"
                  width={260}
                  triggerIcon={<SearchOutlined />}
                  actionIconProps={{ 'aria-label': '打开 RTL 搜索' }}
                  content={renderInputContent('RTL 暗色搜索')}
                />
              </div>
            </ConfigProvider>
            <Space wrap>
              <Tag color="purple">RTL</Tag>
              <Tag color="geekblue">darkAlgorithm</Tag>
              <Tag color="cyan">CSS Variables</Tag>
            </Space>
          </PlaygroundCase>
        </PlaygroundGrid>
      </PlaygroundSection>
    </PlaygroundPage>
  )
}
