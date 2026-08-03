import {
  DeleteOutlined,
  EditOutlined,
  FilterOutlined,
  LineChartOutlined,
  MoreOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { ProLayoutContentContainer } from '@zby/pro'
import { ActionIcon, type ActionIconProps } from '@zby/ui'
import { Badge, Segmented, Space, Switch, Table, Typography, theme } from 'antd'
import type { TableColumnsType } from 'antd'
import * as React from 'react'

const { Text, Title } = Typography

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

export default function ActionIconPlayground() {
  const { token } = theme.useToken()
  const [size, setSize] = React.useState<ActionSize>('middle')
  const [shape, setShape] = React.useState<ActionShape>('square')
  const [color, setColor] = React.useState<ActionColor>('default')
  const [variant, setVariant] = React.useState<ActionVariant>('filled')
  const [selected, setSelected] = React.useState(false)
  const [danger, setDanger] = React.useState(false)
  const [disabled, setDisabled] = React.useState(false)
  const [showBadge, setShowBadge] = React.useState(false)

  const sectionStyle: React.CSSProperties = {
    display: 'grid',
    gap: 16,
    paddingBlockStart: 20,
    borderBlockStart: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
  }
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
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
  const previewStyle: React.CSSProperties = {
    display: 'flex',
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: token.borderRadiusLG,
    background: token.colorFillQuaternary,
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
          />
          <ActionIcon
            size="small"
            icon={<EditOutlined />}
            aria-label={`编辑${record.name}`}
            title="编辑"
          />
          <ActionIcon
            size="small"
            icon={<MoreOutlined />}
            aria-label={`${record.name}更多操作`}
            title="更多"
            disabled={record.disabled}
          />
        </Space>
      ),
    },
  ]

  return (
    <ProLayoutContentContainer mode="stack">
      <ProLayoutContentContainer.Item>
        <Space orientation="vertical" size={24} style={{ width: '100%' }}>
          <header>
            <Title level={3} style={{ margin: 0 }}>
              ActionIcon
            </Title>
            <Text type="secondary">
              @zby/ui 纯图标操作、状态、颜色与变体回归页
            </Text>
          </header>

          <section style={sectionStyle}>
            <Title level={5} style={{ margin: 0 }}>
              属性面板
            </Title>
            <div style={gridStyle}>
              <div style={caseStyle}>
                <div style={previewStyle}>
                  {showBadge ? <Badge count={3}>{previewIcon}</Badge> : previewIcon}
                </div>
                <Space wrap>
                  <Switch checked={selected} onChange={setSelected} checkedChildren="选中" />
                  <Switch checked={danger} onChange={setDanger} checkedChildren="危险" />
                  <Switch checked={disabled} onChange={setDisabled} checkedChildren="禁用" />
                  <Switch checked={showBadge} onChange={setShowBadge} checkedChildren="角标" />
                </Space>
              </div>

              <div style={caseStyle}>
                <Text strong>尺寸</Text>
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
                <Text strong>形状</Text>
                <Segmented<ActionShape>
                  block
                  value={shape}
                  onChange={setShape}
                  options={[
                    { label: 'Square', value: 'square' },
                    { label: 'Circle', value: 'circle' },
                  ]}
                />
                <Text strong>颜色</Text>
                <Segmented<ActionColor>
                  block
                  value={color}
                  onChange={setColor}
                  options={[
                    { label: 'Default', value: 'default' },
                    { label: 'Primary', value: 'primary' },
                    { label: 'Danger', value: 'danger' },
                    { label: 'Green', value: 'green' },
                  ]}
                />
                <Text strong>变体</Text>
                <Segmented<ActionVariant>
                  block
                  value={variant}
                  onChange={setVariant}
                  options={[
                    { label: 'Filled', value: 'filled' },
                    { label: 'Text', value: 'text' },
                    { label: 'Outlined', value: 'outlined' },
                    { label: 'Inline', value: 'inline' },
                  ]}
                />
              </div>
            </div>
          </section>

          <section style={sectionStyle}>
            <Title level={5} style={{ margin: 0 }}>
              状态与变体矩阵
            </Title>
            <div style={gridStyle}>
              <div style={caseStyle}>
                <Text strong>基础状态</Text>
                <Space wrap size="middle">
                  <ActionIcon icon={<SearchOutlined />} aria-label="默认" />
                  <ActionIcon icon={<SearchOutlined />} aria-label="选中" selected />
                  <ActionIcon icon={<DeleteOutlined />} aria-label="危险" danger />
                  <ActionIcon icon={<SearchOutlined />} aria-label="禁用" disabled />
                  <ActionIcon
                    icon={<SearchOutlined />}
                    aria-label="圆形"
                    shape="circle"
                  />
                </Space>
              </div>

              <div style={caseStyle}>
                <Text strong>颜色与变体</Text>
                <Space wrap size="middle">
                  <ActionIcon
                    icon={<SearchOutlined />}
                    aria-label="Primary filled"
                    color="primary"
                    variant="filled"
                  />
                  <ActionIcon
                    icon={<SearchOutlined />}
                    aria-label="Danger outlined"
                    color="danger"
                    variant="outlined"
                  />
                  <ActionIcon
                    icon={<SearchOutlined />}
                    aria-label="Green solid"
                    color="green"
                    variant="solid"
                  />
                  <ActionIcon
                    icon={<SearchOutlined />}
                    aria-label="Primary text"
                    color="primary"
                    variant="text"
                  />
                  <ActionIcon
                    icon={<SearchOutlined />}
                    aria-label="Inline link"
                    variant="inline"
                  />
                </Space>
              </div>
            </div>
          </section>

          <section style={sectionStyle}>
            <Title level={5} style={{ margin: 0 }}>
              表格操作列
            </Title>
            <Table<TableRow>
              rowKey="key"
              columns={columns}
              dataSource={tableData}
              pagination={false}
              size="small"
            />
          </section>
        </Space>
      </ProLayoutContentContainer.Item>
    </ProLayoutContentContainer>
  )
}
