import { MoonOutlined, SunOutlined, SyncOutlined } from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { Button, Dropdown, Tooltip } from 'antd'

import { useProLayoutTheme } from './ThemeProvider'
import type { MenuProps } from 'antd'
import type { ProLayoutThemeMode } from '../types'

/** Header 中的三态主题切换入口。 */
export default function ThemeSwitch(props: { prefixCls: string }) {
  const intl = useIntl()
  const { appearance, enabled, mode, recordSwitchPoint, setMode } = useProLayoutTheme()
  if (!enabled)
    return null

  const items: NonNullable<MenuProps['items']> = [
    {
      key: 'auto',
      icon: <SyncOutlined />,
      label: intl.getMessage('zby.pro.layout.theme.auto', '跟随系统'),
    },
    {
      key: 'light',
      icon: <SunOutlined />,
      label: intl.getMessage('zby.pro.layout.theme.light', '亮色主题'),
    },
    {
      key: 'dark',
      icon: <MoonOutlined />,
      label: intl.getMessage('zby.pro.layout.theme.dark', '暗黑主题'),
    },
  ]
  const icon = mode === 'auto'
    ? <SyncOutlined />
    : appearance === 'dark' ? <MoonOutlined /> : <SunOutlined />

  return (
    <Tooltip
      title={mode === 'auto'
        ? intl.getMessage('zby.pro.layout.theme.auto', '跟随系统')
        : appearance === 'dark'
          ? intl.getMessage('zby.pro.layout.theme.dark', '暗黑主题')
          : intl.getMessage('zby.pro.layout.theme.light', '亮色主题')}
    >
      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        menu={{
          items,
          selectedKeys: [mode],
          onClick: ({ key }) => setMode(key as ProLayoutThemeMode),
        }}
      >
        <Button
          type="text"
          size="small"
          className={`${props.prefixCls}-theme-trigger`}
          icon={icon}
          onPointerDown={recordSwitchPoint}
        />
      </Dropdown>
    </Tooltip>
  )
}
