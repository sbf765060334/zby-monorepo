import { Table } from '@zby/ui'
import type { TableColumnsType } from '@zby/ui'
import { Button, Space, Table as AntTable, Tag, Typography } from 'antd'
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

const normalData = Array.from({ length: 18 }, (_, index) => createOrderRecord(index + 1))
const fillData = normalData.slice(0, 3)
const virtualData = Array.from({ length: 3000 }, (_, index) => createOrderRecord(index + 1))

function StatusTag({ status }: { status: OrderRecord['status'] }) {
  const color =
    status === '已完成' ? 'success' : status === '运输中' ? 'processing' : 'warning'
  return <Tag color={color}>{status}</Tag>
}

const columns: TableColumnsType<OrderRecord> = [
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

interface TableScenarioProps {
  bordered: boolean
  dataSource: OrderRecord[]
  fill: boolean
  highlightEnabled: boolean
  title: string
  virtual: boolean
  onResizeEnd: (columnKey: React.Key, width: number) => void
}

function TableScenario({
  bordered,
  dataSource,
  fill,
  highlightEnabled,
  title,
  virtual,
  onResizeEnd,
}: TableScenarioProps) {
  const table = (
    <Table<OrderRecord>
      rowKey="id"
      bordered={bordered}
      size="small"
      heightMode={fill ? 'fill' : 'content'}
      virtual={virtual}
      columnResize={{
        onResizeEnd: ({ key, width }) => onResizeEnd(key, width),
      }}
      columns={columns}
      dataSource={dataSource}
      pagination={false}
      rowHighlight={highlightEnabled}
      scroll={{ x: 1290, ...(fill ? {} : { y: 300 }) }}
    />
  )

  return (
    <PlaygroundCase
      title={title}
      description={`${virtual ? dataSource.length.toLocaleString('zh-CN') : dataSource.length} 行 / 列宽可拖拽`}
      style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}
    >
      {fill ? (
        <div style={{ height: 380, minHeight: 0, overflow: 'hidden' }}>{table}</div>
      ) : (
        table
      )}
    </PlaygroundCase>
  )
}

export default function TablePlayground() {
  const [bordered, setBordered] = React.useState(false)
  const [highlightEnabled, setHighlightEnabled] = React.useState(false)
  const [lastEvent, setLastEvent] = React.useState('等待表格交互')

  const createResizeHandler = React.useCallback(
    (scenario: string) => (columnKey: React.Key, width: number) => {
      setLastEvent(`${scenario}：列 ${String(columnKey)} 调整为 ${Math.round(width)}px`)
    },
    [],
  )

  return (
    <PlaygroundPage
      title="Table"
      description="以普通和虚拟两种渲染模式对比 fill 与非 fill 布局；所有场景均支持列宽拖拽。"
    >
      <Space wrap>
        <Button
          type={highlightEnabled ? 'primary' : 'default'}
          aria-pressed={highlightEnabled}
          onClick={() => setHighlightEnabled((enabled) => !enabled)}
        >
          行高亮：{highlightEnabled ? '开启' : '关闭'}
        </Button>
        <Button
          type={bordered ? 'primary' : 'default'}
          aria-pressed={bordered}
          onClick={() => setBordered((enabled) => !enabled)}
        >
          Border：{bordered ? '开启' : '关闭'}
        </Button>
        <Text type="secondary">拖动任意表头右侧分隔线可调整列宽</Text>
      </Space>

      <PlaygroundStatus>{lastEvent}</PlaygroundStatus>

      <PlaygroundSection
        title="普通渲染"
        description="使用 AntD 6.5.3/rc-table 1.10.4 原生表体，对比内容高度与填充高度。"
      >
        <PlaygroundGrid minItemWidth={520}>
          <TableScenario
            title="普通渲染 / 非 Fill"
            bordered={bordered}
            dataSource={normalData}
            fill={false}
            highlightEnabled={highlightEnabled}
            virtual={false}
            onResizeEnd={createResizeHandler('普通渲染 / 非 Fill')}
          />
          <TableScenario
            title="普通渲染 / Fill"
            bordered={bordered}
            dataSource={fillData}
            fill
            highlightEnabled={highlightEnabled}
            virtual={false}
            onResizeEnd={createResizeHandler('普通渲染 / Fill')}
          />
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection
        title="虚拟渲染"
        description="使用 rc-table 1.10.4 VirtualList，仅虚拟化行，并对比固定滚动高度与填充高度。"
      >
        <PlaygroundGrid minItemWidth={520}>
          <TableScenario
            title="虚拟渲染 / 非 Fill"
            bordered={bordered}
            dataSource={virtualData}
            fill={false}
            highlightEnabled={highlightEnabled}
            virtual
            onResizeEnd={createResizeHandler('虚拟渲染 / 非 Fill')}
          />
          <TableScenario
            title="虚拟渲染 / Fill"
            bordered={bordered}
            dataSource={fillData}
            fill
            highlightEnabled={highlightEnabled}
            virtual
            onResizeEnd={createResizeHandler('虚拟渲染 / Fill')}
          />
        </PlaygroundGrid>
      </PlaygroundSection>

      <div data-antd-zero-height-diagnostic>
        <AntTable<OrderRecord>
          rowKey="id"
          virtual
          columns={columns}
          dataSource={virtualData.slice(0, 100)}
          pagination={false}
          scroll={{ x: 1290, y: 0 }}
        />
      </div>
    </PlaygroundPage>
  )
}
