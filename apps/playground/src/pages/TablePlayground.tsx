import { Table } from '@zby/ui'
import type { TableColumnsType } from '@zby/ui'
import { Button, Space, Tag, Typography, theme } from 'antd'
import * as React from 'react'

import {
  PlaygroundCase,
  PlaygroundGrid,
  PlaygroundPage,
  PlaygroundSection,
  PlaygroundStatus,
} from '../components/ComponentPlayground'

const { Text } = Typography

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

const virtualData: OrderRecord[] = Array.from({ length: 3000 }, (_, index) => ({
  id: index + 1,
  orderNo: `ZBY-${String(index + 1).padStart(6, '0')}`,
  customer: `客户 ${String((index % 120) + 1).padStart(3, '0')}`,
  status:
    index % 3 === 0 ? '待处理' : index % 3 === 1 ? '运输中' : '已完成',
  amount: 1000 + ((index * 137) % 50000),
  owner: ['张敏', '李想', '周宁', '王雪'][index % 4],
  createdAt: `2026-08-${String((index % 28) + 1).padStart(2, '0')} 10:30`,
  address: ['上海市浦东新区', '浙江省杭州市余杭区', '江苏省苏州市工业园区'][
    index % 3
  ],
}))

const paginatedData = virtualData.slice(0, 18)

function StatusTag({ status }: { status: OrderRecord['status'] }) {
  const color =
    status === '已完成' ? 'success' : status === '运输中' ? 'processing' : 'warning'
  return <Tag color={color}>{status}</Tag>
}

const basicColumns: TableColumnsType<OrderRecord> = [
  { key: 'orderNo', title: '订单号', dataIndex: 'orderNo' },
  { key: 'customer', title: '客户', dataIndex: 'customer' },
  { key: 'status', title: '状态', dataIndex: 'status' },
  {
    key: 'amount',
    title: '金额',
    dataIndex: 'amount',
    align: 'right',
    render: (amount: number) => `¥ ${amount.toLocaleString('zh-CN')}`,
  },
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
    title: '客户（flex: 1）',
    dataIndex: 'customer',
    width: 160,
    minWidth: 120,
    maxWidth: 520,
    flex: 1,
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
  const [loading, setLoading] = React.useState(true)

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
      description="基于 Ant Design 6.5.3 的源码级 fork，覆盖标准表格能力、高度填充、提交式列宽拖拽、当前行高亮和共享滚动视口。"
    >
      <PlaygroundStatus>{lastEvent}</PlaygroundStatus>

      <PlaygroundSection
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
      </PlaygroundSection>

      <PlaygroundSection
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
      </PlaygroundSection>

      <PlaygroundSection
        title="行选择"
        description="分别验证受控 checkbox、多选禁用规则和 radio 单选；选择态与 rowHighlight 完全独立。"
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
      </PlaygroundSection>

      <PlaygroundSection
        title="当前行高亮"
        description="rowHighlight 对象存在即开启；非受控与受控模式都支持再次点击当前行取消。"
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

          <PlaygroundCase title="受控：外部按钮与行点击同步">
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
                {controlledCurrentRowKey === null
                  ? 'null'
                  : String(controlledCurrentRowKey)}
              </Text>
            </Space>
            <Table<OrderRecord>
              rowKey="id"
              size="small"
              columns={basicColumns}
              dataSource={smallData}
              pagination={false}
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
      </PlaygroundSection>

      <PlaygroundSection
        title="列宽拖拽与剩余宽度分配"
        description="拖动期间只移动贯穿表格的虚线；松手后提交。每列都受 minWidth/maxWidth 约束，flex 业务列负责吸收剩余空间。"
      >
        <PlaygroundCase title="提交式拖拽 / min-max / flex / rowSelection 共存">
          <Text type="secondary">
            订单号 150–260px；客户 120–520px；状态 96–150px；金额 110–220px。
          </Text>
          <div style={compactFrameStyle}>
            <Table<OrderRecord>
              rowKey="id"
              heightMode="fill"
              enableColumnResizing
              columns={resizableColumns}
              dataSource={smallData}
              pagination={false}
              rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
              onColumnWidthChange={({ columnKey, width }) =>
                setLastEvent(`列 ${String(columnKey)} 提交为 ${Math.round(width)}px`)
              }
            />
          </div>
        </PlaygroundCase>
      </PlaygroundSection>

      <PlaygroundSection
        title="Height fill 与边界状态"
        description="短数据、分页、空数据和 loading 都必须维持完整外框；表体吸收剩余高度，分页停留在底部。"
      >
        <PlaygroundGrid minItemWidth={380}>
          <PlaygroundCase title="短数据 + 底部分页">
            <div style={compactFrameStyle}>
              <Table<OrderRecord>
                rowKey="id"
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
      </PlaygroundSection>

      <PlaygroundSection
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
      </PlaygroundSection>

      <PlaygroundSection
        title="纵向虚拟化 + Fill"
        description="只虚拟化行，不进行横向列虚拟化；横向仍使用共享原生 viewport 的普通 scrollLeft。"
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
              rowHighlight={{
                onChange: (key) =>
                  setLastEvent(
                    key === null ? '虚拟列表高亮已取消' : `虚拟列表高亮行 ${key}`,
                  ),
              }}
            />
          </div>
        </PlaygroundCase>
      </PlaygroundSection>

      <PlaygroundSection
        title="普通横向滚动"
        description="不开启虚拟化；固定列、表头和表体通过同一个 ScrollArea viewport 同步普通横向滚动。"
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
      </PlaygroundSection>
    </PlaygroundPage>
  )
}
