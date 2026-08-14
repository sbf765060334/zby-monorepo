import { SettingOutlined } from '@ant-design/icons'
import { ActionReveal } from '@zby/ui'
import { Button, Input, Space, Switch, Typography } from 'antd'
import * as React from 'react'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

const { Text } = Typography

export default function ControlledOpenExample() {
  const [open, setOpen] = React.useState(false)
  return (
    <PlaygroundCase
      title="受控 open + close"
      description="外部状态是唯一真值，内容关闭后焦点回到触发按钮。"
    >
      <Space orientation="vertical">
        <Space>
          <Switch checked={open} onChange={setOpen} />
          <Text>{open ? '已展开' : '已收起'}</Text>
        </Space>
        <ActionReveal
          open={open}
          onOpenChange={setOpen}
          triggerIcon={<SettingOutlined />}
          actionIconProps={{ 'aria-label': '打开受控内容' }}
          collapseOnBlur={false}
          width={300}
          content={({ close, contentProps }) => {
            const { ref, ...restProps } = contentProps
            return (
              <div
                {...restProps}
                ref={ref as React.Ref<HTMLDivElement>}
                tabIndex={-1}
              >
                <Space style={{ width: '100%', paddingInline: 8 }}>
                  <Input placeholder="受控内容" />
                  <Button size="small" onClick={close}>
                    收起
                  </Button>
                </Space>
              </div>
            )
          }}
        />
      </Space>
    </PlaygroundCase>
  )
}
