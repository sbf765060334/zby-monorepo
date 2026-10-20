import { useIntl, type IntlShape } from '@zby/intl'
import {
  createBooleanTagTextResolver,
  createCascaderTagTextResolver,
  createDateRangeTagTextResolver,
  createDateTagTextResolver,
  createPrimitiveTagTextResolver,
  createSelectTagTextResolver,
  createTimeRangeTagTextResolver,
  createTimeTagTextResolver,
  createTreeSelectTagTextResolver,
  ProLayoutContentContainer,
  ProTable,
  ProTableActions,
  type ProTableColumnType,
  type ProTableFilter,
  type ProTableQueryRequest,
} from '@zby/pro'
import { App, Button, Cascader, DatePicker, Input, Select, Switch, Tag, TimePicker, TreeSelect } from 'antd'
import dayjs from 'dayjs'
import { useMemo } from 'react'

type OrderStatus = 'pending' | 'shipping' | 'done'
type OrderPriority = 'low' | 'normal' | 'high'
type OrderLabel =
  | 'east'
  | 'urgent'
  | 'bonded'
  | 'fragile'
  | 'cold'
  | 'oversize'
  | 'hazard'
  | 'trunk'
  | 'same-day'
  | 'bonded-direct'
  | 'fragile-pack'
  | 'cold-chain'
  | 'oversize-truck'
  | 'hazard-declare'
  | 'cross-border'
  | 'instant'
  | 'night'

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
  regionPath: string[]
}

type PlaygroundQuery = {
  customer?: string
  status?: OrderStatus
  createdAt?: [string, string]
  label?: OrderLabel[]
  regionPath?: string[][]
  urgent?: boolean
  owner?: string
  warehouse?: string[]
  dateValue?: string
  departTime?: string
  workTime?: [string, string]
}

const STATUS_OPTIONS: Array<{ label: string; value: OrderStatus }> = [
  { label: '待处理', value: 'pending' },
  { label: '运输中', value: 'shipping' },
  { label: '已完成', value: 'done' },
]

const OWNERS = ['张敏', '李想', '周宁', '王雪', '陈舟']
const CUSTOMERS = ['星河贸易', '北辰物流', '青云供应链', '远航进出口', '临港仓储']
const WAREHOUSES = ['上海仓', '杭州仓', '苏州仓', '宁波仓', '广州仓', '深圳仓']
const ROUTES = ['华东干线', '沿海快运', '跨境陆运', '城配循环']
const DESTINATIONS = ['上海市浦东新区', '杭州市余杭区', '苏州市工业园区', '宁波市北仑区']
const LABEL_OPTIONS: Array<{ label: string; value: OrderLabel }> = [
  { label: '华东', value: 'east' },
  { label: '加急', value: 'urgent' },
  { label: '保税', value: 'bonded' },
  { label: '易碎', value: 'fragile' },
  { label: '冷链', value: 'cold' },
  { label: '超大', value: 'oversize' },
  { label: '危品', value: 'hazard' },
  { label: '华东干线优先', value: 'trunk' },
  { label: '加急当日达', value: 'same-day' },
  { label: '保税仓直发', value: 'bonded-direct' },
  { label: '易碎品加固包装', value: 'fragile-pack' },
  { label: '冷链全程温控', value: 'cold-chain' },
  { label: '超大件专车配送', value: 'oversize-truck' },
  { label: '危险品申报联运', value: 'hazard-declare' },
  { label: '跨境保税联运', value: 'cross-border' },
  { label: '同城即时配送', value: 'instant' },
  { label: '夜间仓配加急', value: 'night' },
]
const REGION_OPTIONS = [
  {
    label: '华东',
    value: 'east',
    children: [
      { label: '上海', value: 'sh' },
      { label: '杭州', value: 'hz' },
      { label: '苏州', value: 'sz' },
      { label: '宁波', value: 'nb' },
      { label: '上海市浦东新区', value: 'sh-pd' },
      { label: '杭州市余杭区', value: 'hz-yh' },
      { label: '苏州市工业园区', value: 'sz-gy' },
      { label: '宁波市北仑区', value: 'nb-bl' },
    ],
  },
  {
    label: '华北',
    value: 'north',
    children: [
      { label: '北京', value: 'bj' },
      { label: '天津', value: 'tj' },
      { label: '北京市朝阳区', value: 'bj-cy' },
      { label: '天津市滨海新区', value: 'tj-bh' },
    ],
  },
  {
    label: '华南',
    value: 'south',
    children: [
      { label: '广州', value: 'gz' },
      { label: '深圳', value: 'szn' },
      { label: '广州市南沙区', value: 'gz-ns' },
      { label: '深圳市前海合作区', value: 'sz-qh' },
    ],
  },
  {
    label: '西南',
    value: 'southwest',
    children: [
      { label: '成都市高新区', value: 'cd-gx' },
      { label: '重庆市两江新区', value: 'cq-lj' },
      { label: '昆明市呈贡区', value: 'km-cg' },
    ],
  },
]
const REGION_PATHS = REGION_OPTIONS.flatMap((region) =>
  (region.children ?? []).map((city) => [region.value, city.value]),
)
const WAREHOUSE_TREE = [
  {
    title: '华东',
    value: 'east-wh',
    children: [
      { title: '上海仓', value: '上海仓' },
      { title: '杭州仓', value: '杭州仓' },
      { title: '苏州仓', value: '苏州仓' },
      { title: '宁波仓', value: '宁波仓' },
    ],
  },
  {
    title: '华南',
    value: 'south-wh',
    children: [
      { title: '广州仓', value: '广州仓' },
      { title: '深圳仓', value: '深圳仓' },
    ],
  },
]
const STATUSES: OrderStatus[] = ['pending', 'shipping', 'done']
const PRIORITIES: OrderPriority[] = ['low', 'normal', 'high']
const LABEL_SETS: OrderLabel[][] = [['east'], ['east', 'urgent'], ['bonded'], ['urgent', 'bonded']]

function createPlaygroundRows(length: number): PlaygroundRow[] {
  return Array.from({ length }, (_, index) => {
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
      regionPath: REGION_PATHS[index % REGION_PATHS.length],
    }
  })
}

const ALL_ROWS = createPlaygroundRows(500)

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

const queryOrders: ProTableQueryRequest<PlaygroundRow, PlaygroundQuery> = async (params) => {
  await wait(3000)

  const customer = typeof params.customer === 'string' ? params.customer.trim() : ''
  const owner = typeof params.owner === 'string' ? params.owner.trim() : ''
  const createdAt = Array.isArray(params.createdAt) ? params.createdAt : undefined
  const selectedRegions = new Set((params.regionPath ?? []).map((path) => path.join('/')))
  const matched = ALL_ROWS.filter((row) => {
    if (customer && !row.customer.includes(customer)) return false
    if (params.status && row.status !== params.status) return false
    if (createdAt?.[0] && createdAt[1]) {
      const day = row.createdAt.slice(0, 10)
      if (day < createdAt[0] || day > createdAt[1]) return false
    }
    if (params.label?.length && !params.label.some((item) => row.labels.includes(item))) return false
    if (selectedRegions.size > 0 && !selectedRegions.has(row.regionPath.join('/'))) return false
    if (params.urgent != null && row.urgent !== params.urgent) return false
    if (owner && !row.owner.includes(owner)) return false
    if (params.warehouse?.length && !params.warehouse.includes(row.warehouse)) return false
    if (params.dateValue && row.dateValue.slice(0, 10) !== params.dateValue) return false
    return true
  })
  if (params.sort?.length) {
    matched.sort((left, right) => {
      for (const rule of params.sort!) {
        const direction = rule.order === 'ascend' ? 1 : -1
        const key = rule.field as keyof PlaygroundRow
        const leftValue = left[key]
        const rightValue = right[key]
        if (leftValue === rightValue) continue
        if (leftValue === undefined) return 1
        if (rightValue === undefined) return -1
        return leftValue > rightValue ? direction : -direction
      }
      return 0
    })
  }

  const start = (params.page - 1) * params.pageSize

  return {
    data: matched.slice(start, start + params.pageSize),
    total: matched.length,
  }
}

function columnTitle(intl: IntlShape, key: string, fallback: string) {
  return intl.getMessage(`playground.proTable.columns.${key}`, fallback)
}

function filterLabel(intl: IntlShape, key: string, fallback: string) {
  return intl.getMessage(`playground.proTable.filters.${key}`, fallback)
}

function createColumns(intl: IntlShape): ProTableColumnType<PlaygroundRow>[] {
  return [
    {
      key: 'serial',
      title: columnTitle(intl, 'serial', '序号'),
      width: 64,
      valueType: 'index',
      fixed: 'left',
    },
    {
      key: 'orderNo',
      title: columnTitle(intl, 'orderNo', '订单号'),
      dataIndex: 'orderNo',
      width: 136,
      sorter: true,
    },
    {
      key: 'longTag',
      title: '长标签',
      dataIndex: 'longTag',
      width: 120,
      render: (_value, record) => (
        <Tag style={{ whiteSpace: 'nowrap' }}>
          {record.customer} Pending warehouse confirmation
        </Tag>
      ),
    },
    {
      key: 'customer',
      title: columnTitle(intl, 'customer', '客户'),
      dataIndex: 'customer',
      width: 136,
      ellipsis: true,
      sorter: {
        multiple: 10,
        compare: (left, right) => left.customer.localeCompare(right.customer, 'zh-CN'),
      },
    },
    {
      key: 'status',
      title: columnTitle(intl, 'status', '状态'),
      dataIndex: 'status',
      width: 88,
      valueType: 'tag',
      ellipsis: true,
      valueEnum: {
        pending: { text: '待处理', color: 'warning' },
        shipping: { text: '运输中', color: 'processing' },
        done: { text: '已完成', color: 'success' },
      },
    },
    {
      key: 'priority',
      title: columnTitle(intl, 'priority', '优先级'),
      dataIndex: 'priority',
      ellipsis: true,
      width: 88,
      valueEnum: {
        low: { text: '低', status: 'default' },
        normal: { text: '中', status: 'processing' },
        high: { text: '高', status: 'error' },
      },
    },
    {
      key: 'amount',
      title: columnTitle(intl, 'amount', '金额'),
      dataIndex: 'amount',
      width: 120,
      align: 'right',
      sorter: { multiple: 2 },
      valueType: { type: 'money', currency: 'CNY' },
    },
    {
      key: 'rate',
      title: columnTitle(intl, 'rate', '完成率'),
      dataIndex: 'rate',
      width: 88,
      align: 'right',
      valueType: { type: 'percent', precision: 1 },
    },
    {
      key: 'quantity',
      title: columnTitle(intl, 'quantity', '件数'),
      dataIndex: 'quantity',
      width: 88,
      align: 'right',
      valueType: 'digit',
      fieldProps: { precision: 0 },
    },
    {
      key: 'progress',
      title: columnTitle(intl, 'progress', '进度'),
      dataIndex: 'progress',
      width: 200,
      valueType: 'progress',
    },
    {
      key: 'urgent',
      title: columnTitle(intl, 'urgent', '加急'),
      dataIndex: 'urgent',
      width: 64,
      valueType: 'boolean',
    },
    {
      key: 'owner',
      title: columnTitle(intl, 'owner', '负责人'),
      dataIndex: 'owner',
      width: 120,
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
      title: columnTitle(intl, 'warehouse', '仓库'),
      dataIndex: 'warehouse',
      width: 120,
    },
    {
      key: 'route',
      title: columnTitle(intl, 'route', '线路'),
      dataIndex: 'route',
      width: 120,
    },
    {
      key: 'destination',
      title: columnTitle(intl, 'destination', '目的地'),
      dataIndex: 'destination',
      width: 160,
    },
    {
      key: 'createdAt',
      title: columnTitle(intl, 'createdAt', '创建时间'),
      dataIndex: 'createdAt',
      width: 160,
      sorter: true,
      valueType: 'dateTime',
    },
    {
      key: 'dateValue',
      title: columnTitle(intl, 'date', '日期'),
      dataIndex: 'dateValue',
      width: 160,
      valueType: 'date',
    },
    {
      key: 'weekValue',
      title: columnTitle(intl, 'week', '周'),
      dataIndex: 'weekValue',
      width: 112,
      valueType: 'week',
    },
    {
      key: 'monthValue',
      title: columnTitle(intl, 'month', '月'),
      dataIndex: 'monthValue',
      width: 112,
      valueType: 'month',
    },
    {
      key: 'yearValue',
      title: columnTitle(intl, 'year', '年'),
      dataIndex: 'yearValue',
      width: 88,
      valueType: 'year',
    },
    {
      key: 'sku',
      title: columnTitle(intl, 'sku', 'SKU Code'),
      dataIndex: 'sku',
      width: 160,
      valueType: 'code',
    },
    {
      key: 'remark',
      title: <span>{columnTitle(intl, 'remark', '备注')}</span>,
      dataIndex: 'remark',
      width: 200,
    },
  ]
}

function createFilters(intl: IntlShape): ProTableFilter<PlaygroundQuery>[] {
  return [
    {
      key: 'customer',
      label: filterLabel(intl, 'customer', '客户'),
      tagTextFormatter: createPrimitiveTagTextResolver(),
      render: ({ value, setValue }) => (
        <Input
          allowClear
          placeholder="客户名称"
          value={value ?? ''}
          onChange={(event) => setValue(event.target.value)}
        />
      ),
    },
    {
      key: 'status',
      label: filterLabel(intl, 'status', '状态'),
      tagTextFormatter: createSelectTagTextResolver({ options: STATUS_OPTIONS }),
      render: ({ value, setValue }) => (
        <Select
          allowClear
          showSearch
          options={STATUS_OPTIONS}
          placeholder="状态"
          popupMatchSelectWidth={false}
          value={value}
          onChange={(next) => setValue(next)}
        />
      ),
    },
    {
      key: 'label',
      label: filterLabel(intl, 'label', '标签'),
      tagTextFormatter: createSelectTagTextResolver({ options: LABEL_OPTIONS }),
      render: ({ value, setValue }) => (
        <Select
          allowClear
          maxTagCount={1}
          mode="multiple"
          options={LABEL_OPTIONS}
          placeholder="标签"
          popupMatchSelectWidth={false}
          value={value}
          onChange={(next) => setValue(next)}
        />
      ),
    },
    {
      key: 'regionPath',
      label: filterLabel(intl, 'region', '区域'),
      tagTextFormatter: createCascaderTagTextResolver({ options: REGION_OPTIONS }),
      render: ({ value, setValue }) => (
        <Cascader
          allowClear
          maxTagCount="responsive"
          multiple
          options={REGION_OPTIONS}
          placeholder="区域"
          popupMatchSelectWidth={false}
          showCheckedStrategy={Cascader.SHOW_CHILD}
          value={value}
          onChange={(next) => setValue(next)}
        />
      ),
    },
    {
      key: 'createdAt',
      label: filterLabel(intl, 'createdAt', '创建时间'),
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
      key: 'urgent',
      label: filterLabel(intl, 'urgent', '加急'),
      tagTextFormatter: createBooleanTagTextResolver(),
      tagVisible: (value) => value === true,
      render: ({ value, setValue }) => (
        <Switch
          checked={value === true}
          onChange={(checked) => setValue(checked ? true : undefined)}
        />
      ),
    },
    {
      key: 'owner',
      label: filterLabel(intl, 'owner', '负责人'),
      hidden: true,
      tagTextFormatter: createPrimitiveTagTextResolver(),
      render: ({ value, setValue }) => (
        <Input
          allowClear
          placeholder="负责人"
          value={value ?? ''}
          onChange={(event) => setValue(event.target.value)}
        />
      ),
    },
    {
      key: 'warehouse',
      label: filterLabel(intl, 'warehouse', '仓库'),
      hidden: true,
      tagTextFormatter: createTreeSelectTagTextResolver({ options: WAREHOUSE_TREE }),
      render: ({ value, setValue }) => (
        <TreeSelect
          allowClear
          maxTagCount="responsive"
          multiple
          placeholder="仓库"
          popupMatchSelectWidth={false}
          showSearch
          treeData={WAREHOUSE_TREE}
          treeDefaultExpandAll
          value={value}
          onChange={(next) => setValue(next)}
        />
      ),
    },
    {
      key: 'dateValue',
      label: filterLabel(intl, 'date', '日期'),
      hidden: true,
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
      key: 'departTime',
      label: filterLabel(intl, 'departTime', '发车时间'),
      hidden: true,
      tagTextFormatter: createTimeTagTextResolver(),
      render: ({ value, setValue }) => (
        <TimePicker
          allowClear
          placeholder="发车时间"
          value={value ? dayjs(value, 'HH:mm:ss') : null}
          onChange={(_time, timeString) => {
            setValue(typeof timeString === 'string' && timeString ? timeString : undefined)
          }}
        />
      ),
    },
    {
      key: 'workTime',
      label: filterLabel(intl, 'workTime', '作业时段'),
      hidden: true,
      tagTextFormatter: createTimeRangeTagTextResolver(),
      render: ({ value, setValue }) => {
        const start = value?.[0]
        const end = value?.[1]

        return (
          <TimePicker.RangePicker
            allowClear
            placeholder={['开始时间', '结束时间']}
            value={start && end ? [dayjs(start, 'HH:mm:ss'), dayjs(end, 'HH:mm:ss')] : null}
            onChange={(_times, timeStrings) => {
              const [nextStart, nextEnd] = timeStrings ?? []
              setValue(nextStart && nextEnd ? [nextStart, nextEnd] : undefined)
            }}
          />
        )
      },
    },
  ]
}

export default function ProTablePlayground() {
  const intl = useIntl()
  const locale = intl.locale
  const { message } = App.useApp()
  const tableColumns = useMemo(() => {
    const actionColumn: ProTableColumnType<PlaygroundRow> = {
      key: 'actions',
      title: columnTitle(intl, 'actions', '操作'),
      align: 'center',
      width: 64,
      fixed: 'right',
      resizable: false,
      fieldConfig: false,
      render: (_value, record, index) => (
        <ProTableActions
          record={record}
          index={index}
          actions={[
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
              tooltip: '编辑订单',
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
          ]}
        />
      ),
    }
    return [...createColumns(intl), actionColumn]
  }, [intl, locale, message])
  const tableFilters = useMemo(() => createFilters(intl), [intl, locale])

  return (
    <ProLayoutContentContainer mode="fill">
      <ProTable<PlaygroundRow, PlaygroundQuery>
        controllerConfig={{
          rowKey: 'id',
          queryRequest: queryOrders,
          pagination: { defaultPageSize: 10 },
        }}
        heightMode="fill"
        persistenceKey="playground-pro-table"
        columns={tableColumns}
        filters={tableFilters}
        views
        columnResize
        rowHighlight
        thinScrollbar
        pagination={{
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100, 500],
        }}
        toolbar={{
          actions: (
            <>
              <Button
                type="primary"
                onClick={() => {
                  void message.success('模拟新建订单')
                }}
              >
                新建订单
              </Button>
              <Button
                onClick={() => {
                  void message.success('模拟导出')
                }}
              >
                导出
              </Button>
            </>
          ),
        }}
        style={{ flex: 1, minHeight: 0, height: '100%' }}
      />
    </ProLayoutContentContainer>
  )
}
