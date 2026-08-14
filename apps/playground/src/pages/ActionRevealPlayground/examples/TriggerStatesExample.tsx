import { SearchOutlined } from '@ant-design/icons'
import { ActionReveal } from '@zby/ui'
import { App, Space, Switch } from 'antd'
import * as React from 'react'
import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { renderInputContent } from '../shared'

export default function TriggerStatesExample() {
  const { message } = App.useApp()
  const [hidden, setHidden] = React.useState(false)
  return (
    <PlaygroundCase
      title="hidden / disabled / 阻止展开"
      description="原生状态和触发按钮事件由关闭态按钮承接。"
    >
      <Space orientation="vertical">
        <Switch
          checked={hidden}
          onChange={setHidden}
          checkedChildren="隐藏"
          unCheckedChildren="显示"
        />
        <Space wrap>
          <ActionReveal
            hidden={hidden}
            triggerIcon={<SearchOutlined />}
            actionIconProps={{ 'aria-label': '可隐藏触发器' }}
            content={renderInputContent('可隐藏内容')}
          />
          <ActionReveal
            disabled
            triggerIcon={<SearchOutlined />}
            actionIconProps={{ 'aria-label': '禁用触发器' }}
            content={renderInputContent('不会展开')}
          />
          <ActionReveal
            triggerIcon={<SearchOutlined />}
            actionIconProps={{
              'aria-label': '阻止展开触发器',
              danger: true,
              onClick: (event) => {
                event.preventDefault()
                void message.info('onClick 已阻止展开')
              },
            }}
            content={renderInputContent('不会展开')}
          />
        </Space>
      </Space>
    </PlaygroundCase>
  )
}
