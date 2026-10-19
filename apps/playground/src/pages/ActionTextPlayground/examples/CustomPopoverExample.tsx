import { EditOutlined } from '@ant-design/icons'
import { ActionIcon, ActionText } from '@zby/ui'
import { App, Button, Input, Popover, Space } from 'antd'
import * as React from 'react'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function CustomPopoverExample() {
  const { message } = App.useApp()
  const [name, setName] = React.useState('杭州西湖旗舰店')
  const [draft, setDraft] = React.useState(name)
  const [open, setOpen] = React.useState(false)

  return (
    <PlaygroundCase
      title="自定义按钮和弹层"
      description="弹层打开时 actionsVisible 钉住操作区，确认逻辑由业务自己处理。"
    >
      <ActionText
        actionsVisibleOn="self-hover"
        actionsVisible={open}
        actions={
          <Popover
            trigger="click"
            open={open}
            onOpenChange={(next) => {
              setOpen(next)
              if (next) setDraft(name)
            }}
            content={
              <Space orientation="vertical" style={{ width: 240 }}>
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <Button
                  type="primary"
                  size="small"
                  onClick={() => {
                    setName(draft)
                    setOpen(false)
                    void message.success(`已保存：${draft}`)
                  }}
                >
                  确定
                </Button>
              </Space>
            }
          >
            <ActionIcon size="small" icon={<EditOutlined />} aria-label="编辑" />
          </Popover>
        }
      >
        {name}
      </ActionText>
    </PlaygroundCase>
  )
}
