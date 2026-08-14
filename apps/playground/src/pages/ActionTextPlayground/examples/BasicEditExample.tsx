import { ActionText } from '@zby/ui'
import { App } from 'antd'
import * as React from 'react'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function BasicEditExample() {
  const { message } = App.useApp()
  const [text, setText] = React.useState('杭州西湖旗舰店')
  return (
    <PlaygroundCase title="基础编辑">
      <ActionText
        actionsVisibleOn="always"
        editable={{
          text,
          onConfirm: (value) => {
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
