import { GlobalOutlined } from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { ActionIcon } from '@zby/ui'
import { ConfigProvider, Dropdown, theme as antdTheme } from 'antd'
import { clsx } from 'clsx'
import { useContext } from 'react'

import type { MenuProps } from 'antd'
import useLocaleSwitchStyles from './style'

export type ProLocale = 'zh-CN' | 'en-US'

/** 语言选择按钮由业务侧控制，确保 ZbyConfigProvider 使用同一语言状态。 */
export interface ProLocaleSwitchProps {
  /** 当前生效的语言。 */
  value: ProLocale
  /** 用户选择另一语言时触发。 */
  onChange: (locale: ProLocale) => void
  /** 生成样式类名的前缀；未传时使用 ConfigProvider.getPrefixCls('pro-layout')。 */
  prefixCls?: string
  /** 附加到触发按钮上的业务类名。 */
  className?: string
}

const localeOptions: ReadonlyArray<{ key: ProLocale, label: string }> = [
  { key: 'zh-CN', label: '简体中文' },
  { key: 'en-US', label: 'English' },
]

/** 只负责语言选择 UI；Provider 切换和持久化由业务侧的 onChange 处理。 */
export default function ProLocaleSwitch(props: ProLocaleSwitchProps) {
  const {
    className,
    onChange,
    prefixCls: customizePrefixCls,
    value,
  } = props
  const { getPrefixCls } = useContext(ConfigProvider.ConfigContext)
  const prefixCls = getPrefixCls('pro-layout', customizePrefixCls)
  const intl = useIntl()
  const { token } = antdTheme.useToken()
  const hashId = useLocaleSwitchStyles(prefixCls)

  // 语言名称使用各自语言的本地写法，避免菜单文案随当前语言改变后难以识别。
  const items: NonNullable<MenuProps['items']> = localeOptions.map((option) => ({
    key: option.key,
    label: (
      <span
        className={value === option.key
          ? `${prefixCls}-locale-option-selected`
          : undefined}
        style={{
          display: 'flex',
          minWidth: 104,
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: token.marginLG,
        }}
      >
        <span>{option.label}</span>
        {value === option.key ? (
          <span
            aria-hidden
            className={`${prefixCls}-locale-selected-dot`}
            style={{
              width: 6,
              height: 6,
              flex: '0 0 auto',
              borderRadius: '50%',
              background: token.colorPrimary,
            }}
          />
        ) : null}
      </span>
    ),
  }))
  const title = intl.getMessage('zby.pro.layout.locale.trigger', '语言设置')

  return (
    <Dropdown
      trigger={['hover']}
      placement="bottomRight"
      destroyOnHidden
      menu={{
        items,
        onClick: ({ key }) => {
          const nextLocale = key as ProLocale
          if (nextLocale !== value)
            onChange(nextLocale)
        },
      }}
    >
      <ActionIcon
        size="small"
        className={clsx(`${prefixCls}-locale-trigger`, hashId, className)}
        icon={<GlobalOutlined />}
        aria-label={title}
        title={title}
      />
    </Dropdown>
  )
}
