import { ActionText } from '@zby/ui'
import { App, Form, Input, Space, Switch, Typography } from 'antd'
import * as React from 'react'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

const { Text } = Typography
export default function ControlledEditExample() {
  const { message } = App.useApp()
  const [open, setOpen] = React.useState(false)
  return (
    <PlaygroundCase title="受控打开 + 自定义表单">
      <Space orientation="vertical">
        <Space>
          <Switch checked={open} onChange={setOpen} />
          <Text>{open ? 'Popover 已打开' : 'Popover 已关闭'}</Text>
        </Space>
        <ActionText
          actionsVisibleOn="always"
          editable={{
            text: '深圳南山科技园店',
            open,
            onOpenChange: setOpen,
            name: 'name',
            title: '自定义编辑表单',
            formProps: { initialValues: { remark: '重点客户' } },
            renderForm: ({ name, inputNode }) => (
              <>
                <Form.Item
                  name={name}
                  label="门店名称"
                  rules={[{ required: true }]}
                >
                  {inputNode}
                </Form.Item>
                <Form.Item name="remark" label="备注">
                  <Input.TextArea rows={2} />
                </Form.Item>
              </>
            ),
            onConfirm: (value, info) =>
              void message.success(
                `${value} / ${info.values.remark || '无备注'}`,
              ),
          }}
        >
          深圳南山科技园店
        </ActionText>
      </Space>
    </PlaygroundCase>
  )
}
