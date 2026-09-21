import { Button, Input, Space, Tag, Typography, theme } from 'antd'
import {
  createProTableController,
  ProTable,
  type ProTableColumnType,
  type ProTableController,
  type ProTableQueryRequest,
} from '@zby/pro'
import * as React from 'react'

import { PlaygroundCase } from '../../../components/ComponentPlayground'

type LedgerRow = {
  id: string
  orderNo: string
  status: 'pending' | 'done'
  amount: number
}

type LedgerQuery = {
  status?: string
}

const ALL_ROWS: LedgerRow[] = Array.from({ length: 16 }, (_, index) => ({
  id: String(index + 1),
  orderNo: `ZBY-${String(index + 1).padStart(4, '0')}`,
  status: index % 2 === 0 ? 'pending' : 'done',
  amount: 1000 + index * 80,
}))

const columns: ProTableColumnType<LedgerRow>[] = [
  { title: '订单号', dataIndex: 'orderNo', width: 140 },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '金额', dataIndex: 'amount', width: 120, sorter: true },
]

const queryOrders: ProTableQueryRequest<LedgerRow, LedgerQuery> = async (params) => {
  let rows = ALL_ROWS.slice()
  if (params.status) {
    rows = rows.filter((row) => row.status === params.status)
  }
  if (params.sortBy === 'amount' && params.sortOrder) {
    const direction = params.sortOrder === 'ascend' ? 1 : -1
    rows.sort((left, right) => (left.amount - right.amount) * direction)
  }
  const start = (params.page - 1) * params.pageSize
  return {
    data: rows.slice(start, start + params.pageSize),
    total: rows.length,
  }
}

function stringify(value: unknown) {
  return JSON.stringify(value, null, 2)
}

function useControllerState(
  controller: ProTableController<LedgerRow, LedgerQuery, unknown>,
) {
  const [state, setState] = React.useState(() => controller.getState())

  React.useEffect(() => controller.subscribe(setState), [controller])

  return state
}

function LedgerCard(props: {
  title: string
  hint: string
  value: unknown
  tag?: { color: string; text: string }
}) {
  const { token } = theme.useToken()

  return (
    <div
      style={{
        minWidth: 0,
        padding: 12,
        border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadius,
        background: token.colorFillAlter,
      }}
    >
      <Space size={6} wrap>
        <Typography.Text strong>{props.title}</Typography.Text>
        {props.tag ? <Tag color={props.tag.color}>{props.tag.text}</Tag> : null}
      </Space>
      <Typography.Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 8 }}>
        {props.hint}
      </Typography.Paragraph>
      <Typography.Paragraph
        code
        style={{
          display: 'block',
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {stringify(props.value)}
      </Typography.Paragraph>
    </div>
  )
}

export default function LedgerExample() {
  const { token } = theme.useToken()
  const [controller] = React.useState(() =>
    createProTableController<LedgerRow, LedgerQuery>({
      defaultQuery: {},
      queryRequest: queryOrders,
      rowKey: 'id',
      pagination: { defaultPageSize: 5 },
    }),
  )
  const state = useControllerState(controller)
  const requestParams = controller.getRequestParams()
  const draftPending = stringify(state.query) !== stringify(state.committedQuery)

  return (
    <PlaygroundCase
      title="请求参数对照"
      description="筛选只住在 query，页码和排序住在 controller，发给接口的那张单是现拼的。按下面的步骤点，确认这几本账各管各的、不再对不上。"
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <ol style={{ margin: 0, paddingInlineStart: 20, color: token.colorTextSecondary }}>
          <li>先别点查询。草稿和已提交都没有 page；每页 5 条只出现在分页条和 getRequestParams 里。</li>
          <li>在状态框输入 pending，先别点查询。只有草稿变了。翻页仍按已提交筛选请求，不会把未保存的 pending 带出去。</li>
          <li>点查询。已提交跟上，页码回到 1，latestParams 变成筛选 + page + pageSize。</li>
          <li>翻到第 2 页，再点「金额」排序。query 里始终没有 page / sortBy；排序只出现在 sortField 和拼好的请求参数里。</li>
        </ol>

        <Space wrap>
          <Input
            style={{ width: 220 }}
            placeholder="状态草稿，比如 pending"
            value={state.query.status ?? ''}
            onChange={(event) => {
              controller.setQueryField('status', event.target.value || undefined)
            }}
          />
          <Button type="primary" onClick={() => void controller.submitQuery()}>
            查询
          </Button>
          <Button onClick={() => controller.resetQuery()}>重置草稿</Button>
        </Space>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 12,
          }}
        >
          <LedgerCard
            title="出厂默认 defaultQuery"
            hint="点「重置草稿」时回到这里。只放筛选，不放页码。"
            value={state.defaultQuery}
          />
          <LedgerCard
            title="草稿 query"
            hint="输入框正在改、还没点查询的筛选。翻页不会改这份。"
            value={state.query}
            tag={draftPending ? { color: 'warning', text: '未提交' } : undefined}
          />
          <LedgerCard
            title="上次提交 committedQuery"
            hint="上次点查询时提交的筛选。翻页、排序、刷新都读这份。"
            value={state.committedQuery}
          />
          <LedgerCard
            title="上次真正发给接口 latestParams"
            hint="请求发出时拼好的那张单。还没查过时是 null。"
            value={state.latestParams}
            tag={state.latestParams ? undefined : { color: 'default', text: '尚未请求' }}
          />
          <LedgerCard
            title="现在就能拼的 getRequestParams()"
            hint="随时用已提交筛选 + 当前页 + 排序现拼。导出、重试只读这个。"
            value={requestParams}
          />
          <LedgerCard
            title="分页条 currentPage / pageSize"
            hint="表格底下页码只认这两项。默认每页条数只来自 pagination.defaultPageSize。"
            value={{
              currentPage: state.currentPage,
              pageSize: state.pageSize,
              total: state.total,
            }}
          />
          <LedgerCard
            title="排序 sortField / sortOrder"
            hint="排序不写进 query。有排序时才会出现在拼好的请求参数里。"
            value={{
              sortField: state.sortField ?? null,
              sortOrder: state.sortOrder ?? null,
            }}
          />
        </div>

        <div style={{ height: 360, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <ProTable<LedgerRow, LedgerQuery>
            controller={controller}
            rowKey="id"
            heightMode="fill"
            autoRequest={false}
            columns={columns}
            pagination={{
              showSizeChanger: true,
            }}
            toolbar={{}}
            style={{ flex: 1, minHeight: 0 }}
          />
        </div>
      </div>
    </PlaygroundCase>
  )
}
