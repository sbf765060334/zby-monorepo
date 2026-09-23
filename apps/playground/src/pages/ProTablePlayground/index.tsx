import { App, DatePicker, Input, Select } from 'antd'
import dayjs from 'dayjs'
import {
  createDateRangeTagTextResolver,
  createDateTagTextResolver,
  createSelectTagTextResolver,
  ProLayoutContentContainer,
  ProTable,
  type ProTableColumnType,
  type ProTableFilter,
  type ProTableQueryRequest,
} from '@zby/pro'

type OrderStatus = 'pending' | 'shipping' | 'done'
type OrderPriority = 'low' | 'normal' | 'high'
type OrderLabel = 'east' | 'urgent' | 'bonded'

type PlaygroundRow = {
  id: string
  orderNo: string
  customer: string
  status: OrderStatus
  priority: OrderPriority
  labels: OrderLabel[]
  amount: number
  rate: number | undefined
  quantity: number
  progress: number
  urgent: boolean
  owner: string
  warehouse: string
  route: string
  destination: string
  createdAt: string
  dateValue: string
  weekValue: string
  monthValue: string
  yearValue: string
  sku: string
  payload: { warehouse: string; route: string }
  note: string
  remark: string
}

type PlaygroundQuery = {
  customer?: string
  status?: OrderStatus
  createdAt?: [string, string]
  orderNo?: string
  warehouse?: string
  route?: string
  destination?: string
  priority?: OrderPriority
  sku?: string
  urgent?: boolean
  remark?: string
  id?: string
  label?: OrderLabel
  note?: string
  quantity?: string
  progress?: string
  amount?: string
  rate?: string
  dateValue?: string
  year?: string
  owner?: string
  billNo?: string
  containerNo?: string
  customsNo?: string
  contact?: string
  phone?: string
  email?: string
  region?: string
  plateNo?: string
  driver?: string
  carrier?: string
  channel?: string
  customerLevel?: string
  tradeTerm?: string
  customsStatus?: string
  invoiceNo?: string
  contractNo?: string
  projectNo?: string
  dept?: string
  currency?: string
  settleMethod?: string
  bizType?: string
  etd?: string
  eta?: string
}

const STATUS_OPTIONS: Array<{ label: string; value: OrderStatus }> = [
  { label: '待处理', value: 'pending' },
  { label: '运输中', value: 'shipping' },
  { label: '已完成', value: 'done' },
]
const PRIORITY_OPTIONS: Array<{ label: string; value: OrderPriority }> = [
  { label: '低', value: 'low' },
  { label: '中', value: 'normal' },
  { label: '高', value: 'high' },
]

const OWNERS = ['张敏', '李想', '周宁', '王雪', '陈舟']
const CUSTOMERS = ['星河贸易', '北辰物流', '青云供应链', '远航进出口', '临港仓储']
const WAREHOUSES = ['上海仓', '杭州仓', '苏州仓', '宁波仓']
const ROUTES = ['华东干线', '沿海快运', '跨境陆运', '城配循环']
const DESTINATIONS = ['上海市浦东新区', '杭州市余杭区', '苏州市工业园区', '宁波市北仑区']
const WAREHOUSE_OPTIONS = WAREHOUSES.map((item) => ({ label: item, value: item }))
const ROUTE_OPTIONS = ROUTES.map((item) => ({ label: item, value: item }))
const DESTINATION_OPTIONS = DESTINATIONS.map((item) => ({ label: item, value: item }))
const URGENT_OPTIONS = [
  { label: '是', value: true },
  { label: '否', value: false },
]
const LABEL_OPTIONS: Array<{ label: string; value: OrderLabel }> = [
  { label: '华东', value: 'east' },
  { label: '加急', value: 'urgent' },
  { label: '保税', value: 'bonded' },
]
const CURRENCY_OPTIONS = [
  { label: '人民币', value: 'CNY' },
  { label: '美元', value: 'USD' },
  { label: '欧元', value: 'EUR' },
]
const SETTLE_OPTIONS = [
  { label: '月结', value: 'monthly' },
  { label: '现结', value: 'cash' },
  { label: '到付', value: 'collect' },
]
const BIZ_TYPE_OPTIONS = [
  { label: '进口', value: 'import' },
  { label: '出口', value: 'export' },
  { label: '内贸', value: 'domestic' },
]
const STATUSES: OrderStatus[] = ['pending', 'shipping', 'done']
const PRIORITIES: OrderPriority[] = ['low', 'normal', 'high']
const LABEL_SETS: OrderLabel[][] = [['east'], ['east', 'urgent'], ['bonded'], ['urgent', 'bonded']]

const ALL_ROWS: PlaygroundRow[] = Array.from({ length: 48 }, (_, index) => {
  const id = index + 1
  const owner = OWNERS[index % OWNERS.length]
  const warehouse = WAREHOUSES[index % WAREHOUSES.length]
  const route = ROUTES[index % ROUTES.length]
  const createdAt = `2026-08-${String((index % 28) + 1).padStart(2, '0')} 10:30`
  return {
    id: String(id),
    orderNo: `ZBY-${String(id).padStart(6, '0')}`,
    customer: CUSTOMERS[index % CUSTOMERS.length],
    status: STATUSES[index % STATUSES.length],
    priority: PRIORITIES[index % PRIORITIES.length],
    labels: LABEL_SETS[index % LABEL_SETS.length],
    amount: 1280 + ((index * 137) % 48000),
    rate: index % 11 === 0 ? undefined : Number((18 + ((index * 7) % 80) + index / 10).toFixed(1)),
    quantity: 12 + ((index * 3) % 480),
    progress: (index * 13) % 101,
    urgent: index % 5 === 0,
    owner,
    warehouse,
    route,
    destination: DESTINATIONS[index % DESTINATIONS.length],
    createdAt,
    dateValue: createdAt,
    weekValue: createdAt,
    monthValue: createdAt,
    yearValue: createdAt,
    sku: index % 9 === 0 ? '' : `SKU-${String(id).padStart(4, '0')}`,
    payload: { warehouse, route },
    note: index % 3 === 0 ? '第一行备注\n第二行换行' : '',
    remark: index % 4 === 0 ? '优先出库' : '',
  }
})

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

const queryOrders: ProTableQueryRequest<PlaygroundRow, PlaygroundQuery> = async (params) => {
  await wait(3000)

  const customer = typeof params.customer === 'string' ? params.customer.trim() : ''
  const owner = typeof params.owner === 'string' ? params.owner.trim() : ''
  const orderNo = typeof params.orderNo === 'string' ? params.orderNo.trim() : ''
  const destination = typeof params.destination === 'string' ? params.destination.trim() : ''
  const sku = typeof params.sku === 'string' ? params.sku.trim() : ''
  const remark = typeof params.remark === 'string' ? params.remark.trim() : ''
  const id = typeof params.id === 'string' ? params.id.trim() : ''
  const note = typeof params.note === 'string' ? params.note.trim() : ''
  const quantity = typeof params.quantity === 'string' ? params.quantity.trim() : ''
  const progress = typeof params.progress === 'string' ? params.progress.trim() : ''
  const amount = typeof params.amount === 'string' ? params.amount.trim() : ''
  const rate = typeof params.rate === 'string' ? params.rate.trim() : ''
  const createdAt = Array.isArray(params.createdAt) ? params.createdAt : undefined
  const rows = ALL_ROWS.filter((row) => {
    if (customer && !row.customer.includes(customer)) return false
    if (params.status && row.status !== params.status) return false
    if (createdAt?.[0] && createdAt[1]) {
      const day = row.createdAt.slice(0, 10)
      if (day < createdAt[0] || day > createdAt[1]) return false
    }
    if (orderNo && !row.orderNo.includes(orderNo)) return false
    if (params.warehouse && row.warehouse !== params.warehouse) return false
    if (params.route && row.route !== params.route) return false
    if (destination && !row.destination.includes(destination)) return false
    if (params.priority && row.priority !== params.priority) return false
    if (sku && !row.sku.includes(sku)) return false
    if (params.urgent != null && row.urgent !== params.urgent) return false
    if (remark && !row.remark.includes(remark)) return false
    if (id && !row.id.includes(id)) return false
    if (params.label && !row.labels.includes(params.label)) return false
    if (note && !row.note.includes(note)) return false
    if (quantity && !String(row.quantity).includes(quantity)) return false
    if (progress && !String(row.progress).includes(progress)) return false
    if (amount && !String(row.amount).includes(amount)) return false
    if (rate && (row.rate == null || !String(row.rate).includes(rate))) return false
    if (params.dateValue && row.dateValue.slice(0, 10) !== params.dateValue) return false
    if (params.year && row.yearValue.slice(0, 4) !== params.year) return false
    if (owner && !row.owner.includes(owner)) return false
    return true
  })
  if (params.sortBy && params.sortOrder) {
    const direction = params.sortOrder === 'ascend' ? 1 : -1
    const key = params.sortBy as keyof PlaygroundRow
    rows.sort((left, right) => {
      const leftValue = left[key]
      const rightValue = right[key]
      if (leftValue === rightValue) return 0
      if (leftValue === undefined) return 1
      if (rightValue === undefined) return -1
      return leftValue > rightValue ? direction : -direction
    })
  }

  const start = (params.page - 1) * params.pageSize

  return {
    data: rows.slice(start, start + params.pageSize),
    total: rows.length,
  }
}

const columns: ProTableColumnType<PlaygroundRow>[] = [
  {
    key: 'serial',
    title: '序号',
    width: 64,
    valueType: 'index',
  },
  {
    key: 'indexBorder',
    title: '序号(边框)',
    width: 120,
    valueType: 'indexBorder',
  },
  {
    key: 'id',
    title: 'ID',
    dataIndex: 'id',
    width: 88,
    fixed: 'left',
    sorter: true,
  },
  {
    key: 'orderNo',
    title: '订单号',
    dataIndex: 'orderNo',
    width: 160,
    sorter: true,
  },
  {
    key: 'customer',
    title: '客户',
    dataIndex: 'customer',
    width: 160,
  },
  {
    key: 'status',
    title: '状态 Tag',
    dataIndex: 'status',
    width: 120,
    valueType: 'tag',
    valueEnum: {
      pending: { text: '待处理', color: 'warning' },
      shipping: { text: '运输中', color: 'processing' },
      done: { text: '已完成', color: 'success' },
    },
  },
  {
    key: 'priority',
    title: '优先级',
    dataIndex: 'priority',
    width: 130,
    valueEnum: {
      low: { text: '低', status: 'default' },
      normal: { text: '中', status: 'processing' },
      high: { text: '高', status: 'error' },
    },
  },
  {
    key: 'labels',
    title: '标签 Enum[]',
    dataIndex: 'labels',
    width: 160,
    valueEnum: {
      east: { text: '华东', color: 'blue' },
      urgent: { text: '加急', color: 'red' },
      bonded: { text: '保税', color: 'gold' },
    },
  },
  {
    key: 'amount',
    title: '金额',
    dataIndex: 'amount',
    width: 140,
    align: 'right',
    sorter: true,
    valueType: { type: 'money', currency: 'CNY' },
  },
  {
    key: 'rate',
    title: '完成率',
    dataIndex: 'rate',
    width: 110,
    align: 'right',
    valueType: { type: 'percent', precision: 1, showColor: true },
  },
  {
    key: 'quantity',
    title: '件数 Digit',
    dataIndex: 'quantity',
    width: 110,
    align: 'right',
    valueType: 'digit',
    fieldProps: { precision: 0 },
  },
  {
    key: 'progress',
    title: '进度',
    dataIndex: 'progress',
    width: 160,
    valueType: 'progress',
  },
  {
    key: 'urgent',
    title: '加急',
    dataIndex: 'urgent',
    width: 88,
    valueType: 'boolean',
  },
  {
    key: 'owner',
    title: '负责人',
    dataIndex: 'owner',
    width: 150,
    valueEnum: {
      张敏: '张敏 / 运营',
      李想: '李想 / 调度',
      周宁: '周宁 / 仓储',
      王雪: '王雪 / 客服',
      陈舟: '陈舟 / 关务',
    },
  },
  {
    key: 'warehouse',
    title: '仓库',
    dataIndex: 'warehouse',
    width: 120,
  },
  {
    key: 'route',
    title: '线路',
    dataIndex: 'route',
    width: 140,
  },
  {
    key: 'destination',
    title: '目的地',
    dataIndex: 'destination',
    width: 180,
  },
  {
    key: 'createdAt',
    title: '创建时间',
    dataIndex: 'createdAt',
    width: 180,
    sorter: true,
    valueType: 'dateTime',
  },
  {
    key: 'dateValue',
    title: '日期',
    dataIndex: 'dateValue',
    width: 120,
    valueType: 'date',
  },
  {
    key: 'weekValue',
    title: '周',
    dataIndex: 'weekValue',
    width: 110,
    valueType: 'week',
  },
  {
    key: 'monthValue',
    title: '月',
    dataIndex: 'monthValue',
    width: 100,
    valueType: 'month',
  },
  {
    key: 'yearValue',
    title: '年',
    dataIndex: 'yearValue',
    width: 88,
    valueType: 'year',
  },
  {
    key: 'sku',
    title: 'SKU Code',
    dataIndex: 'sku',
    width: 120,
    valueType: 'code',
  },
  {
    key: 'remark',
    title: '备注',
    dataIndex: 'remark',
    width: 120,
  },
]

function hiddenInput(key: Extract<keyof PlaygroundQuery, string>, label: string): ProTableFilter<PlaygroundQuery> {
  return {
    key,
    label,
    hidden: true,
    render: ({ value, setValue }) => (
      <Input
        allowClear
        placeholder={label}
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => {
          const next = event.target.value
          setValue((next === '' ? undefined : next) as never)
        }}
      />
    ),
  } as ProTableFilter<PlaygroundQuery>
}

function hiddenSelect(
  key: Extract<keyof PlaygroundQuery, string>,
  label: string,
  options: Array<{ label: string; value: string }>,
): ProTableFilter<PlaygroundQuery> {
  return {
    key,
    label,
    hidden: true,
    tagTextFormatter: createSelectTagTextResolver({ options }),
    render: ({ value, setValue }) => (
      <Select
        allowClear
        options={options}
        placeholder={label}
        popupMatchSelectWidth={false}
        value={typeof value === 'string' ? value : undefined}
        onChange={(next) => setValue((next ?? undefined) as never)}
      />
    ),
  } as ProTableFilter<PlaygroundQuery>
}

function hiddenDate(key: Extract<keyof PlaygroundQuery, string>, label: string): ProTableFilter<PlaygroundQuery> {
  return {
    key,
    label,
    hidden: true,
    tagTextFormatter: createDateTagTextResolver(),
    render: ({ value, setValue }) => (
      <DatePicker
        allowClear
        placeholder={label}
        value={typeof value === 'string' && value ? dayjs(value) : null}
        onChange={(_date, dateString) => {
          setValue((typeof dateString === 'string' && dateString ? dateString : undefined) as never)
        }}
      />
    ),
  } as ProTableFilter<PlaygroundQuery>
}

const filters: ProTableFilter<PlaygroundQuery>[] = [
  {
    key: 'customer',
    label: '客户',
    render: ({ value, setValue }) => (
      <Input
        allowClear
        placeholder="客户名称"
        value={value ?? ''}
        onChange={(event) => {
          const next = event.target.value
          setValue(next === '' ? undefined : next)
        }}
      />
    ),
  },
  {
    key: 'status',
    label: '状态',
    tagTextFormatter: createSelectTagTextResolver({ options: STATUS_OPTIONS }),
    render: ({ value, setValue }) => (
      <Select
        allowClear
        showSearch
        options={STATUS_OPTIONS}
        placeholder="状态"
        popupMatchSelectWidth={false}
        value={value}
        onChange={(next) => setValue(next ?? undefined)}
      />
    ),
  },
  {
    key: 'createdAt',
    label: '创建时间',
    tagTextFormatter: createDateRangeTagTextResolver(),
    render: ({ value, setValue }) => {
      const start = value?.[0]
      const end = value?.[1]

      return (
        <DatePicker.RangePicker
          allowClear
          placeholder={['开始日期', '结束日期']}
          value={start && end ? [dayjs(start), dayjs(end)] : null}
          onChange={(_dates, dateStrings) => {
            const [nextStart, nextEnd] = dateStrings ?? []
            setValue(nextStart && nextEnd ? [nextStart, nextEnd] : undefined)
          }}
        />
      )
    },
  },
  {
    key: 'orderNo',
    label: '订单号',
    render: ({ value, setValue }) => (
      <Input
        allowClear
        placeholder="订单号"
        value={value ?? ''}
        onChange={(event) => {
          const next = event.target.value
          setValue(next === '' ? undefined : next)
        }}
      />
    ),
  },
  {
    key: 'warehouse',
    label: '仓库',
    tagTextFormatter: createSelectTagTextResolver({ options: WAREHOUSE_OPTIONS }),
    render: ({ value, setValue }) => (
      <Select
        allowClear
        options={WAREHOUSE_OPTIONS}
        placeholder="仓库"
        popupMatchSelectWidth={false}
        value={value}
        onChange={(next) => setValue(next ?? undefined)}
      />
    ),
  },
  {
    key: 'route',
    label: '线路',
    tagTextFormatter: createSelectTagTextResolver({ options: ROUTE_OPTIONS }),
    render: ({ value, setValue }) => (
      <Select
        allowClear
        options={ROUTE_OPTIONS}
        placeholder="线路"
        popupMatchSelectWidth={false}
        value={value}
        onChange={(next) => setValue(next ?? undefined)}
      />
    ),
  },
  {
    key: 'destination',
    label: '目的地',
    tagTextFormatter: createSelectTagTextResolver({ options: DESTINATION_OPTIONS }),
    render: ({ value, setValue }) => (
      <Select
        allowClear
        options={DESTINATION_OPTIONS}
        placeholder="目的地"
        popupMatchSelectWidth={false}
        value={value}
        onChange={(next) => setValue(next ?? undefined)}
      />
    ),
  },
  {
    key: 'priority',
    label: '优先级',
    tagTextFormatter: createSelectTagTextResolver({ options: PRIORITY_OPTIONS }),
    render: ({ value, setValue }) => (
      <Select
        allowClear
        options={PRIORITY_OPTIONS}
        placeholder="优先级"
        popupMatchSelectWidth={false}
        value={value}
        onChange={(next) => setValue(next ?? undefined)}
      />
    ),
  },
  {
    key: 'sku',
    label: 'SKU',
    render: ({ value, setValue }) => (
      <Input
        allowClear
        placeholder="SKU"
        value={value ?? ''}
        onChange={(event) => {
          const next = event.target.value
          setValue(next === '' ? undefined : next)
        }}
      />
    ),
  },
  {
    key: 'urgent',
    label: '加急',
    tagTextFormatter: createSelectTagTextResolver({ options: URGENT_OPTIONS }),
    render: ({ value, setValue }) => (
      <Select
        allowClear
        options={URGENT_OPTIONS}
        placeholder="加急"
        popupMatchSelectWidth={false}
        value={value}
        onChange={(next) => setValue(next)}
      />
    ),
  },
  {
    key: 'remark',
    label: '备注',
    render: ({ value, setValue }) => (
      <Input
        allowClear
        placeholder="备注"
        value={value ?? ''}
        onChange={(event) => {
          const next = event.target.value
          setValue(next === '' ? undefined : next)
        }}
      />
    ),
  },
  {
    key: 'id',
    label: 'ID',
    render: ({ value, setValue }) => (
      <Input
        allowClear
        placeholder="ID"
        value={value ?? ''}
        onChange={(event) => {
          const next = event.target.value
          setValue(next === '' ? undefined : next)
        }}
      />
    ),
  },
  {
    key: 'label',
    label: '标签',
    tagTextFormatter: createSelectTagTextResolver({ options: LABEL_OPTIONS }),
    render: ({ value, setValue }) => (
      <Select
        allowClear
        options={LABEL_OPTIONS}
        placeholder="标签"
        popupMatchSelectWidth={false}
        value={value}
        onChange={(next) => setValue(next ?? undefined)}
      />
    ),
  },
  {
    key: 'note',
    label: '说明',
    render: ({ value, setValue }) => (
      <Input
        allowClear
        placeholder="说明"
        value={value ?? ''}
        onChange={(event) => {
          const next = event.target.value
          setValue(next === '' ? undefined : next)
        }}
      />
    ),
  },
  {
    key: 'quantity',
    label: '件数',
    render: ({ value, setValue }) => (
      <Input
        allowClear
        placeholder="件数"
        value={value ?? ''}
        onChange={(event) => {
          const next = event.target.value
          setValue(next === '' ? undefined : next)
        }}
      />
    ),
  },
  {
    key: 'progress',
    label: '进度',
    render: ({ value, setValue }) => (
      <Input
        allowClear
        placeholder="进度"
        value={value ?? ''}
        onChange={(event) => {
          const next = event.target.value
          setValue(next === '' ? undefined : next)
        }}
      />
    ),
  },
  {
    key: 'amount',
    label: '金额',
    render: ({ value, setValue }) => (
      <Input
        allowClear
        placeholder="金额"
        value={value ?? ''}
        onChange={(event) => {
          const next = event.target.value
          setValue(next === '' ? undefined : next)
        }}
      />
    ),
  },
  {
    key: 'rate',
    label: '完成率',
    render: ({ value, setValue }) => (
      <Input
        allowClear
        placeholder="完成率"
        value={value ?? ''}
        onChange={(event) => {
          const next = event.target.value
          setValue(next === '' ? undefined : next)
        }}
      />
    ),
  },
  {
    key: 'dateValue',
    label: '日期',
    tagTextFormatter: createDateTagTextResolver(),
    render: ({ value, setValue }) => (
      <DatePicker
        allowClear
        placeholder="日期"
        value={value ? dayjs(value) : null}
        onChange={(_date, dateString) => {
          setValue(typeof dateString === 'string' && dateString ? dateString : undefined)
        }}
      />
    ),
  },
  {
    key: 'year',
    label: '年份',
    tagTextFormatter: createDateTagTextResolver({ format: 'YYYY' }),
    render: ({ value, setValue }) => (
      <DatePicker
        allowClear
        picker="year"
        placeholder="年份"
        value={value ? dayjs(value) : null}
        onChange={(_date, dateString) => {
          setValue(typeof dateString === 'string' && dateString ? dateString : undefined)
        }}
      />
    ),
  },
  hiddenInput('owner', '负责人'),
  hiddenInput('billNo', '提单号'),
  hiddenInput('containerNo', '柜号'),
  hiddenInput('customsNo', '报关单号'),
  hiddenInput('contact', '联系人'),
  hiddenInput('phone', '联系电话'),
  hiddenInput('email', '邮箱'),
  hiddenInput('region', '区域'),
  hiddenInput('plateNo', '车牌号'),
  hiddenInput('driver', '司机'),
  hiddenInput('carrier', '承运商'),
  hiddenInput('channel', '来源渠道'),
  hiddenInput('customerLevel', '客户等级'),
  hiddenInput('tradeTerm', '贸易条款'),
  hiddenInput('customsStatus', '关务状态'),
  hiddenInput('invoiceNo', '发票号'),
  hiddenInput('contractNo', '合同号'),
  hiddenInput('projectNo', '项目号'),
  hiddenInput('dept', '所属部门'),
  hiddenSelect('currency', '币种', CURRENCY_OPTIONS),
  hiddenSelect('settleMethod', '结算方式', SETTLE_OPTIONS),
  hiddenSelect('bizType', '业务类型', BIZ_TYPE_OPTIONS),
  hiddenDate('etd', '预计离港'),
  hiddenDate('eta', '预计到港'),
]

export default function ProTablePlayground() {
  const { message } = App.useApp()

  return (
    <ProLayoutContentContainer mode="fill">
      <ProTable<PlaygroundRow, PlaygroundQuery>
        rowKey="id"
        heightMode="fill"
        persistenceKey="playground-pro-table"
        queryRequest={queryOrders}
        columns={columns}
        filters={filters}
        views
        columnResize
        rowHighlight
        thinScrollbar
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
        }}
        toolbar={{
          actionItems: [
            {
              key: 'create',
              type: 'primary',
              label: '新建订单',
              onClick: () => {
                void message.success('模拟新建订单')
              },
            },
            {
              key: 'export',
              label: '导出',
              onClick: () => {
                void message.success('模拟导出')
              },
            },
          ],
        }}
        actionColumn={{
          actions: ({ record }) => [
            {
              key: 'view',
              label: '查看',
              onClick: () => {
                void message.info(`查看 ${record.orderNo}`)
              },
            },
            {
              key: 'edit',
              label: '编辑',
              onClick: () => {
                void message.info(`编辑 ${record.orderNo}`)
              },
            },
            {
              key: 'delete',
              label: '删除',
              danger: true,
              popconfirm: {
                title: `确定删除 ${record.orderNo} 吗？`,
                onConfirm: () => {
                  void message.success(`已模拟删除 ${record.orderNo}`)
                },
              },
            },
          ],
        }}
        style={{ flex: 1, minHeight: 0, height: '100%' }}
      />
    </ProLayoutContentContainer>
  )
}
