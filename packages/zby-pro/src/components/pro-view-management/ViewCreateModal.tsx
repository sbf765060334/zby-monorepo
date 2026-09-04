import { useIntl } from '@zby/intl'
import { Form, Input, Modal } from 'antd'
import * as React from 'react'

import type { ViewCreateMode } from './interface'

type ViewCreateModalProps = {
  mode: ViewCreateMode
  open: boolean
  rootClassName?: string
  onCancel: () => void
  onCreate: (name: string) => Promise<void>
  validateName: (
    name: string,
  ) => string | void | Promise<string | void>
}

export function ViewCreateModal({
  mode,
  onCancel,
  onCreate,
  open,
  rootClassName,
  validateName,
}: ViewCreateModalProps) {
  const intl = useIntl()
  const [form] = Form.useForm<{ name: string }>()

  React.useEffect(() => {
    if (open) {
      form.resetFields()
    }
  }, [form, open])

  const handleCreate = React.useCallback(
    async (values: { name: string }) => {
      const name = values.name.trim()

      try {
        await onCreate(name)
      } catch (error) {
        if (error instanceof Error && error.message) {
          form.setFields([
            {
              name: 'name',
              errors: [error.message],
            },
          ])
        }

        throw error
      }
    },
    [form, onCreate],
  )

  const handleSubmit = React.useCallback(async () => {
    const values = await form.validateFields()

    await handleCreate(values)
  }, [form, handleCreate])

  const handleFinish = React.useCallback(
    (values: { name: string }) => {
      void handleCreate(values).catch(() => undefined)
    },
    [handleCreate],
  )

  return (
    <Modal
      title={intl.getMessage(
        mode === 'saveAs'
          ? 'zby.pro.viewManagement.saveAsViewTitle'
          : 'zby.pro.viewManagement.createViewTitle',
        mode === 'saveAs' ? '另存为新视图' : '新建视图',
      )}
      open={open}
      rootClassName={rootClassName}
      okText={intl.getMessage('zby.pro.viewManagement.create', '创建')}
      cancelText={intl.getMessage('zby.pro.viewManagement.cancel', '取消')}
      onCancel={onCancel}
      onOk={handleSubmit}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={handleFinish}
      >
        <Form.Item
          name="name"
          rules={[
            {
              validator: async (_, value: string | undefined) => {
                const name = value?.trim() ?? ''

                if (!name) {
                  throw new Error(
                    intl.getMessage(
                      'zby.pro.viewManagement.viewRequired',
                      '请输入视图名称',
                    ),
                  )
                }

                const message = await validateName(name)

                if (message) {
                  throw new Error(message)
                }
              },
            },
          ]}
        >
          <Input
            placeholder={intl.getMessage(
              'zby.pro.viewManagement.createViewPlaceholder',
              '请输入视图名称',
            )}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
