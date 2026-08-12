import { Table } from '@zby/ui'
import type { ColumnResizeWidths, TableColumnsType } from '@zby/ui'
import { Button, Space, Table as AntTable, Tag, Typography, theme } from 'antd'
import type { TableColumnsType as AntTableColumnsType } from 'antd'
import * as React from 'react'

import {
  PlaygroundCase,
  PlaygroundGrid,
  PlaygroundPage,
  PlaygroundSection,
  PlaygroundStatus,
} from '../components/ComponentPlayground'

const { Text } = Typography

const SemanticTable = React.forwardRef<
  HTMLTableElement,
  React.TableHTMLAttributes<HTMLTableElement>
>((props, ref) => <table {...props} ref={ref} data-semantic-table />)

function DeferredPlaygroundSection({
  children,
  ...sectionProps
}: React.ComponentProps<typeof PlaygroundSection>) {
  const [mounted, setMounted] = React.useState(false)
  const sectionRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (mounted) return undefined

    const section = sectionRef.current
    if (!section || typeof IntersectionObserver === 'undefined') {
      setMounted(true)
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setMounted(true)
          observer.disconnect()
        }
      },
      { rootMargin: '600px 0px' },
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [mounted])

  return (
    <div ref={sectionRef} style={{ minHeight: 180 }}>
      <PlaygroundSection {...sectionProps}>
        {mounted ? children : null}
      </PlaygroundSection>
    </div>
  )
}

interface OrderRecord {
  id: number
  orderNo: string
  customer: string
  status: '待处理' | '运输中' | '已完成'
  amount: number
  owner: string
  createdAt: string
  address: string
}

const smallData: OrderRecord[] = [
  {
    id: 1,
    orderNo: 'ZBY-20260805-001',
    customer: '星河商贸',
    status: '待处理',
    amount: 12860,
    owner: '张敏',
    createdAt: '2026-08-05 09:12',
    address: '上海市浦东新区',
  },
  {
    id: 2,
    orderNo: 'ZBY-20260805-002',
    customer: '远山科技',
    status: '运输中',
    amount: 8690,
    owner: '李想',
    createdAt: '2026-08-05 10:06',
    address: '浙江省杭州市余杭区',
  },
  {
    id: 3,
    orderNo: 'ZBY-20260805-003',
    customer: '北辰供应链',
    status: '已完成',
    amount: 21740,
    owner: '周宁',
    createdAt: '2026-08-05 11:28',
    address: '江苏省苏州市工业园区',
  },
]

function createOrderRecord(id: number): OrderRecord {
  const index = id - 1

  return {
    id,
    orderNo: `ZBY-${String(id).padStart(6, '0')}`,
    customer: `客户 ${String((index % 120) + 1).padStart(3, '0')}`,
    status:
      index % 3 === 0 ? '待处理' : index % 3 === 1 ? '运输中' : '已完成',
    amount: 1000 + ((index * 137) % 50000),
    owner: ['张敏', '李想', '周宁', '王雪'][index % 4],
    createdAt: `2026-08-${String((index % 28) + 1).padStart(2, '0')} 10:30`,
    address: ['上海市浦东新区', '浙江省杭州市余杭区', '江苏省苏州市工业园区'][
      index % 3
    ],
  }
}

const virtualData: OrderRecord[] = Array.from({ length: 3000 }, (_, index) => createOrderRecord(index + 1))

const paginatedData = virtualData.slice(0, 18)

function StatusTag({ status }: { status: OrderRecord['status'] }) {
  const color =
    status === '已完成' ? 'success' : status === '运输中' ? 'processing' : 'warning'
  return <Tag color={color}>{status}</Tag>
}

const basicColumns: TableColumnsType<OrderRecord> = [
  { key: 'orderNo', title: '订单号', dataIndex: 'orderNo', width: 200 },
  { key: 'customer', title: '客户', dataIndex: 'customer', width: 200 },
  { key: 'status', title: '状态', dataIndex: 'status', width: 100 },
  {
    key: 'amount',
    title: '金额',
    dataIndex: 'amount',
    align: 'right',
    width: 100,
    render: (amount: number) => `¥ ${amount.toLocaleString('zh-CN')}`,
  },
]

const antdOverflowColumns: AntTableColumnsType<OrderRecord> = [
  { key: 'orderNo', title: '订单号', dataIndex: 'orderNo', width: 140 },
  {
    key: 'status',
    title: '状态',
    dataIndex: 'status',
    width: 50,
    render: (status: OrderRecord['status']) => <StatusTag status={status} />,
  },
  {
    key: 'amount',
    title: '金额',
    dataIndex: 'amount',
    width: 110,
    align: 'right',
    render: (amount: number) => `¥ ${amount.toLocaleString('zh-CN')}`,
  },
  { key: 'owner', title: '负责人', dataIndex: 'owner', width: 120 },
]

const customCellColumns: TableColumnsType<OrderRecord> = [
  {
    key: 'orderNo',
    title: '订单',
    dataIndex: 'orderNo',
    width: 210,
    render: (orderNo: string, record) => (
      <Space orientation="vertical" size={0}>
        <Text strong copyable>
          {orderNo}
        </Text>
        <Text type="secondary">负责人：{record.owner}</Text>
      </Space>
    ),
  },
  {
    key: 'customer',
    title: '客户 / 地址',
    dataIndex: 'customer',
    render: (customer: string, record) => (
      <Space orientation="vertical" size={0}>
        <Text>{customer}</Text>
        <Text type="secondary" ellipsis={{ tooltip: record.address }}>
          {record.address}
        </Text>
      </Space>
    ),
  },
  {
    key: 'status',
    title: '履约状态',
    dataIndex: 'status',
    width: 120,
    render: (status: OrderRecord['status']) => <StatusTag status={status} />,
  },
  {
    key: 'amount',
    title: '订单金额',
    dataIndex: 'amount',
    width: 150,
    align: 'right',
    render: (amount: number) => (
      <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>
        ¥ {amount.toLocaleString('zh-CN')}
      </Text>
    ),
    onCell: (record) => ({ title: `${record.orderNo} 的订单金额` }),
  },
]

const operationColumns: TableColumnsType<OrderRecord> = [
  {
    key: 'orderNo',
    title: '订单号',
    dataIndex: 'orderNo',
    sorter: (left, right) => left.orderNo.localeCompare(right.orderNo),
  },
  {
    key: 'customer',
    title: '客户',
    dataIndex: 'customer',
    sorter: (left, right) => left.customer.localeCompare(right.customer),
  },
  {
    key: 'status',
    title: '状态',
    dataIndex: 'status',
    filters: [
      { text: '待处理', value: '待处理' },
      { text: '运输中', value: '运输中' },
      { text: '已完成', value: '已完成' },
    ],
    onFilter: (value, record) => record.status === value,
    render: (status: OrderRecord['status']) => <StatusTag status={status} />,
  },
  {
    key: 'amount',
    title: '金额',
    dataIndex: 'amount',
    align: 'right',
    sorter: (left, right) => left.amount - right.amount,
    render: (amount: number) => `¥ ${amount.toLocaleString('zh-CN')}`,
  },
]

const resizableColumns: TableColumnsType<OrderRecord> = [
  {
    key: 'orderNo',
    title: '订单号',
    dataIndex: 'orderNo',
    width: 180,
    minWidth: 150,
    maxWidth: 260,
  },
  {
    key: 'customer',
    title: '客户',
    dataIndex: 'customer',
    width: 160,
    minWidth: 120,
    maxWidth: 520,
    shouldCellUpdate: (record, previous) => record.customer !== previous.customer,
  },
  {
    key: 'status',
    title: '状态',
    dataIndex: 'status',
    width: 110,
    minWidth: 96,
    maxWidth: 150,
    render: (status: OrderRecord['status']) => <StatusTag status={status} />,
  },
  {
    key: 'amount',
    title: '金额',
    dataIndex: 'amount',
    width: 140,
    minWidth: 110,
    maxWidth: 220,
    align: 'right',
    render: (amount: number) => `¥ ${amount.toLocaleString('zh-CN')}`,
  },
]

const groupedColumns: TableColumnsType<OrderRecord> = [
  {
    key: 'order',
    title: '订单信息',
    children: [
      { key: 'orderNo', title: '订单号', dataIndex: 'orderNo', width: 190 },
      { key: 'customer', title: '客户', dataIndex: 'customer', width: 160 },
    ],
  },
  {
    key: 'fulfillment',
    title: '履约信息',
    children: [
      {
        key: 'status',
        title: '状态',
        dataIndex: 'status',
        width: 120,
        render: (status: OrderRecord['status']) => <StatusTag status={status} />,
      },
      { key: 'owner', title: '负责人', dataIndex: 'owner', width: 120 },
    ],
  },
  {
    key: 'delivery',
    title: '交付信息',
    children: [
      { key: 'createdAt', title: '创建时间', dataIndex: 'createdAt', width: 180 },
      { key: 'address', title: '目的地', dataIndex: 'address', width: 220 },
    ],
  },
]

const wideColumns: TableColumnsType<OrderRecord> = [
  {
    key: 'id',
    title: 'ID',
    dataIndex: 'id',
    width: 90,
    minWidth: 70,
    fixed: 'left',
  },
  { key: 'orderNo', title: '订单号', dataIndex: 'orderNo', width: 190 },
  { key: 'customer', title: '客户', dataIndex: 'customer', width: 180 },
  {
    key: 'status',
    title: '状态',
    dataIndex: 'status',
    width: 120,
    render: (status: OrderRecord['status']) => <StatusTag status={status} />,
  },
  {
    key: 'amount',
    title: '金额',
    dataIndex: 'amount',
    width: 150,
    align: 'right',
    render: (amount: number) => `¥ ${amount.toLocaleString('zh-CN')}`,
  },
  { key: 'owner', title: '负责人', dataIndex: 'owner', width: 130 },
  { key: 'createdAt', title: '创建时间', dataIndex: 'createdAt', width: 190 },
  {
    key: 'address',
    title: '目的地',
    dataIndex: 'address',
    width: 240,
    fixed: 'right',
  },
]

export default function TablePlayground() {
  const { token } = theme.useToken()
  const [selectedRowKeys, setSelectedRowKeys] = React.useState<React.Key[]>([2])
  const [radioRowKey, setRadioRowKey] = React.useState<React.Key[]>([1])
  const [controlledCurrentRowKey, setControlledCurrentRowKey] =
    React.useState<React.Key | null>(2)
  const [lastEvent, setLastEvent] = React.useState('等待表格交互')
  const [virtualEnabled, setVirtualEnabled] = React.useState(true)
  const [fillDemoVirtual, setFillDemoVirtual] = React.useState(false)
  const [fillDemoData, setFillDemoData] = React.useState<OrderRecord[]>([])
  const fillDemoNextIdRef = React.useRef(1)
  const [loading, setLoading] = React.useState(true)
  const [semanticWidths, setSemanticWidths] =
    React.useState<ColumnResizeWidths>({ orderNo: 190, customer: 160 })

  const appendFillDemoRows = React.useCallback(() => {
    const startId = fillDemoNextIdRef.current
    fillDemoNextIdRef.current += 5
    setFillDemoData((current) => [
      ...current,
      ...Array.from({ length: 5 }, (_, index) => createOrderRecord(startId + index)),
    ])
  }, [])

  const frameStyle: React.CSSProperties = {
    height: 360,
    minHeight: 0,
    overflow: 'hidden',
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
  }

  const compactFrameStyle: React.CSSProperties = {
    ...frameStyle,
    height: 280,
  }

  return (
    <PlaygroundPage
      title="Table"
      description="以 Ant Design 6.5.3 和 rc-table 1.10.4 为底座，覆盖 Shuzhi 的列增强、高度填充、列宽拖拽和滚动语义。"
    >
      <PlaygroundStatus>{lastEvent}</PlaygroundStatus>

      <DeferredPlaygroundSection
        title="基础展示与自定义单元格"
        description="先验证标准 Table 外观，再单独观察 render、onCell、ellipsis 和 summary 等单元格增强能力。"
      >
        <PlaygroundGrid minItemWidth={520}>
          <PlaygroundCase title="基础 / bordered / size">
            <Table<OrderRecord>
              rowKey="id"
              bordered
              size="small"
              columns={basicColumns}
              dataSource={smallData}
              pagination={false}
              columnResize
            />
          </PlaygroundCase>

          <PlaygroundCase title="自定义单元格 + 汇总行">
            <Table<OrderRecord>
              rowKey="id"
              columns={customCellColumns}
              dataSource={smallData}
              pagination={false}
              summary={(rows) => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    <Text strong>当前订单合计</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    <Text strong>
                      ¥{' '}
                      {rows
                        .reduce((total, record) => total + record.amount, 0)
                        .toLocaleString('zh-CN')}
                    </Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </PlaygroundCase>
        </PlaygroundGrid>
      </DeferredPlaygroundSection>

      <DeferredPlaygroundSection
        title="排序、筛选与分页"
        description="点击订单号、客户或金额表头排序；通过状态筛选菜单过滤；分页切换仍走 AntD 标准 onChange 管线。"
      >
        <PlaygroundCase title="18 条业务数据 / 每页 5 条">
          <Table<OrderRecord>
            rowKey="id"
            columns={operationColumns}
            dataSource={paginatedData}
            pagination={{ pageSize: 5, showSizeChanger: false }}
            onChange={(pagination, filters, _sorter, extra) =>
              setLastEvent(
                `onChange: ${extra.action} / 第 ${pagination.current ?? 1} 页 / 状态筛选 ${
                  filters.status?.join(', ') || '无'
                }`,
              )
            }
          />
        </PlaygroundCase>
      </DeferredPlaygroundSection>

      <DeferredPlaygroundSection
        title="行选择"
        description="分别验证受控 checkbox、多选禁用规则和 radio 单选。"
      >
        <PlaygroundGrid minItemWidth={520}>
          <PlaygroundCase title="Checkbox 受控选择">
            <Table<OrderRecord>
              rowKey="id"
              size="small"
              columns={basicColumns}
              dataSource={smallData}
              pagination={false}
              rowSelection={{
                selectedRowKeys,
                getCheckboxProps: (record) => ({ disabled: record.status === '已完成' }),
                onChange: (keys) => {
                  setSelectedRowKeys(keys)
                  setLastEvent(`checkbox selection: ${keys.join(', ') || '无'}`)
                },
              }}
            />
          </PlaygroundCase>

          <PlaygroundCase title="Radio 单选">
            <Table<OrderRecord>
              rowKey="id"
              size="small"
              columns={basicColumns}
              dataSource={smallData}
              pagination={false}
              rowSelection={{
                type: 'radio',
                selectedRowKeys: radioRowKey,
                onChange: (keys) => {
                  setRadioRowKey(keys)
                  setLastEvent(`radio selection: ${keys.join(', ')}`)
                },
              }}
            />
          </PlaygroundCase>
        </PlaygroundGrid>
      </DeferredPlaygroundSection>

      <DeferredPlaygroundSection
        title="当前行高亮"
        description="rowHighlight 对象存在即开启；非受控与受控模式都支持再次点击当前行取消，并与 rowSelection 保持独立。"
      >
        <PlaygroundGrid minItemWidth={520}>
          <PlaygroundCase title="非受控：点击切换 / 再次点击取消">
            <Table<OrderRecord>
              rowKey="id"
              size="small"
              columns={basicColumns}
              dataSource={smallData}
              pagination={false}
              rowHighlight={{
                defaultCurrentRowKey: 1,
                onChange: (key, row) =>
                  setLastEvent(
                    key === null ? '非受控高亮已取消' : `非受控高亮：${row?.orderNo}`,
                  ),
              }}
            />
          </PlaygroundCase>

          <PlaygroundCase title="受控：与 checkbox 选择共存">
            <Space wrap>
              <Button size="small" onClick={() => setControlledCurrentRowKey(1)}>
                高亮第 1 行
              </Button>
              <Button size="small" onClick={() => setControlledCurrentRowKey(3)}>
                高亮第 3 行
              </Button>
              <Button size="small" onClick={() => setControlledCurrentRowKey(null)}>
                清除
              </Button>
              <Text type="secondary">
                currentRowKey:{' '}
                {controlledCurrentRowKey === null ? 'null' : String(controlledCurrentRowKey)}
              </Text>
            </Space>
            <Table<OrderRecord>
              rowKey="id"
              size="small"
              columns={basicColumns}
              dataSource={smallData}
              pagination={false}
              rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
              rowHighlight={{
                currentRowKey: controlledCurrentRowKey,
                onChange: (key) => {
                  setControlledCurrentRowKey(key)
                  setLastEvent(`受控高亮：${key ?? '已取消'}`)
                },
              }}
            />
          </PlaygroundCase>
        </PlaygroundGrid>
      </DeferredPlaygroundSection>

      <DeferredPlaygroundSection
        title="Shuzhi 列增强"
        description="验证表头 Tooltip、renderText、copyable 和多行 ellipsis 的组合语义；显式 render 仍保持最高优先级。"
      >
        <PlaygroundGrid minItemWidth={520}>
          <PlaygroundCase title="表头提示 + 格式化 + 复制 + 两行省略">
            <Table<OrderRecord>
              rowKey="id"
              size="small"
              columns={[
                {
                  dataIndex: 'orderNo',
                  title: '订单号',
                  tooltip: '业务系统中的唯一订单标识',
                  renderText: (value) => `单号：${String(value)}`,
                  copyable: true,
                  ellipsis: { rows: 2 },
                },
                {
                  dataIndex: 'address',
                  title: '目的地',
                  ellipsis: { rows: 2, tooltip: true },
                },
              ]}
              dataSource={smallData}
              pagination={false}
            />
          </PlaygroundCase>

          <PlaygroundCase title="显式 render 不进入自动增强">
            <Table<OrderRecord>
              rowKey="id"
              size="small"
              columns={[
                {
                  dataIndex: 'customer',
                  title: '客户',
                  tooltip: '显式 render 保留业务自定义内容',
                  renderText: (value) => `不会执行：${String(value)}`,
                  copyable: true,
                  render: (value) => <Text strong>{String(value)}</Text>,
                },
              ]}
              dataSource={smallData}
              pagination={false}
            />
          </PlaygroundCase>
        </PlaygroundGrid>
      </DeferredPlaygroundSection>

      <DeferredPlaygroundSection
        title="固定列宽拖拽与 filler"
        description="拖动期间只移动贯穿表格的虚线；松手后只提交当前列。业务列不自动伸缩，容器余量由 filler 表示，超出容器时横向滚动。"
      >
        <PlaygroundCase title="提交式拖拽 / min-max / filler / rowSelection 共存">
          <Text type="secondary">
            订单号 150–260px；客户 120–520px；状态 96–150px；金额 110–220px。
          </Text>
          <div style={compactFrameStyle}>
            <Table<OrderRecord>
              rowKey="id"
              heightMode="fill"
              columnResize={{
                onResizeEnd: ({ key, width }) =>
                  setLastEvent(`列 ${String(key)} 提交为 ${Math.round(width)}px`),
              }}
              columns={resizableColumns}
              dataSource={smallData}
              pagination={false}
              rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
            />
          </div>
        </PlaygroundCase>
      </DeferredPlaygroundSection>

      <DeferredPlaygroundSection
        title="Shuzhi 语义回归场景"
        description="验证非虚拟滚动不替换表格语义，以及受控列宽、稳定列键、像素宽度和混合固定分组的兼容行为。"
      >
        <PlaygroundGrid minItemWidth={520}>
          <PlaygroundCase title="caption + summary + max-content">
            <div style={{ ...compactFrameStyle, height: 260 }}>
              <Table<OrderRecord>
                rowKey="id"
                heightMode="fill"
                caption="订单语义表"
                components={{ table: SemanticTable }}
                columns={basicColumns}
                dataSource={smallData}
                pagination={false}
                scroll={{ x: 'max-content' }}
                summary={(rows) => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={4}>
                      共 {rows.length} 条订单
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            </div>
          </PlaygroundCase>

          <PlaygroundCase title="受控列宽 + px 初始宽度">
            <div style={{ ...compactFrameStyle, height: 260 }}>
              <Table<OrderRecord>
                rowKey="id"
                heightMode="fill"
                columnResize={{
                  widths: semanticWidths,
                  defaultWidths: { orderNo: 190, customer: 160 },
                  onWidthsChange: (widths, info) => {
                    setSemanticWidths(widths)
                    setLastEvent(
                      `受控列 ${String(info.key)} 更新为 ${Math.round(info.width)}px`,
                    )
                  },
                }}
                columns={[
                  { dataIndex: 'orderNo', title: '订单号', width: '190px' },
                  { dataIndex: 'customer', title: '客户', width: '160px' },
                ]}
                dataSource={smallData}
                pagination={false}
              />
            </div>
          </PlaygroundCase>

          <PlaygroundCase title="混合分组中的 fixed-end filler">
            <Table<OrderRecord>
              rowKey="id"
              columnResize
              columns={[
                { dataIndex: 'id', title: 'ID', width: 90, fixed: 'left' },
                {
                  title: '履约分组',
                  children: [
                    { dataIndex: 'customer', title: '客户', width: 160 },
                    {
                      key: 'action',
                      title: '操作',
                      width: 100,
                      fixed: 'right',
                      render: () => '查看',
                    },
                  ],
                },
              ]}
              dataSource={smallData}
              pagination={false}
            />
          </PlaygroundCase>

          <PlaygroundCase title="嵌套表 DOM 归属隔离">
            <Table<OrderRecord>
              rowKey="id"
              columns={basicColumns}
              dataSource={smallData.slice(0, 1)}
              pagination={false}
              expandable={{
                defaultExpandedRowKeys: [1],
                expandedRowRender: () => (
                  <Table<OrderRecord>
                    rowKey="id"
                    size="small"
                    columns={basicColumns.slice(0, 2)}
                    dataSource={smallData.slice(1)}
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                  />
                ),
              }}
            />
          </PlaygroundCase>
        </PlaygroundGrid>
      </DeferredPlaygroundSection>

      <DeferredPlaygroundSection
        title="AntD 原版窄列内容溢出"
        description="直接使用 antd/Table，不经过 ZBY Table。固定布局下，列宽小于不可换行内容时，原版单元格默认不会裁剪越界内容。"
      >
        <PlaygroundCase title="tableLayout=fixed / 状态列 50px / 无 ellipsis">
          <Space orientation="vertical" size={2}>
            <Text code>import {'{ Table }'} from &apos;antd&apos;</Text>
            <Text type="secondary">
              bordered 仅用于标出单元格边界；观察 Tag 是否越过状态列进入金额列。
            </Text>
          </Space>
          <div style={{ width: 420, maxWidth: '100%' }}>
            <AntTable<OrderRecord>
              rowKey="id"
              bordered
              size="small"
              tableLayout="fixed"
              columns={antdOverflowColumns}
              dataSource={smallData}
              pagination={false}
            />
          </div>
        </PlaygroundCase>
      </DeferredPlaygroundSection>

      <DeferredPlaygroundSection
        title="Height fill 与边界状态"
        description="短数据、分页、空数据和 loading 都必须维持完整外框；表体吸收剩余高度，分页停留在底部。"
      >
        <PlaygroundGrid minItemWidth={380}>
          <PlaygroundCase title="短数据 + 底部分页">
            <div style={compactFrameStyle}>
              <Table<OrderRecord>
                rowKey="id"
                bordered
                heightMode="fill"
                columns={basicColumns}
                dataSource={paginatedData.slice(0, 6)}
                pagination={{ pageSize: 2, size: 'small' }}
              />
            </div>
          </PlaygroundCase>

          <PlaygroundCase title="Fill 空状态">
            <div style={compactFrameStyle}>
              <Table<OrderRecord>
                rowKey="id"
                heightMode="fill"
                columns={basicColumns}
                dataSource={[]}
                pagination={false}
              />
            </div>
          </PlaygroundCase>

          <PlaygroundCase title="Fill 加载态">
            <Button size="small" onClick={() => setLoading((value) => !value)}>
              {loading ? '关闭 loading' : '开启 loading'}
            </Button>
            <div style={compactFrameStyle}>
              <Table<OrderRecord>
                rowKey="id"
                heightMode="fill"
                loading={loading}
                columns={basicColumns}
                dataSource={smallData}
                pagination={false}
              />
            </div>
          </PlaygroundCase>
        </PlaygroundGrid>
      </DeferredPlaygroundSection>

      <DeferredPlaygroundSection
        title="复杂表头与展开行"
        description="验证源码 fork 仍保留 AntD 的分组表头、展开行和横向滚动等结构能力。"
      >
        <PlaygroundGrid minItemWidth={520}>
          <PlaygroundCase title="两级分组表头">
            <Table<OrderRecord>
              rowKey="id"
              size="small"
              columns={groupedColumns}
              dataSource={smallData}
              pagination={false}
              scroll={{ x: 990 }}
            />
          </PlaygroundCase>

          <PlaygroundCase title="可展开详情行">
            <Table<OrderRecord>
              rowKey="id"
              size="small"
              columns={basicColumns}
              dataSource={smallData}
              pagination={false}
              expandable={{
                expandRowByClick: true,
                expandedRowRender: (record) => (
                  <Space wrap size={24}>
                    <Text>负责人：{record.owner}</Text>
                    <Text>创建时间：{record.createdAt}</Text>
                    <Text>目的地：{record.address}</Text>
                  </Space>
                ),
                onExpand: (expanded, record) =>
                  setLastEvent(`${record.orderNo}：${expanded ? '展开' : '收起'}`),
              }}
            />
          </PlaygroundCase>
        </PlaygroundGrid>
      </DeferredPlaygroundSection>

      <DeferredPlaygroundSection
        title="Fill 动态数据与渲染模式切换"
        description="从空数据开始，在同一张高填充宽表中切换普通渲染与虚拟列表渲染，并验证动态追加和列宽持久化。"
      >
        <PlaygroundCase title="空状态起步 / 8 列 / 持久化列宽">
          <Space wrap>
            <Button
              type={!fillDemoVirtual ? 'primary' : 'default'}
              onClick={() => setFillDemoVirtual(false)}
            >
              普通渲染
            </Button>
            <Button
              type={fillDemoVirtual ? 'primary' : 'default'}
              onClick={() => setFillDemoVirtual(true)}
            >
              虚拟列表渲染
            </Button>
            <Button onClick={appendFillDemoRows}>增加 5 条数据</Button>
            <Button danger onClick={() => setFillDemoData([])}>
              清空数据
            </Button>
          </Space>
          <div style={{ ...frameStyle, height: 650 }}>
            <Table<OrderRecord>
              rowKey="id"
              heightMode="fill"
              virtual={fillDemoVirtual}
              columnResize
              columns={wideColumns}
              dataSource={fillDemoData}
              pagination={false}
            />
          </div>
        </PlaygroundCase>
      </DeferredPlaygroundSection>

      <DeferredPlaygroundSection
        title="纵向虚拟化 + Fill"
        description="只虚拟化行，不进行横向列虚拟化；滚动继续使用 rc-table 1.10.4 的 VirtualList 模型。"
      >
        <PlaygroundCase title="3,000 行 / 宽表 / 左右固定列">
          <Space wrap>
            <Button
              type={virtualEnabled ? 'primary' : 'default'}
              onClick={() => setVirtualEnabled(true)}
            >
              开启虚拟化
            </Button>
            <Button
              type={!virtualEnabled ? 'primary' : 'default'}
              onClick={() => setVirtualEnabled(false)}
            >
              普通渲染 30 行
            </Button>
          </Space>
          <div style={{ ...frameStyle, height: 420 }}>
            <Table<OrderRecord>
              rowKey="id"
              heightMode="fill"
              virtual={virtualEnabled}
              columns={wideColumns}
              dataSource={virtualEnabled ? virtualData : virtualData.slice(0, 30)}
              pagination={false}
              scroll={{ x: 1290 }}
            />
          </div>
        </PlaygroundCase>

        <PlaygroundCase title="虚拟滚动 / rowSpan 起始行补偿">
          <div style={{ ...frameStyle, height: 320 }}>
            <Table<OrderRecord>
              rowKey="id"
              heightMode="fill"
              virtual
              columns={[
                {
                  dataIndex: 'status',
                  title: '批次状态',
                  width: 160,
                  onCell: (_record, index) => ({
                    rowSpan:
                      index === 0 ? 10 : index !== undefined && index < 10 ? 0 : 1,
                  }),
                },
                { dataIndex: 'orderNo', title: '订单号', width: 220 },
                { dataIndex: 'customer', title: '客户', width: 180 },
              ]}
              dataSource={virtualData.slice(0, 30)}
              pagination={false}
              scroll={{ x: 560 }}
            />
          </div>
        </PlaygroundCase>
      </DeferredPlaygroundSection>

      <DeferredPlaygroundSection
        title="普通横向滚动"
        description="不开启虚拟化；表头和表体按 Shuzhi 的 rc-table 同步逻辑滚动，滚动容器使用 ZBY ScrollArea。"
      >
        <PlaygroundCase title="非虚拟宽表 / 左右固定列">
          <div style={{ ...frameStyle, height: 260 }}>
            <Table<OrderRecord>
              rowKey="id"
              heightMode="fill"
              columns={wideColumns}
              dataSource={smallData}
              pagination={false}
              scroll={{ x: 1290 }}
            />
          </div>
        </PlaygroundCase>
      </DeferredPlaygroundSection>
    </PlaygroundPage>
  )
}
