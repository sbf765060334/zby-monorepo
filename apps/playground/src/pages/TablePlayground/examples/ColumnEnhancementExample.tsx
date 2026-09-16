import { Table } from '@zby/ui'
import type { TableColumnsType } from '@zby/ui'
import { Tag } from 'antd'

import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { normalData } from '../data'
import type { OrderRecord } from '../data'

const enhanceColumns: TableColumnsType<OrderRecord> = [
  {
    title: '订单号',
    dataIndex: 'orderNo',
    key: 'orderNo',
    width: 190,
    tooltip: '业务系统中的唯一订单标识',
    copyable: true,
  },
  {
    title: '客户',
    dataIndex: 'customer',
    key: 'customer',
    width: 220,
    renderText: (value) => `客户：${String(value)}`,
    ellipsis: { rows: 1, tooltip: true },
  },
  {
    title: '目的地',
    dataIndex: 'address',
    key: 'address',
    width: 180,
    ellipsis: { rows: 1, tooltip: true },
  },
]

const longTextData = normalData.slice(0, 5).map((record) => ({
  ...record,
  customer: `${record.customer}（华东区重点客户，名称较长用于观察省略效果）`,
  address: `${record.address}张江科学城科苑路88号人工智能创新中心3号楼12层东区`,
}))

const bodyEllipsisColumns: TableColumnsType<OrderRecord> = [
  {
    title: '客户名称（含集团全称及备注信息）',
    dataIndex: 'customer',
    key: 'ellipsis-true',
    width: 160,
    copyable: true,
    ellipsis: true,
  },
  {
    title: '两行省略',
    dataIndex: 'address',
    key: 'ellipsis-rows',
    width: 180,
    ellipsis: { rows: 2 },
  },
  {
    title: '关闭表体提示',
    dataIndex: 'address',
    key: 'ellipsis-no-tooltip',
    width: 180,
    ellipsis: { showTitle: false },
  },
]

const renderEllipsisColumns: TableColumnsType<OrderRecord> = [
  {
    title: '自定义渲染（表头仍省略）',
    dataIndex: 'status',
    key: 'custom-render',
    width: 140,
    ellipsis: true,
    copyable: true,
    render: (status: OrderRecord['status']) => <Tag>{status}</Tag>,
  },
  {
    title: '排序列标题也很长用来观察表头限制',
    dataIndex: 'customer',
    key: 'sorter-ellipsis',
    width: 180,
    ellipsis: true,
    sorter: (left, right) => left.customer.localeCompare(right.customer, 'zh-CN'),
  },
  {
    title: '筛选列标题也很长用来观察表头限制',
    dataIndex: 'status',
    key: 'filter-ellipsis',
    width: 180,
    ellipsis: true,
    filters: [
      { text: '待处理', value: '待处理' },
      { text: '运输中', value: '运输中' },
      { text: '已完成', value: '已完成' },
    ],
    onFilter: (value, record) => record.status === value,
  },
]

export default function ColumnEnhancementExample() {
  return (
    <>
      <PlaygroundCase
        title="列增强"
        description="表头 tooltip 与原生 ellipsis；表体 copyable / renderText / ActionText 省略。自定义 render 时表体增强不生效。"
      >
        <Table<OrderRecord>
          rowKey="id"
          size="small"
          columnResize
          columns={enhanceColumns}
          dataSource={normalData.slice(0, 5)}
          pagination={false}
          scroll={{ x: 590 }}
        />
      </PlaygroundCase>
      <PlaygroundCase
        title="表体省略"
        description="收窄列宽后，表头走原生 title；表体由 ActionText 托管。悬停第一列可复制，悬停「关闭表体提示」列不应出现溢出提示。"
      >
        <Table<OrderRecord>
          rowKey="id"
          size="small"
          columnResize
          columns={bodyEllipsisColumns}
          dataSource={longTextData}
          pagination={false}
          scroll={{ x: 520 }}
        />
      </PlaygroundCase>
      <PlaygroundCase
        title="自定义 render 与表头排序筛选"
        description="第一列表体是 Tag，不会包 ActionText，复制也不生效，但长表头仍会原生省略。后两列与 sorter / filter 同时开启，表头省略受 AntD 图标布局限制。"
      >
        <Table<OrderRecord>
          rowKey="id"
          size="small"
          columnResize
          columns={renderEllipsisColumns}
          dataSource={longTextData}
          pagination={false}
          scroll={{ x: 500 }}
        />
      </PlaygroundCase>
    </>
  )
}
