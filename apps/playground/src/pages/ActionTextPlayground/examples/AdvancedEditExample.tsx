import { CheckOutlined } from '@ant-design/icons'
import { ActionText } from '@zby/ui'
import { App } from 'antd'
import * as React from 'react'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function AdvancedEditExample() {
  const { message } = App.useApp()
  const [text, setText] = React.useState('上海静安体验店')
  return (
    <PlaygroundCase title="Textarea + 校验 + 异步确认">
      <ActionText
        actionsVisibleOn="always"
        editable={{
          text,
          title: '编辑完整门店名称',
          inputType: 'textarea',
          inputProps: {
            autoSize: { minRows: 2, maxRows: 4 },
            maxLength: 80,
            showCount: true,
          },
          formItemProps: {
            label: '门店名称',
            rules: [{ required: true, message: '请输入门店名称' }],
          },
          confirmText: '异步保存',
          cancelText: '放弃',
          confirmButtonProps: { icon: <CheckOutlined /> },
          onConfirm: async (value) => {
            await new Promise((resolve) => setTimeout(resolve, 500))
            setText(value)
            void message.success(`已保存：${value}`)
          },
        }}
      >
        {text}
      </ActionText>
    </PlaygroundCase>
  )
}
