import {
  FilterOutlined,
  MoreOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { ActionIcon } from '@zby/ui'
import { Badge, Space } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function ContentExample() {
  return (
    <PlaygroundCase title="icon / children / Badge">
      <Space wrap>
        <ActionIcon icon={<SearchOutlined />} aria-label="icon 属性" />
        <ActionIcon aria-label="children 回退">
          <FilterOutlined />
        </ActionIcon>
        <Badge count={8}>
          <ActionIcon icon={<MoreOutlined />} aria-label="带角标操作" />
        </Badge>
      </Space>
    </PlaygroundCase>
  )
}
