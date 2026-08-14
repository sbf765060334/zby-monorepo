import { FilterOutlined, SearchOutlined } from '@ant-design/icons'
import { ActionIcon } from '@zby/ui'
import { Badge, Segmented, Space, Switch, theme } from 'antd'
import * as React from 'react'
import {
  PlaygroundCase,
  PlaygroundControl,
} from '../../../components/ComponentPlayground'
import {
  presetColors,
  variants,
  type ActionColor,
  type ActionShape,
  type ActionSize,
  type ActionVariant,
} from '../shared'

export default function AttributePlaygroundExample() {
  const { token } = theme.useToken()
  const [size, setSize] = React.useState<ActionSize>('middle')
  const [shape, setShape] = React.useState<ActionShape>('square')
  const [color, setColor] = React.useState<ActionColor>('default')
  const [variant, setVariant] = React.useState<ActionVariant>('filled')
  const [selected, setSelected] = React.useState(false)
  const [danger, setDanger] = React.useState(false)
  const [disabled, setDisabled] = React.useState(false)
  const [badge, setBadge] = React.useState(false)
  const icon = (
    <ActionIcon
      size={size}
      shape={shape}
      color={danger ? undefined : color}
      variant={variant}
      selected={selected}
      danger={danger}
      disabled={disabled}
      icon={badge ? <FilterOutlined /> : <SearchOutlined />}
      aria-label="ActionIcon 属性预览"
    />
  )
  return (
    <PlaygroundCase
      title="实时属性预览"
      description="所有控制状态均封装在此实例内。"
    >
      <div
        style={{
          display: 'flex',
          minHeight: 120,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: token.borderRadiusLG,
          background: token.colorFillQuaternary,
        }}
      >
        {badge ? <Badge count={3}>{icon}</Badge> : icon}
      </div>
      <Space wrap>
        <Switch
          checked={selected}
          onChange={setSelected}
          checkedChildren="选中"
          unCheckedChildren="选中"
        />
        <Switch
          checked={danger}
          onChange={setDanger}
          checkedChildren="危险"
          unCheckedChildren="危险"
        />
        <Switch
          checked={disabled}
          onChange={setDisabled}
          checkedChildren="禁用"
          unCheckedChildren="禁用"
        />
        <Switch
          checked={badge}
          onChange={setBadge}
          checkedChildren="角标"
          unCheckedChildren="角标"
        />
      </Space>
      <PlaygroundControl label="size">
        <Segmented<ActionSize>
          block
          value={size}
          onChange={setSize}
          options={['small', 'middle', 'large']}
        />
      </PlaygroundControl>
      <PlaygroundControl label="shape">
        <Segmented<ActionShape>
          block
          value={shape}
          onChange={setShape}
          options={['square', 'circle']}
        />
      </PlaygroundControl>
      <PlaygroundControl label="color">
        <Segmented<ActionColor>
          block
          value={color}
          onChange={setColor}
          options={presetColors.slice(0, 4)}
        />
      </PlaygroundControl>
      <PlaygroundControl label="variant">
        <Segmented<ActionVariant>
          block
          value={variant}
          onChange={setVariant}
          options={variants}
        />
      </PlaygroundControl>
    </PlaygroundCase>
  )
}
