import {
  DeleteOutlined,
  SearchOutlined,
  StarOutlined,
} from '@ant-design/icons'
import { ActionIcon } from '@zby/ui'
import { Space } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function StatesExample() {
  return (
    <PlaygroundCase title="基础状态">
      <Space wrap>
        <ActionIcon icon={<SearchOutlined />} aria-label="默认" />
        <ActionIcon icon={<StarOutlined />} aria-label="选中" selected />
        <ActionIcon icon={<DeleteOutlined />} aria-label="危险" danger />
        <ActionIcon icon={<SearchOutlined />} aria-label="禁用" disabled />
        <ActionIcon
          icon={<SearchOutlined />}
          aria-label="圆形"
          shape="circle"
        />
      </Space>
    </PlaygroundCase>
  )
}
