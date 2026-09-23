import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  HolderOutlined,
} from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { ActionIcon } from '@zby/ui'
import { Flex, Form, Input, Popconfirm, Space, Tag } from 'antd'
import { clsx } from 'clsx'
import type {
  CSSProperties,
  HTMLAttributes,
  Ref,
} from 'react'
import * as React from 'react'

import type { ProViewManagementView } from './interface'

type ViewManagementRowProps<TSnapshot> = {
  editing: boolean
  prefixCls: string
  view: ProViewManagementView<TSnapshot>
  dragHandleProps?: HTMLAttributes<HTMLElement>
  dragging?: boolean
  rowRef?: Ref<HTMLDivElement>
  style?: CSSProperties
  onCancelEdit: () => void
  onDelete: (viewId: string) => void
  onRename: (viewId: string, name: string) => Promise<void>
  onStartEdit: (viewId: string) => void
  validateName: (
    viewId: string,
    name: string,
  ) => string | void | Promise<string | void>
}

export function ViewManagementRow<TSnapshot>({
  dragHandleProps,
  dragging = false,
  editing,
  onCancelEdit,
  onDelete,
  onRename,
  onStartEdit,
  prefixCls,
  rowRef,
  style,
  validateName,
  view,
}: ViewManagementRowProps<TSnapshot>) {
  const intl = useIntl()
  const [form] = Form.useForm<{ name: string }>()
  const [editingName, setEditingName] = React.useState(view.name)
  const isSystem = view.scope === 'system'

  React.useEffect(() => {
    if (editing) {
      // Reset the editor whenever the row enters edit mode or its source name changes.
      setEditingName(view.name)
      form.resetFields()
      form.setFieldsValue({ name: view.name })
    }
  }, [editing, form, view.name])

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const name = values.name.trim()

    try {
      await onRename(view.id, name)
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
  }

  return (
    <div
      ref={rowRef}
      className={clsx(
        `${prefixCls}-manager-row`,
        dragging && `${prefixCls}-manager-row-dragging`,
      )}
      style={style}
    >
      <Flex
        className={`${prefixCls}-manager-row-main`}
        align="center"
        gap="small"
      >
        {!isSystem ? (
          <span className={`${prefixCls}-manager-row-drag`} {...dragHandleProps}>
            <HolderOutlined />
          </span>
        ) : null}
        {editing ? (
          <Form form={form} component={false}>
            <Form.Item
              className={`${prefixCls}-manager-row-form-item`}
              initialValue={view.name}
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

                    const message = await validateName(view.id, name)

                    if (message) {
                      throw new Error(message)
                    }
                  },
                },
              ]}
            >
              <Input
                onChange={(event) => setEditingName(event.target.value)}
                onPressEnter={() => {
                  void handleSubmit().catch(() => undefined)
                }}
              />
            </Form.Item>
          </Form>
        ) : (
          <span className={`${prefixCls}-manager-row-name`}>{view.name}</span>
        )}
      </Flex>
      <Space className={`${prefixCls}-manager-row-actions`} size="small">
        {isSystem ? (
          <Tag>
            {intl.getMessage(
              'zby.pro.viewManagement.systemView',
              '系统',
            )}
          </Tag>
        ) : null}
        {!isSystem && editing ? (
          <>
            <ActionIcon
              icon={<CloseOutlined />}
              aria-label={intl.getMessage(
                'zby.pro.viewManagement.cancel',
                '取消',
              )}
              title={intl.getMessage(
                'zby.pro.viewManagement.cancel',
                '取消',
              )}
              onClick={onCancelEdit}
            />
            <ActionIcon
              icon={<CheckOutlined />}
              aria-label={intl.getMessage(
                'zby.pro.viewManagement.save',
                '保存',
              )}
              title={intl.getMessage(
                'zby.pro.viewManagement.save',
                '保存',
              )}
              disabled={editingName.trim().length === 0}
              onClick={() => {
                void handleSubmit().catch(() => undefined)
              }}
            />
          </>
        ) : null}
        {!isSystem && !editing ? (
          <>
            <ActionIcon
              icon={<EditOutlined />}
              aria-label={intl.getMessage(
                'zby.pro.viewManagement.editView',
                '编辑视图',
              )}
              title={intl.getMessage(
                'zby.pro.viewManagement.editView',
                '编辑视图',
              )}
              onClick={() => onStartEdit(view.id)}
            />
            <Popconfirm
              title={intl.getMessage(
                'zby.pro.viewManagement.deleteView',
                '删除视图',
              )}
              description={intl.getMessage(
                'zby.pro.viewManagement.deleteViewConfirm',
                '确定删除“{{name}}”吗？',
                { name: view.name },
              )}
              okText={intl.getMessage(
                'zby.pro.viewManagement.deleteView',
                '删除视图',
              )}
              cancelText={intl.getMessage(
                'zby.pro.viewManagement.cancel',
                '取消',
              )}
              onConfirm={() => onDelete(view.id)}
            >
              <ActionIcon
                icon={<DeleteOutlined />}
                danger
                aria-label={intl.getMessage(
                  'zby.pro.viewManagement.deleteView',
                  '删除视图',
                )}
                title={intl.getMessage(
                  'zby.pro.viewManagement.deleteView',
                  '删除视图',
                )}
              />
            </Popconfirm>
          </>
        ) : null}
      </Space>
    </div>
  )
}
