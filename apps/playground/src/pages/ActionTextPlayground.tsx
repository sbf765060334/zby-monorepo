import {
  CheckOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  LinkOutlined,
  MoreOutlined,
  StarOutlined,
} from '@ant-design/icons'
import { ProLayoutContentContainer } from '@zby/pro'
import { ActionText } from '@zby/ui'
import {
  App,
  Button,
  ConfigProvider,
  Form,
  Input,
  Space,
  Switch,
  Tag,
  Typography,
  theme,
} from 'antd'
import * as React from 'react'

const { Text, Title } = Typography

const LONG_SHOP_NAME =
  '杭州西湖旗舰体验中心（湖滨银泰店）是一段用于验证单行省略、完整文本提示和操作区压缩行为的超长门店名称'

interface PreviewCaseProps {
  title: string
  description?: React.ReactNode
  children: React.ReactNode
  style?: React.CSSProperties
}

function PreviewCase(props: PreviewCaseProps) {
  const { title, description, children, style } = props
  const { token } = theme.useToken()

  return (
    <div
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
    </div>
  )
}

function CustomPrefixPreview() {
  const { token } = theme.useToken()

  return (
    <div
      style={{
        minWidth: 0,
        padding: 16,
        borderRadius: token.borderRadiusLG,
        color: token.colorText,
        background: token.colorBgContainer,
      }}
    >
      <ActionText
        copyable
        actionsVisibleOn="always"
        actions={[
          {
            key: 'rtl-more',
            icon: <MoreOutlined />,
            label: '更多',
          },
        ]}
      >
        RTL、暗色主题、CSS Variables 与自定义 prefixCls
      </ActionText>
    </div>
  )
}

export default function ActionTextPlayground() {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const [editedText, setEditedText] = React.useState('杭州西湖旗舰店')
  const [advancedText, setAdvancedText] = React.useState('上海静安体验店')
  const [controlledOpen, setControlledOpen] = React.useState(false)
  const [controlledVisited, setControlledVisited] = React.useState(false)
  const [showSemanticStyle, setShowSemanticStyle] = React.useState(true)
  const [lastEvent, setLastEvent] = React.useState('等待交互')

  const sectionStyle: React.CSSProperties = {
    display: 'grid',
    gap: 16,
    paddingBlockStart: 20,
    borderBlockStart: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
  }
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 16,
  }
  const constrainedPreviewStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 360,
    minWidth: 0,
    padding: 12,
    borderRadius: token.borderRadius,
    background: token.colorFillQuaternary,
  }

  const reportEvent = (event: string) => {
    setLastEvent(event)
    void message.success(event)
  }

  return (
    <ProLayoutContentContainer mode="stack">
      <ProLayoutContentContainer.Item>
        <Space orientation="vertical" size={24} style={{ width: '100%' }}>
          <header>
            <Title level={3} style={{ margin: 0 }}>
              ActionText
            </Title>
            <Text type="secondary">
              @zby/ui 文本省略、复制、编辑、点击访问、自定义操作与主题兼容完整预览页
            </Text>
          </header>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              alignItems: 'center',
              padding: 12,
              borderRadius: token.borderRadiusLG,
              background: token.colorInfoBg,
            }}
          >
            <Text strong>最近事件：</Text>
            <Text code>{lastEvent}</Text>
          </div>

          <section style={sectionStyle}>
            <Title level={5} style={{ margin: 0 }}>
              基础文本与省略
            </Title>
            <div style={gridStyle}>
              <PreviewCase
                title="默认单行省略"
                description="限制容器宽度，悬停文本可查看完整内容。"
              >
                <div style={constrainedPreviewStyle}>
                  <ActionText>{LONG_SHOP_NAME}</ActionText>
                </div>
              </PreviewCase>

              <PreviewCase
                title="两行省略 + 自定义 Tooltip"
                description="使用 rows=2，并自定义提示位置和内容。"
              >
                <div style={constrainedPreviewStyle}>
                  <ActionText
                    ellipsis={{
                      rows: 2,
                      tooltip: {
                        title: `完整名称：${LONG_SHOP_NAME}`,
                        placement: 'topLeft',
                      },
                    }}
                  >
                    {LONG_SHOP_NAME}
                  </ActionText>
                </div>
              </PreviewCase>

              <PreviewCase
                title="关闭省略"
                description="ellipsis=false 时完整显示 children，也支持数字内容。"
              >
                <Space orientation="vertical">
                  <ActionText ellipsis={false}>{LONG_SHOP_NAME}</ActionText>
                  <ActionText ellipsis={false}>{20260804}</ActionText>
                </Space>
              </PreviewCase>
            </div>
          </section>

          <section style={sectionStyle}>
            <Title level={5} style={{ margin: 0 }}>
              复制能力
            </Title>
            <div style={gridStyle}>
              <PreviewCase
                title="默认复制"
                description="复制 children，成功后展示默认反馈图标和提示。"
              >
                <ActionText copyable actionsVisibleOn="always">
                  默认复制文本
                </ActionText>
              </PreviewCase>

              <PreviewCase
                title="异步文本 + 自定义反馈"
                description="点击时异步生成文本，并覆盖复制前后的图标和提示。"
              >
                <ActionText
                  actionsVisibleOn="always"
                  copyable={{
                    text: async () => {
                      await new Promise((resolve) => setTimeout(resolve, 500))
                      return `异步门店编号-${Date.now()}`
                    },
                    icon: [<CopyOutlined key="copy" />, <CheckOutlined key="done" />],
                    tooltips: ['复制动态编号', '动态编号已复制'],
                    tabIndex: 0,
                    onCopy: () => reportEvent('异步文本复制成功'),
                  }}
                >
                  点击复制动态门店编号
                </ActionText>
              </PreviewCase>

              <PreviewCase
                title="HTML 格式"
                description="同时写入 text/html 和 text/plain；浏览器不支持时自动回退。"
              >
                <ActionText
                  actionsVisibleOn="always"
                  copyable={{
                    text: '<strong>杭州西湖旗舰店</strong>',
                    format: 'text/html',
                    tooltips: ['复制 HTML', 'HTML 已复制'],
                    onCopy: () => reportEvent('HTML 内容复制成功'),
                  }}
                >
                  复制带 strong 标签的 HTML
                </ActionText>
              </PreviewCase>
            </div>
          </section>

          <section style={sectionStyle}>
            <Title level={5} style={{ margin: 0 }}>
              编辑能力
            </Title>
            <div style={gridStyle}>
              <PreviewCase
                title="基础编辑"
                description="使用默认 Input、按钮文案和国际化标题。"
              >
                <ActionText
                  actionsVisibleOn="always"
                  editable={{
                    text: editedText,
                    onConfirm: (value) => {
                      setEditedText(value)
                      reportEvent(`基础编辑已保存：${value}`)
                    },
                  }}
                >
                  {editedText}
                </ActionText>
              </PreviewCase>

              <PreviewCase
                title="Textarea + 校验 + 异步确认"
                description="覆盖 name、Form、Form.Item、输入框、按钮和 Popover 配置。"
              >
                <ActionText
                  actionsVisibleOn="always"
                  editable={{
                    text: advancedText,
                    name: ['shop', 'name'],
                    title: '编辑完整门店名称',
                    inputType: 'textarea',
                    inputProps: {
                      autoSize: { minRows: 2, maxRows: 4 },
                      placeholder: '请输入门店名称',
                      maxLength: 80,
                      showCount: true,
                    },
                    formProps: { requiredMark: 'optional' },
                    formItemProps: {
                      label: '门店名称',
                      rules: [{ required: true, message: '请输入门店名称' }],
                    },
                    confirmText: '异步保存',
                    cancelText: '放弃',
                    confirmButtonProps: { icon: <CheckOutlined /> },
                    cancelButtonProps: { danger: true },
                    popoverProps: { placement: 'bottomLeft' },
                    onConfirm: async (value) => {
                      await new Promise((resolve) => setTimeout(resolve, 700))
                      setAdvancedText(value)
                      reportEvent(`高级编辑已保存：${value}`)
                    },
                    onCancel: () => reportEvent('已取消高级编辑'),
                  }}
                >
                  {advancedText}
                </ActionText>
              </PreviewCase>

              <PreviewCase
                title="受控打开 + 自定义表单"
                description="外部控制 open，并通过 renderForm 和 Form.initialValues 增加带初始值的备注字段。"
              >
                <Space orientation="vertical" style={{ width: '100%' }}>
                  <Space>
                    <Switch checked={controlledOpen} onChange={setControlledOpen} />
                    <Text>{controlledOpen ? 'Popover 已打开' : 'Popover 已关闭'}</Text>
                  </Space>
                  <ActionText
                    actionsVisibleOn="always"
                    editable={{
                      text: '深圳南山科技园店',
                      open: controlledOpen,
                      onOpenChange: setControlledOpen,
                      name: 'name',
                      title: '自定义编辑表单',
                      inputProps: { placeholder: '门店名称' },
                      formProps: {
                        initialValues: { remark: '重点客户，保存时请保留备注' },
                      },
                      renderForm: ({ name, inputNode }) => (
                        <>
                          <Form.Item
                            name={name}
                            label="门店名称"
                            rules={[{ required: true }]}
                          >
                            {inputNode}
                          </Form.Item>
                          <Form.Item name="remark" label="备注">
                            <Input.TextArea placeholder="可选备注" rows={2} />
                          </Form.Item>
                        </>
                      ),
                      onConfirm: (value, info) => {
                        reportEvent(
                          `自定义表单提交：${value} / ${info.values.remark || '无备注'}`,
                        )
                      },
                    }}
                  >
                    深圳南山科技园店
                  </ActionText>
                </Space>
              </PreviewCase>
            </div>
          </section>

          <section style={sectionStyle}>
            <Title level={5} style={{ margin: 0 }}>
              点击访问状态
            </Title>
            <div style={gridStyle}>
              <PreviewCase
                title="按钮语义"
                description="无 href 时渲染 button，并在首次点击后进入 visited 状态。"
              >
                <ActionText
                  clickable={{
                    onClick: () => reportEvent('普通可点击文本被点击'),
                    onVisitedChange: () => setLastEvent('普通文本已访问'),
                  }}
                  ellipsis={false}
                >
                  查看门店经营概览
                </ActionText>
              </PreviewCase>

              <PreviewCase
                title="链接、默认访问与禁用"
                description="验证 href/target/rel、defaultVisited 和 disabled。"
              >
                <Space orientation="vertical">
                  <ActionText
                    clickable={{
                      href: '#action-text-link-preview',
                      target: '_blank',
                      onClick: (event) => {
                        event.preventDefault()
                        reportEvent('链接点击由预览页拦截')
                      },
                    }}
                    ellipsis={false}
                  >
                    新窗口链接
                  </ActionText>
                  <ActionText clickable={{ defaultVisited: true }} ellipsis={false}>
                    默认已访问
                  </ActionText>
                  <ActionText clickable={{ disabled: true }} ellipsis={false}>
                    禁用点击
                  </ActionText>
                </Space>
              </PreviewCase>

              <PreviewCase
                title="受控 visited"
                description="点击文本请求变更，按钮可随时重置外部状态。"
              >
                <Space orientation="vertical">
                  <ActionText
                    clickable={{
                      visited: controlledVisited,
                      onVisitedChange: setControlledVisited,
                    }}
                    ellipsis={false}
                  >
                    受控访问状态：{controlledVisited ? '已访问' : '未访问'}
                  </ActionText>
                  <Button size="small" onClick={() => setControlledVisited(false)}>
                    重置 visited
                  </Button>
                </Space>
              </PreviewCase>
            </div>
          </section>

          <section style={sectionStyle}>
            <Title level={5} style={{ margin: 0 }}>
              操作区与语义样式
            </Title>
            <div style={gridStyle}>
              <PreviewCase
                title="自身 hover 展示"
                description="文本支持链接 hover 和 visited 状态，操作顺序固定为复制、编辑、自定义操作。"
              >
                <div>
                  <ActionText
                    copyable
                    editable={{ text: 'Hover 门店' }}
                    clickable={{
                      href: '#action-text-self-hover-preview',
                      onClick: (event) => {
                        event.preventDefault()
                        reportEvent('点击自身 hover 文本')
                      },
                    }}
                    actionsVisibleOn="self-hover"
                    actions={[
                      {
                        key: 'view',
                        icon: <EyeOutlined />,
                        label: '查看',
                        color: 'primary',
                        onClick: () => reportEvent('点击查看操作'),
                      },
                      {
                        key: 'delete',
                        icon: <DeleteOutlined />,
                        title: '删除',
                        danger: true,
                        onClick: () => reportEvent('点击删除操作'),
                      },
                    ]}
                  >
                    鼠标移入显示完整操作区
                  </ActionText>
                </div>
              </PreviewCase>

              <PreviewCase
                title="始终展示 + ActionIcon 属性"
                description="自定义操作支持颜色、变体、禁用、label、title 和事件。"
              >
                <ActionText
                  actionsVisibleOn="always"
                  actions={[
                    {
                      key: 'edit',
                      icon: <EditOutlined />,
                      label: '编辑',
                      color: 'primary',
                      variant: 'filled',
                      onClick: () => reportEvent('点击自定义编辑'),
                    },
                    {
                      key: 'star',
                      icon: <StarOutlined />,
                      label: '收藏',
                      color: 'green',
                      variant: 'outlined',
                      onClick: () => reportEvent('点击收藏'),
                    },
                    {
                      key: 'disabled',
                      icon: <MoreOutlined />,
                      label: '禁用操作',
                      disabled: true,
                    },
                  ]}
                >
                  始终展示操作按钮
                </ActionText>
              </PreviewCase>

              <PreviewCase
                title="classNames/styles 对象与回调"
                description="切换语义样式，验证 root、text、actions、action 四个节点。"
              >
                <Space orientation="vertical" style={{ width: '100%' }}>
                  <Switch
                    checked={showSemanticStyle}
                    onChange={setShowSemanticStyle}
                    checkedChildren="语义样式"
                    unCheckedChildren="默认样式"
                  />
                  <ActionText
                    rootClassName="action-text-preview-root-class"
                    className="action-text-preview-class"
                    data-preview="semantic"
                    copyable
                    actionsVisibleOn="always"
                    classNames={({ props }) => ({
                      root: props.actionsVisibleOn === 'always'
                        ? 'action-text-preview-semantic-root'
                        : undefined,
                      text: 'action-text-preview-semantic-text',
                      actions: 'action-text-preview-semantic-actions',
                      action: 'action-text-preview-semantic-action',
                    })}
                    styles={({ props }) =>
                      showSemanticStyle
                        ? {
                            root: {
                              width: '100%',
                              padding: 10,
                              borderRadius: token.borderRadius,
                              background: token.colorPrimaryBg,
                            },
                            text: { color: token.colorPrimaryText },
                            actions: {
                              paddingInlineStart:
                                props.actionsVisibleOn === 'always' ? 6 : undefined,
                            },
                            action: { border: `1px solid ${token.colorPrimaryBorder}` },
                          }
                        : {}
                    }
                    actions={[
                      {
                        key: 'link',
                        icon: <LinkOutlined />,
                        label: '打开链接',
                      },
                    ]}
                  >
                    可切换的语义节点样式
                  </ActionText>
                </Space>
              </PreviewCase>
            </div>
          </section>

          <section style={sectionStyle}>
            <Title level={5} style={{ margin: 0 }}>
              主题、RTL 与前缀兼容
            </Title>
            <Text type="secondary">
              顶部主题开关可验证全局亮色、暗色和紧凑密度；下方单独验证嵌套暗色、RTL、CSS
              Variables 和自定义前缀。
            </Text>
            <ConfigProvider
              prefixCls="preview"
              direction="rtl"
              theme={{
                algorithm: theme.darkAlgorithm,
                cssVar: { key: 'action-text-preview-dark' },
              }}
            >
              <CustomPrefixPreview />
            </ConfigProvider>
            <Space wrap>
              <Tag color="blue">prefixCls=preview</Tag>
              <Tag color="purple">direction=rtl</Tag>
              <Tag color="geekblue">darkAlgorithm</Tag>
              <Tag color="cyan">CSS Variables</Tag>
            </Space>
          </section>
        </Space>
      </ProLayoutContentContainer.Item>
    </ProLayoutContentContainer>
  )
}
