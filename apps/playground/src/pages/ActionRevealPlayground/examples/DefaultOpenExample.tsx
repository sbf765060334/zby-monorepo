import { CloseOutlined, SettingOutlined } from '@ant-design/icons'
import { ActionReveal } from '@zby/ui'
import { App, Button, Space, Typography } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

const { Text } = Typography

export default function DefaultOpenExample() {
  const { message } = App.useApp()
  return (
    <PlaygroundCase
      title="defaultOpen + 主动关闭"
      description="默认展开但不抢焦点，只能由内容主动关闭。"
    >
      <ActionReveal
        defaultOpen
        autoFocus={false}
        collapseOnBlur={false}
        width={300}
        triggerIcon={<SettingOutlined />}
        actionIconProps={{ 'aria-label': '重新打开默认内容' }}
        content={({ close, contentProps, open, expanded }) => {
          const { ref, ...restProps } = contentProps
          return (
            <div
              {...restProps}
              ref={ref as React.Ref<HTMLDivElement>}
              tabIndex={-1}
            >
              <Space style={{ width: '100%', paddingInline: 8 }}>
                <Text ellipsis style={{ flex: 1 }}>
                  open={String(open)} / expanded={String(expanded)}
                </Text>
                <Button
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => {
                    void message.success('内容已主动关闭')
                    close()
                  }}
                >
                  收起
                </Button>
              </Space>
            </div>
          )
        }}
      />
    </PlaygroundCase>
  )
}
