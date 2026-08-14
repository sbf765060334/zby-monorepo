import { ActionText } from '@zby/ui'
import { App } from 'antd'
import { PlaygroundCase } from '../../../components/ComponentPlayground'

export default function HtmlCopyExample() {
  const { message } = App.useApp()
  return (
    <PlaygroundCase title="HTML 格式">
      <ActionText
        actionsVisibleOn="always"
        copyable={{
          text: '<strong>杭州西湖旗舰店</strong>',
          format: 'text/html',
          tooltips: ['复制 HTML', 'HTML 已复制'],
          onCopy: () => void message.success('HTML 内容复制成功'),
        }}
      >
        复制带 strong 标签的 HTML
      </ActionText>
    </PlaygroundCase>
  )
}
