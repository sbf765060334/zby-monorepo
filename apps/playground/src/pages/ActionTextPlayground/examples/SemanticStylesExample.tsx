import { LinkOutlined } from '@ant-design/icons'
import { ActionText } from '@zby/ui'
import { Space, Switch, theme } from 'antd'
import * as React from 'react'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function SemanticStylesExample() {
  const { token } = theme.useToken()
  const [styled, setStyled] = React.useState(true)
  return (
    <PlaygroundCase title="classNames / styles">
      <Space orientation="vertical">
        <Switch
          checked={styled}
          onChange={setStyled}
          checkedChildren="语义样式"
          unCheckedChildren="默认样式"
        />
        <ActionText
          copyable
          actionsVisibleOn="always"
          classNames={{
            root: 'action-text-preview-semantic-root',
            text: 'action-text-preview-semantic-text',
            actions: 'action-text-preview-semantic-actions',
            action: 'action-text-preview-semantic-action',
          }}
          styles={
            styled
              ? {
                  root: {
                    width: '100%',
                    padding: 10,
                    borderRadius: token.borderRadius,
                    background: token.colorPrimaryBg,
                  },
                  text: { color: token.colorPrimaryText },
                }
              : {}
          }
          actions={[{ key: 'link', icon: <LinkOutlined />, label: '打开链接' }]}
        >
          可切换的语义节点样式
        </ActionText>
      </Space>
    </PlaygroundCase>
  )
}
