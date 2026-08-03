import { FilterOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons'
import { ProLayoutContentContainer } from '@zby/pro'
import { ActionReveal } from '@zby/ui'
import { Button, Input, Space, Switch, Typography, theme, type InputRef } from 'antd'
import * as React from 'react'

const { Text, Title } = Typography

export default function ActionRevealPlayground() {
  const { token } = theme.useToken()
  const [controlledOpen, setControlledOpen] = React.useState(false)
  const [lastSearch, setLastSearch] = React.useState('')

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
  const caseStyle: React.CSSProperties = {
    display: 'grid',
    gap: 12,
    alignContent: 'start',
    minWidth: 0,
    padding: 16,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgContainer,
  }

  return (
    <ProLayoutContentContainer mode="stack">
      <ProLayoutContentContainer.Item>
        <Space orientation="vertical" size={24} style={{ width: '100%' }}>
          <header>
            <Title level={3} style={{ margin: 0 }}>
              ActionReveal
            </Title>
            <Text type="secondary">
              @zby/ui 展开、焦点、自动测宽与样式覆盖回归页
            </Text>
          </header>

          <section style={sectionStyle}>
            <Title level={5} style={{ margin: 0 }}>
              基础与尺寸
            </Title>
            <div style={gridStyle}>
              <div style={caseStyle}>
                <Text strong>显式宽度</Text>
                <Text type="secondary">点击图标展开，输入框失焦后自动收起。</Text>
                <ActionReveal
                  triggerIcon={<SearchOutlined />}
                  actionIconProps={{ 'aria-label': '打开基础搜索' }}
                  width={240}
                  content={({ contentProps }) => (
                    <Input
                      ref={contentProps.ref as React.Ref<InputRef>}
                      className={contentProps.className}
                      style={contentProps.style}
                      hidden={contentProps.hidden}
                      onBlur={contentProps.onBlur}
                      prefix={<SearchOutlined />}
                      placeholder="搜索"
                    />
                  )}
                />
              </div>

              <div style={caseStyle}>
                <Text strong>无 width 自动测量</Text>
                <Text type="secondary">目标宽度来自内容自然尺寸，仍保持宽度动画。</Text>
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
                        onClick={close}
                      >
                        自动测宽内容，点击收起
                      </button>
                    )
                  }}
                />
              </div>

              <div style={caseStyle}>
                <Text strong>styles.content 提供宽度</Text>
                <Text type="secondary">验证语义样式不会被内部 width/overflow 覆盖。</Text>
                <ActionReveal
                  triggerIcon={<FilterOutlined />}
                  actionIconProps={{ 'aria-label': '打开筛选' }}
                  styles={{ content: { width: 280, overflow: 'visible' } }}
                  content={({ contentProps }) => (
                    <Input
                      ref={contentProps.ref as React.Ref<InputRef>}
                      className={contentProps.className}
                      style={contentProps.style}
                      hidden={contentProps.hidden}
                      onBlur={contentProps.onBlur}
                      prefix={<FilterOutlined />}
                      placeholder="筛选条件"
                    />
                  )}
                />
              </div>
            </div>
          </section>

          <section style={sectionStyle}>
            <Title level={5} style={{ margin: 0 }}>
              焦点与受控状态
            </Title>
            <div style={gridStyle}>
              <div style={caseStyle}>
                <Text strong>复合 Input.Search</Text>
                <Text type="secondary">
                  用 Tab 在输入框和搜索按钮之间移动时不应收起。
                </Text>
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
                      onSearch={setLastSearch}
                    />
                  )}
                />
                <Text type="secondary">最近搜索：{lastSearch || '—'}</Text>
              </div>

              <div style={caseStyle}>
                <Text strong>受控开合与主动关闭</Text>
                <Space>
                  <Switch checked={controlledOpen} onChange={setControlledOpen} />
                  <Text>{controlledOpen ? '已展开' : '已收起'}</Text>
                </Space>
                <ActionReveal
                  open={controlledOpen}
                  onOpenChange={setControlledOpen}
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
                <Text type="secondary">
                  点击“收起”后，焦点应回到重新出现的齿轮按钮。
                </Text>
              </div>
            </div>
          </section>
        </Space>
      </ProLayoutContentContainer.Item>
    </ProLayoutContentContainer>
  )
}
