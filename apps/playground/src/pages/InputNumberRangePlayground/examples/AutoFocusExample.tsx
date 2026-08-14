import { InputNumberRange } from '@zby/ui'
import { Switch, Typography } from 'antd'
import * as React from 'react'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

const { Text } = Typography
export default function AutoFocusExample() {
  const [mounted, setMounted] = React.useState(false)
  return (
    <PlaygroundCase title="autoFocus">
      <Switch
        checked={mounted}
        onChange={setMounted}
        checkedChildren="已挂载"
        unCheckedChildren="点击挂载"
      />
      {mounted ? (
        <InputNumberRange
          autoFocus
          defaultValue={[1, 2]}
          style={{ width: '100%' }}
        />
      ) : (
        <Text type="secondary">开启后挂载并自动聚焦 start。</Text>
      )}
    </PlaygroundCase>
  )
}
