import {
  EditOutlined,
  LineChartOutlined,
  MoreOutlined,
} from '@ant-design/icons'
import { ActionIcon } from '@zby/ui'
import { App, Space, Table, type TableColumnsType } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

type Row = { key: string; name: string; owner: string; disabled?: boolean }
const data: Row[] = [
  { key: '1', name: '杭州西湖旗舰店', owner: '张三' },
  { key: '2', name: '上海静安体验店', owner: '李四', disabled: true },
  { key: '3', name: '深圳南山科技园店', owner: '王五' },
]
export default function TableActionsExample() {
  const { message } = App.useApp()
  const report = (value: string) => void message.success(value)
  const columns: TableColumnsType<Row> = [
    { title: '门店', dataIndex: 'name' },
    { title: '负责人', dataIndex: 'owner', width: 120 },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, row) => (
        <Space size={4}>
          <ActionIcon
            size="small"
            color="primary"
            icon={<LineChartOutlined />}
            aria-label={`查看${row.name}报表`}
            onClick={() => report(`查看${row.name}报表`)}
          />
          <ActionIcon
            size="small"
            icon={<EditOutlined />}
            aria-label={`编辑${row.name}`}
            onClick={() => report(`编辑${row.name}`)}
          />
          <ActionIcon
            size="small"
            icon={<MoreOutlined />}
            aria-label={`${row.name}更多操作`}
            disabled={row.disabled}
          />
        </Space>
      ),
    },
  ]
  return (
    <PlaygroundCase title="small 尺寸操作列">
      <Table<Row>
        rowKey="key"
        columns={columns}
        dataSource={data}
        pagination={false}
        size="small"
        scroll={{ x: 520 }}
      />
    </PlaygroundCase>
  )
}
