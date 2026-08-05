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

function StatusTag({ status }: { status: OrderRecord['status'] }) {
  const color =
    status === '已完成' ? 'success' : status === '运输中' ? 'processing' : 'warning'
  return <Tag color={color}>{status}</Tag>
}

const responsiveColumns: TableColumnsType<OrderRecord> = [
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
    maxWidth: 320,
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
    onCell: (record) => ({
      style: { fontVariantNumeric: 'tabular-nums' },
      title: `${record.orderNo} 的订单金额`,
    }),
  },
]

const wideColumns: TableColumnsType<OrderRecord> = [
  { key: 'id', title: 'ID', dataIndex: 'id', width: 90, minWidth: 70 },
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
  { key: 'address', title: '目的地', dataIndex: 'address', width: 240 },
]

export default function TablePlayground() {
  const { token } = theme.useToken()
  const [selectedRowKeys, setSelectedRowKeys] = React.useState<React.Key[]>([2])
  const [lastEvent, setLastEvent] = React.useState('等待表格交互')
  const [virtualEnabled, setVirtualEnabled] = React.useState(true)

  const frameStyle: React.CSSProperties = {
    height: 360,
    minHeight: 0,
    overflow: 'hidden',
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
  }

  return (
    <PlaygroundPage
      title="Table"
      description="受控 fork：高度填充、提交式列宽拖拽、当前行高亮和共享滚动视口。"
    >
      <PlaygroundStatus>{lastEvent}</PlaygroundStatus>

      <PlaygroundSection
        title="Fill + 列宽拖拽 + 行交互"
        description="少量数据时表体仍填满容器。拖动表头虚线并松手后才提交宽度；同一行再次点击会取消高亮。"
      >
        <PlaygroundCase title="业务组合场景">
          <div style={frameStyle}>
            <Table<OrderRecord>
              rowKey="id"
              heightMode="fill"
              enableColumnResizing
              columns={responsiveColumns}
              dataSource={smallData}
              pagination={false}
              rowSelection={{
                selectedRowKeys,
                onChange: (keys) => {
                  setSelectedRowKeys(keys)
                  setLastEvent(`rowSelection: ${keys.join(', ') || '无'}`)
                },
              }}
              rowHighlight={{
                onChange: (key, row) =>
                  setLastEvent(
                    key === null
                      ? 'rowHighlight: 已取消'
                      : `rowHighlight: ${key} / ${row?.orderNo}`,
                  ),
              }}
              onColumnWidthChange={({ columnKey, width }) =>
                setLastEvent(`列 ${String(columnKey)} 已提交宽度 ${Math.round(width)}px`)
              }
            />
          </div>
          <Text type="secondary">
            选择态与当前行高亮相互独立；客户列使用 flex 吸收剩余宽度，不生成占位列。
          </Text>
        </PlaygroundCase>
      </PlaygroundSection>

      <PlaygroundSection
        title="纵向虚拟化 + Fill"
        description="只虚拟化行；横向仍是同一原生 viewport 的普通滚动，并保留可见滚动条。"
      >
        <PlaygroundCase title="3,000 行 / 宽表">
          <Space wrap>
            <Button type={virtualEnabled ? 'primary' : 'default'} onClick={() => setVirtualEnabled(true)}>
              开启虚拟化
            </Button>
            <Button type={!virtualEnabled ? 'primary' : 'default'} onClick={() => setVirtualEnabled(false)}>
              普通渲染
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
        description="不开启虚拟化，验证宽表仍使用同一套 ScrollArea 视觉和原生 scrollLeft。"
      >
        <PlaygroundGrid minItemWidth={480}>
          <PlaygroundCase title="非虚拟宽表">
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
        </PlaygroundGrid>
      </PlaygroundSection>
    </PlaygroundPage>
  )
}
