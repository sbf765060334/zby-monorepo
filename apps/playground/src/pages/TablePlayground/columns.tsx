import type { TableColumnsType } from '@zby/ui'
import { Tag } from 'antd'

import type { OrderRecord } from './data'

function StatusTag({ status }: { status: OrderRecord['status'] }) {
  const color =
    status === '已完成'
      ? 'success'
      : status === '运输中'
        ? 'processing'
        : 'warning'
  return <Tag color={color}>{status}</Tag>
}

export const tableColumns: TableColumnsType<OrderRecord> = [
  {
    key: 'id',
    title: 'ID',
    dataIndex: 'id',
    width: 90,
    minWidth: 70,
    maxWidth: 140,
    fixed: 'left',
  },
  {
    key: 'orderNo',
    title: '订单号',
    dataIndex: 'orderNo',
    width: 190,
    minWidth: 150,
    maxWidth: 280,
  },
  {
    key: 'customer',
    title: '客户',
    dataIndex: 'customer',
    width: 180,
    minWidth: 120,
    maxWidth: 320,
  },
  {
    key: 'status',
    title: '状态',
    dataIndex: 'status',
    width: 120,
    minWidth: 96,
    maxWidth: 180,
    render: (status: OrderRecord['status']) => <StatusTag status={status} />,
  },
  {
    key: 'amount',
    title: '金额',
    dataIndex: 'amount',
    width: 150,
    minWidth: 110,
    maxWidth: 240,
    align: 'right',
    render: (amount: number) => `¥ ${amount.toLocaleString('zh-CN')}`,
  },
  {
    key: 'owner',
    title: '负责人',
    dataIndex: 'owner',
    width: 130,
    minWidth: 100,
    maxWidth: 220,
  },
  {
    key: 'createdAt',
    title: '创建时间',
    dataIndex: 'createdAt',
    width: 190,
    minWidth: 160,
    maxWidth: 280,
  },
  {
    key: 'address',
    title: '目的地',
    dataIndex: 'address',
    width: 240,
    minWidth: 180,
    maxWidth: 360,
    fixed: 'right',
  },
]

export const contentColumns: TableColumnsType<OrderRecord> = tableColumns.map(
  (column) => ({
    ...column,
    fixed: undefined,
  }),
)
