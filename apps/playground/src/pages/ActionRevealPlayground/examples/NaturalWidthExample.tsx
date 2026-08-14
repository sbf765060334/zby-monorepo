import { SettingOutlined } from '@ant-design/icons'
import { ActionReveal } from '@zby/ui'
import { App } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function NaturalWidthExample() {
  const { message } = App.useApp()
  return (
    <PlaygroundCase
      title="无 width 自然展开"
      description="不测量节点、不执行宽度动画，直接使用内容自然宽度。"
    >
      <ActionReveal
        triggerIcon={<SettingOutlined />}
        actionIconProps={{ 'aria-label': '打开自然宽度内容' }}
        content={({ close, contentProps }) => {
          const { ref, ...restProps } = contentProps
          return (
            <button
              {...restProps}
              ref={ref as React.Ref<HTMLButtonElement>}
              type="button"
              onClick={() => {
                void message.success('自然宽度内容主动收起')
                close()
              }}
            >
              自然宽度内容，点击收起
            </button>
          )
        }}
      />
    </PlaygroundCase>
  )
}
