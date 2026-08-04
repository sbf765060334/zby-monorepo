import {
  DeleteOutlined,
  EditOutlined,
  FilterOutlined,
  LineChartOutlined,
  MoreOutlined,
  SearchOutlined,
  StarOutlined,
} from '@ant-design/icons'
import { ActionIcon, type ActionIconProps } from '@zby/ui'
import {
  App,
  Badge,
  ConfigProvider,
  Segmented,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  theme,
  type TableColumnsType,
} from 'antd'
import * as React from 'react'
import {
  PlaygroundCase,
  PlaygroundControl,
  PlaygroundGrid,
  PlaygroundPage,
  PlaygroundSection,
  PlaygroundStatus,
} from '../components/ComponentPlayground'

const { Text } = Typography

type ActionSize = NonNullable<ActionIconProps['size']>
type ActionShape = NonNullable<ActionIconProps['shape']>
type ActionColor = NonNullable<ActionIconProps['color']>
type ActionVariant = NonNullable<ActionIconProps['variant']>

type TableRow = {
  key: string
  name: string
  owner: string
  disabled?: boolean
}

const tableData: TableRow[] = [
  { key: '1', name: '杭州西湖旗舰店', owner: '张三' },
  { key: '2', name: '上海静安体验店', owner: '李四', disabled: true },
  { key: '3', name: '深圳南山科技园店', owner: '王五' },
]

const presetColors: ActionColor[] = [
  'default',
  'primary',
  'danger',
  'green',
  'orange',
  'purple',
]

const variants: ActionVariant[] = [
  'outlined',
  'dashed',
  'solid',
  'filled',
  'text',
  'link',
  'inline',
]

export default function ActionIconPlayground() {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const [size, setSize] = React.useState<ActionSize>('middle')
  const [shape, setShape] = React.useState<ActionShape>('square')
  const [color, setColor] = React.useState<ActionColor>('default')
  const [variant, setVariant] = React.useState<ActionVariant>('filled')
  const [selected, setSelected] = React.useState(false)
  const [danger, setDanger] = React.useState(false)
  const [disabled, setDisabled] = React.useState(false)
  const [showBadge, setShowBadge] = React.useState(false)
  const [lastEvent, setLastEvent] = React.useState('等待交互')

  const reportEvent = (event: string) => {
    setLastEvent(event)
    void message.success(event)
  }

  const previewIcon = (
    <ActionIcon
      size={size}
      shape={shape}
      color={danger ? undefined : color}
      variant={variant}
      selected={selected}
      danger={danger}
      disabled={disabled}
      icon={showBadge ? <FilterOutlined /> : <SearchOutlined />}
      aria-label="ActionIcon 属性预览"
      onClick={() => reportEvent('点击属性预览图标')}
    />
  )

  const columns: TableColumnsType<TableRow> = [
    { title: '门店', dataIndex: 'name' },
    { title: '负责人', dataIndex: 'owner', width: 120 },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Space size={4}>
          <ActionIcon
            size="small"
            color="primary"
            variant="filled"
            icon={<LineChartOutlined />}
            aria-label={`查看${record.name}报表`}
            title="查看报表"
            onClick={() => reportEvent(`查看${record.name}报表`)}
          />
          <ActionIcon
            size="small"
            icon={<EditOutlined />}
            aria-label={`编辑${record.name}`}
            title="编辑"
            onClick={() => reportEvent(`编辑${record.name}`)}
          />
          <ActionIcon
            size="small"
            icon={<MoreOutlined />}
            aria-label={`${record.name}更多操作`}
            title="更多"
            disabled={record.disabled}
            onClick={() => reportEvent(`${record.name}更多操作`)}
          />
        </Space>
      ),
    },
  ]

  return (
    <PlaygroundPage
      title="ActionIcon"
      description="纯图标操作的尺寸、状态、颜色、变体、语义节点和业务场景完整预览。"
    >
      <PlaygroundStatus>{lastEvent}</PlaygroundStatus>

      <PlaygroundSection
        title="属性实验台"
        description="组合尺寸、形状、颜色、变体和状态，实时验证最终属性归一化。"
      >
        <PlaygroundGrid>
          <PlaygroundCase title="实时预览">
            <div
              style={{
                display: 'flex',
                minHeight: 120,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: token.borderRadiusLG,
                background: token.colorFillQuaternary,
              }}
            >
              {showBadge ? <Badge count={3}>{previewIcon}</Badge> : previewIcon}
            </div>
            <Space wrap>
              <Switch
                checked={selected}
                onChange={setSelected}
                checkedChildren="选中"
                unCheckedChildren="选中"
              />
              <Switch
                checked={danger}
                onChange={setDanger}
                checkedChildren="危险"
                unCheckedChildren="危险"
              />
              <Switch
                checked={disabled}
                onChange={setDisabled}
                checkedChildren="禁用"
                unCheckedChildren="禁用"
              />
              <Switch
                checked={showBadge}
                onChange={setShowBadge}
                checkedChildren="角标"
                unCheckedChildren="角标"
              />
            </Space>
          </PlaygroundCase>

          <PlaygroundCase title="属性控制">
            <PlaygroundControl label="size">
              <Segmented<ActionSize>
                block
                value={size}
                onChange={setSize}
                options={[
                  { label: 'Small', value: 'small' },
                  { label: 'Middle', value: 'middle' },
                  { label: 'Large', value: 'large' },
                ]}
              />
            </PlaygroundControl>
            <PlaygroundControl label="shape">
              <Segmented<ActionShape>
                block
                value={shape}
                onChange={setShape}
                options={[
                  { label: 'Square', value: 'square' },
                  { label: 'Circle', value: 'circle' },
                ]}
              />
            </PlaygroundControl>
            <PlaygroundControl label="color">
              <Segmented<ActionColor>
                block
                value={color}
                onChange={setColor}
                options={presetColors.slice(0, 4).map((item) => ({
                  label: item,
                  value: item,
                }))}
              />
            </PlaygroundControl>
            <PlaygroundControl label="variant">
              <Segmented<ActionVariant>
                block
                value={variant}
                onChange={setVariant}
                options={variants.map((item) => ({ label: item, value: item }))}
              />
            </PlaygroundControl>
          </PlaygroundCase>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection
        title="尺寸与状态"
        description="外框使用正文行高与间距 Token，内部图标同步按三档逐级放大。"
      >
        <PlaygroundGrid>
          <PlaygroundCase
            title="外框 22 / 26 / 30px"
            description="图标为 16 / 18 / 20px；medium 是 middle 的兼容别名。"
          >
            <Space wrap size="large" align="center">
              {([
                ['small', '22px / icon 16px'],
                ['middle', '26px / icon 18px'],
                ['large', '30px / icon 20px'],
              ] as const).map(([itemSize, label]) => (
                <Space key={itemSize} orientation="vertical" align="center" size={4}>
                  <ActionIcon
                    size={itemSize}
                    icon={<SearchOutlined />}
                    aria-label={`${itemSize} 尺寸`}
                  />
                  <Text code>{label}</Text>
                </Space>
              ))}
              <Space orientation="vertical" align="center" size={4}>
                <ActionIcon
                  size="medium"
                  icon={<SearchOutlined />}
                  aria-label="medium 兼容尺寸"
                />
                <Text code>medium</Text>
              </Space>
            </Space>
          </PlaygroundCase>

          <PlaygroundCase title="基础状态">
            <Space wrap size="large">
              <ActionIcon icon={<SearchOutlined />} aria-label="默认" title="默认" />
              <ActionIcon icon={<StarOutlined />} aria-label="选中" title="选中" selected />
              <ActionIcon icon={<DeleteOutlined />} aria-label="危险" title="危险" danger />
              <ActionIcon icon={<SearchOutlined />} aria-label="禁用" title="禁用" disabled />
              <ActionIcon
                icon={<SearchOutlined />}
                aria-label="圆形"
                title="圆形"
                shape="circle"
              />
            </Space>
          </PlaygroundCase>

          <PlaygroundCase
            title="icon / children / Badge"
            description="icon 优先，未传 icon 时使用 children；外层可直接包裹 Badge。"
          >
            <Space wrap size="large">
              <ActionIcon icon={<SearchOutlined />} aria-label="icon 属性" />
              <ActionIcon aria-label="children 回退">
                <FilterOutlined />
              </ActionIcon>
              <Badge count={8}>
                <ActionIcon icon={<MoreOutlined />} aria-label="带角标操作" />
              </Badge>
            </Space>
          </PlaygroundCase>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection
        title="颜色与变体矩阵"
        description="覆盖 antd Button 颜色语义、预设色和全部外观变体。"
      >
        <PlaygroundGrid>
          <PlaygroundCase title="颜色">
            <Space wrap size="large">
              {presetColors.map((itemColor) => (
                <Space key={itemColor} orientation="vertical" align="center" size={4}>
                  <ActionIcon
                    icon={<SearchOutlined />}
                    color={itemColor}
                    variant="filled"
                    aria-label={`${itemColor} 颜色`}
                  />
                  <Text code>{itemColor}</Text>
                </Space>
              ))}
            </Space>
          </PlaygroundCase>

          <PlaygroundCase title="全部 variant">
            <Space wrap size="large">
              {variants.map((itemVariant) => (
                <Space key={itemVariant} orientation="vertical" align="center" size={4}>
                  <ActionIcon
                    icon={<SearchOutlined />}
                    color="primary"
                    variant={itemVariant}
                    aria-label={`${itemVariant} 变体`}
                  />
                  <Text code>{itemVariant}</Text>
                </Space>
              ))}
            </Space>
          </PlaygroundCase>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection
        title="语义样式与上下文"
        description="覆盖原生 button 属性、ref、classNames/styles 回调和 ConfigProvider 继承。"
      >
        <PlaygroundGrid>
          <PlaygroundCase title="classNames / styles 回调">
            <ActionIcon
              rootClassName="action-icon-root-class"
              className="action-icon-class"
              data-action="semantic-preview"
              icon={<StarOutlined />}
              selected
              color="primary"
              variant="filled"
              aria-label="语义样式图标"
              classNames={({ props }) => ({
                root: props.selected ? 'action-icon-semantic-root' : undefined,
                icon: 'action-icon-semantic-icon',
              })}
              styles={({ props }) => ({
                root: {
                  boxShadow: props.selected ? `0 0 0 2px ${token.colorPrimaryBorder}` : undefined,
                },
                icon: { transform: 'rotate(-12deg)' },
              })}
              onClick={() => reportEvent('语义样式按钮原生 onClick')}
            />
          </PlaygroundCase>

          <PlaygroundCase title="ConfigProvider 继承">
            <ConfigProvider
              componentSize="large"
              button={{
                shape: 'circle',
                color: 'green',
                variant: 'filled',
                style: { opacity: 0.9 },
              }}
            >
              <ActionIcon icon={<SearchOutlined />} aria-label="继承按钮配置" />
            </ConfigProvider>
            <Space wrap>
              <Tag color="green">large</Tag>
              <Tag color="purple">circle</Tag>
              <Tag color="blue">green filled</Tag>
            </Space>
          </PlaygroundCase>

          <PlaygroundCase title="暗色 + RTL + 自定义前缀">
            <ConfigProvider
              prefixCls="preview"
              direction="rtl"
              theme={{ algorithm: theme.darkAlgorithm, cssVar: { key: 'action-icon-dark' } }}
            >
              <div
                style={{
                  padding: 16,
                  borderRadius: token.borderRadiusLG,
                  background: '#141414',
                }}
              >
                <ActionIcon
                  prefixCls="preview-action-icon"
                  color="primary"
                  variant="filled"
                  icon={<SearchOutlined />}
                  aria-label="RTL 暗色图标"
                />
              </div>
            </ConfigProvider>
          </PlaygroundCase>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection
        title="表格操作列"
        description="small 尺寸用于高频内联操作，禁用状态由业务行数据控制。"
      >
        <Table<TableRow>
          rowKey="key"
          columns={columns}
          dataSource={tableData}
          pagination={false}
          size="small"
          scroll={{ x: 520 }}
        />
      </PlaygroundSection>
    </PlaygroundPage>
  )
}
