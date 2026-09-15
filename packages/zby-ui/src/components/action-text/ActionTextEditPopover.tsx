import { EditOutlined } from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import type { FormInstance, InputRef, PopoverProps } from 'antd'
import { Button, Form, Input, Popover, Space } from 'antd'
import { clsx } from 'clsx'
import * as React from 'react'

import useControllableValue from '../_util/hooks/useControllableValue'
import ActionIcon from '../action-icon'
import type { ActionIconProps } from '../action-icon'
import type { ActionTextEditableConfig } from './ActionText'

/** 复用 ActionText 公开配置推导字段路径，确保编辑器内外类型完全一致。 */
type NamePath = NonNullable<ActionTextEditableConfig['name']>
/** 从 antd 公共组件推导 TextArea ref，不引用 antd/es 私有声明。 */
type TextAreaRef = React.ComponentRef<typeof Input.TextArea>

/** 编辑按钮和 Popover 内部实现所需属性，不对外单独暴露行为入口。 */
export interface ActionTextEditPopoverProps extends Pick<
  ActionIconProps,
  'className' | 'style' | 'size'
> {
  /** 与 ActionText 根节点一致的样式前缀。 */
  prefixCls: string
  /** CSS-in-JS 生成的作用域 hash，需同步附加到 portal 中的 Popover。 */
  hashId: string
  /** antd CSS 变量主题作用域类。 */
  cssVarCls?: string
  /** true 使用默认编辑配置，对象形式启用完整定制能力。 */
  editable: true | ActionTextEditableConfig
  /** 原始展示内容，保留给未来自定义编辑节点使用。 */
  children?: React.ReactNode
  /** 从简单 children 推导的默认输入文本。 */
  defaultText: string
}

/** 未指定 name 时，主编辑字段统一注册为 value。 */
const DEFAULT_FIELD_NAME = 'value'

/** 包裹表单内容，用于在 Popover 打开后同步最新文本并聚焦输入框。 */
interface ActionTextEditFormBodyProps {
  form: FormInstance
  name: NamePath
  fieldValue: string
  open: boolean
  inputRef: React.MutableRefObject<InputRef | TextAreaRef | null>
  children: React.ReactNode
}

/**
 * 按 antd NamePath 将值不可变地写入对象或数组。
 * 例如 name=['product', 'name'] 会生成 { product: { name: value } }。
 */
function setNestedValue(source: unknown, name: NamePath, value: unknown): any {
  const path = Array.isArray(name) ? name : [name]

  const setAtPath = (entity: any, paths: (string | number)[]): any => {
    if (!paths.length) return value

    const [key, ...restPath] = paths
    // 数字路径创建数组，其余路径创建对象；已有容器始终浅拷贝，避免修改调用方数据。
    const clone =
      !entity && typeof key === 'number'
        ? []
        : Array.isArray(entity)
          ? [...entity]
          : { ...entity }
    clone[key] = setAtPath(clone[key], restPath)
    return clone
  }

  return setAtPath(source, path)
}

const ActionTextEditFormBody: React.FC<ActionTextEditFormBodyProps> = (props) => {
  const { form, name, fieldValue, open, inputRef, children } = props

  React.useLayoutEffect(() => {
    if (!open) return

    // initialValues 只在 Form 首次挂载时生效；每次重新打开都主动同步最新 fieldValue。
    form.setFieldsValue(setNestedValue({}, name, fieldValue))
    // 在浏览器绘制 Popover 前聚焦，避免用户看到焦点跳动。
    inputRef.current?.focus?.()
  }, [fieldValue, form, inputRef, name, open])

  return <>{children}</>
}

const ActionTextEditPopover: React.FC<ActionTextEditPopoverProps> = (props) => {
  const {
    prefixCls,
    hashId,
    cssVarCls,
    editable,
    className,
    style,
    size = 'small',
    defaultText,
  } = props
  const intl = useIntl()
  // ActionText 是 zby 自建组件，默认文案统一从 @zby/intl 获取。
  const defaultEditTitle = intl.getMessage('zby.ui.actionText.edit', '编辑')
  const defaultConfirmText = intl.getMessage('zby.ui.actionText.confirm', '确定')
  const defaultCancelText = intl.getMessage('zby.ui.actionText.cancel', '取消')
  const editConfig = editable === true ? {} : editable
  const {
    text,
    title = defaultEditTitle,
    inputType = 'input',
    inputProps,
    formProps,
    formItemProps,
    name = DEFAULT_FIELD_NAME,
    confirmText = defaultConfirmText,
    cancelText = defaultCancelText,
    confirmButtonProps,
    cancelButtonProps,
    popoverProps,
    renderForm,
    onConfirm,
    onCancel,
  } = editConfig

  // Form 实例在 Popover 多次开关之间保持稳定；preserve=false 负责卸载字段状态。
  const [form] = Form.useForm()
  const inputRef = React.useRef<InputRef | TextAreaRef | null>(null)
  // open、defaultOpen 和 onOpenChange 使用同一份配置对象完成受控状态合并。
  const [mergedOpen, setMergedOpen] = useControllableValue<boolean>(editConfig, {
    defaultValue: false,
    defaultValuePropName: 'defaultOpen',
    valuePropName: 'open',
    trigger: 'onOpenChange',
  })
  const [confirmLoading, setConfirmLoading] = React.useState(false)
  // 显式 editable.text 优先；否则使用 ActionText 从简单 children 推导的文本。
  const fieldValue = text ?? defaultText

  // Form.initialValues 是唯一初始值来源：保留自定义字段，并覆盖主编辑字段为 fieldValue。
  const mergedInitialValues = React.useMemo(
    () =>
      setNestedValue(
        { ...(formProps?.initialValues as Record<string | number, unknown>) },
        name,
        fieldValue,
      ),
    [fieldValue, formProps?.initialValues, name],
  )

  const triggerOpenChange = (nextOpen: boolean) => {
    // setter 负责非受控更新，并在两种模式下统一通知 onOpenChange。
    setMergedOpen(nextOpen)
  }

  React.useEffect(() => {
    // 关闭后清理上一次异步提交的 loading，保证下次打开状态干净。
    if (!mergedOpen) setConfirmLoading(false)
  }, [mergedOpen])

  const closePopover = () => {
    triggerOpenChange(false)
  }

  const handleCancel = () => {
    // 先让业务读取当前 form，再关闭 Popover。
    onCancel?.({ form })
    closePopover()
  }

  const handleConfirm = async () => {
    // 校验不通过时 validateFields 会抛出，Popover 保持打开并由 antd 展示字段错误。
    const values = await form.validateFields()
    // 保持透传 Form.onFinish 的语义，再调用 ActionText 专用确认回调。
    formProps?.onFinish?.(values)
    const currentValue = form.getFieldValue(name)
    const result = onConfirm?.(currentValue, { form, values })

    if (result && typeof result.then === 'function') {
      // 异步确认期间锁定为 loading；业务拒绝 Promise 时保留编辑现场供用户重试。
      setConfirmLoading(true)
      try {
        await result
      } catch {
        setConfirmLoading(false)
        return
      }
      setConfirmLoading(false)
    }

    closePopover()
  }

  // inputType 只决定默认输入节点；两种输入都复用同一份 ref 和 inputProps 入口。
  const inputNode =
    inputType === 'textarea' ? (
      <Input.TextArea
        ref={inputRef as React.Ref<TextAreaRef>}
        {...(inputProps as React.ComponentProps<typeof Input.TextArea>)}
      />
    ) : (
      <Input
        ref={inputRef as React.Ref<InputRef>}
        {...(inputProps as React.ComponentProps<typeof Input>)}
      />
    )

  const defaultFormNode = (
    // name 由专用属性统一控制；初始值只放在 Form.initialValues，避免 antd 重复警告。
    <Form.Item {...formItemProps} name={name}>
      {inputNode}
    </Form.Item>
  )

  const formContent = renderForm
    // 自定义表单拿到默认 inputNode 和完整操作上下文，可自由组合额外字段。
    ? renderForm({
        form,
        name,
        inputNode,
        open: mergedOpen,
        loading: confirmLoading,
        confirm: handleConfirm,
        cancel: handleCancel,
        close: closePopover,
      })
    : defaultFormNode

  const getEditPopoverRootClassName = React.useCallback(
    (root?: string) => clsx(`${prefixCls}-edit-popover`, hashId, cssVarCls, root),
    [cssVarCls, hashId, prefixCls],
  )

  const mergedPopoverClassNames = React.useMemo<PopoverProps['classNames']>(() => {
    const originClassNames = popoverProps?.classNames

    if (typeof originClassNames === 'function') {
      // antd 允许 classNames 为函数；执行调用方函数后再补入组件自身作用域样式。
      return (info) => {
        const origin = originClassNames(info)
        return {
          ...origin,
          root: getEditPopoverRootClassName(origin?.root),
        }
      }
    }

    return {
      // 对象形式采用相同合并规则，调用方 root className 不会被覆盖。
      ...originClassNames,
      root: getEditPopoverRootClassName(originClassNames?.root),
    }
  }, [getEditPopoverRootClassName, popoverProps?.classNames])

  const content = (
    <div className={`${prefixCls}-edit-content`}>
      <Form
        layout="vertical"
        preserve={false}
        {...formProps}
        // 专用 form、initialValues 和 onFinish 放在透传属性之后，保证内部状态只有一个来源。
        form={form}
        initialValues={mergedInitialValues}
        className={clsx(`${prefixCls}-edit-form`, formProps?.className)}
        onFinish={handleConfirm}
      >
        <ActionTextEditFormBody
          form={form}
          name={name}
          fieldValue={fieldValue}
          open={mergedOpen}
          inputRef={inputRef}
        >
          {formContent}
        </ActionTextEditFormBody>
        <div className={`${prefixCls}-edit-footer`}>
          <Space size="small">
            <Button size="small" {...cancelButtonProps} onClick={handleCancel}>
              {cancelText}
            </Button>
            <Button
              type="primary"
              size="small"
              {...confirmButtonProps}
              loading={confirmLoading || confirmButtonProps?.loading}
              onClick={handleConfirm}
            >
              {confirmText}
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  )

  return (
    <Popover
      placement="topLeft"
      trigger="click"
      arrow={false}
      {...popoverProps}
      // 打开状态和触发方式始终由 ActionText 接管，popoverProps 只扩展其余视觉行为。
      title={title}
      content={content}
      open={mergedOpen}
      onOpenChange={triggerOpenChange}
      classNames={mergedPopoverClassNames}
    >
      <ActionIcon
        size={size}
        className={className}
        style={style}
        icon={<EditOutlined />}
        aria-label={typeof title === 'string' ? title : defaultEditTitle}
        title={typeof title === 'string' ? title : undefined}
        data-action-text-edit
      />
    </Popover>
  )
}

export default ActionTextEditPopover
