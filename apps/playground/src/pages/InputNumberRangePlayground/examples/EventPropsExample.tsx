import { InputNumberRange } from '@zby/ui'
import * as React from 'react'
import {
  PlaygroundCase,
  PlaygroundStatus,
} from '../../../components/ComponentPlayground'

export default function EventPropsExample() {
  const [event, setEvent] = React.useState('等待交互')
  return (
    <PlaygroundCase title="startProps / endProps">
      <PlaygroundStatus>{event}</PlaygroundStatus>
      <InputNumberRange
        id={{ start: 'custom-start', end: 'custom-end' }}
        startProps={{
          name: 'minimum',
          'aria-label': '业务最小值',
          onFocus: () => setEvent('startProps.onFocus'),
          onPressEnter: () => setEvent('startProps.onPressEnter'),
        }}
        endProps={{
          name: 'maximum',
          'aria-label': '业务最大值',
          onBlur: () => setEvent('endProps.onBlur'),
        }}
        onFocus={(_, info) => setEvent(`组件 onFocus：${info.range}`)}
        onBlur={(_, info) => setEvent(`组件 onBlur：${info.range}`)}
        style={{ width: '100%' }}
      />
    </PlaygroundCase>
  )
}
