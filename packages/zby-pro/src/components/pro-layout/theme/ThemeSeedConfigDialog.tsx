import { ExportOutlined, ImportOutlined } from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { Button, Modal } from 'antd'
import { clsx } from 'clsx'
import { useCallback, useRef, useState } from 'react'
import { createJSONEditor, Mode } from 'vanilla-jsoneditor'

import type { Content } from 'vanilla-jsoneditor'

/** 主题配置编辑器。确定前只改文本，不碰个性化草稿。 */
export default function ThemeSeedConfigDialog(props: {
  open: boolean
  prefixCls: string
  hashId: string
  text: string
  onCancel: () => void
  onConfirm: (text: string) => boolean
}) {
  const intl = useIntl()
  const root = `${props.prefixCls}-theme-seed`
  const fileRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<ReturnType<typeof createJSONEditor> | null>(null)
  const hostNode = useRef<ConfigEditorHost | null>(null)
  const textRef = useRef(props.text)
  const seenText = useRef(props.text)
  const mountToken = useRef(0)
  const mountChain = useRef(Promise.resolve())
  const [invalid, setInvalid] = useState(false)
  const title = intl.getMessage('zby.pro.layout.seed.config', '主题配置')
  if (seenText.current !== props.text) {
    seenText.current = props.text
    textRef.current = props.text
  }

  // Modal 的 destroyOnHidden 要等弹窗自己的 effect 才挂上内容。
  // 父组件 effect 那时已经结束，所以改在节点真正挂上时创建编辑器。
  const bindHost = useCallback((node: HTMLDivElement | null) => {
    const token = ++mountToken.current
    const retiring = editorRef.current
    editorRef.current = null
    if (hostNode.current)
      delete hostNode.current.jsonEditor
    hostNode.current = node as ConfigEditorHost | null
    mountChain.current = mountChain.current.then(async () => {
      if (retiring)
        await retiring.destroy()
      if (token !== mountToken.current || !node?.isConnected)
        return
      setInvalid(false)
      const editor = createJSONEditor({
        target: node,
        props: {
          content: { text: textRef.current },
          mode: Mode.text,
          mainMenuBar: false,
          navigationBar: false,
          statusBar: true,
          ariaLabel: title,
          onChange: (content) => {
            textRef.current = readEditorText(content)
            setInvalid(false)
          },
        },
      })
      if (token !== mountToken.current) {
        await editor.destroy()
        return
      }
      editorRef.current = editor
      const host = node as ConfigEditorHost
      host.jsonEditor = editor
    }).catch((error: unknown) => {
      console.error(error)
    })
  }, [title])

  return (
    <Modal
      open={props.open}
      title={title}
      width={800}
      zIndex={2000}
      destroyOnHidden
      getContainer={() => document.body}
      rootClassName={clsx(root, props.hashId)}
      onCancel={props.onCancel}
      footer={(
        <>
          <Button onClick={props.onCancel}>
            {intl.getMessage('zby.pro.layout.seed.configCancel', '取消')}
          </Button>
          <Button
            type="primary"
            onClick={() => {
              const content = editorRef.current?.get()
              const text = content ? readEditorText(content) : textRef.current
              if (!props.onConfirm(text))
                setInvalid(true)
            }}
          >
            {intl.getMessage('zby.pro.layout.seed.confirm', '确定')}
          </Button>
        </>
      )}
    >
      <p className={`${root}-config-note`}>
        {intl.getMessage(
          'zby.pro.layout.seed.configNote',
          '注意：算法配置中的字符串 dark 和 compact 分别表示暗色与紧凑算法，这仅适用于在主题编辑器配置中使用。如果需要复制到代码中使用，请手动替换为从 antd 中引入的 theme.darkAlgorithm 和 theme.compactAlgorithm。',
        )}
      </p>
      <div ref={bindHost} className={`${root}-config-editor`} />
      {invalid
        ? (
            <div className={`${root}-config-error`}>
              {intl.getMessage('zby.pro.layout.seed.configInvalid', '配置需要是 JSON 对象')}
            </div>
          )
        : null}
      <div className={`${root}-config-actions`}>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          aria-label={intl.getMessage('zby.pro.layout.seed.configImport', '导入')}
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file)
              return
            void file.text().then((next) => {
              textRef.current = next
              editorRef.current?.set({ text: next })
              setInvalid(false)
            })
          }}
        />
        <Button
          icon={<ImportOutlined />}
          style={{ marginInlineEnd: 8 }}
          onClick={() => fileRef.current?.click()}
        >
          {intl.getMessage('zby.pro.layout.seed.configImport', '导入')}
        </Button>
        <Button
          icon={<ExportOutlined />}
          onClick={() => exportConfig(editorRef.current?.get() ? readEditorText(editorRef.current.get()) : textRef.current)}
        >
          {intl.getMessage('zby.pro.layout.seed.configExport', '导出')}
        </Button>
      </div>
    </Modal>
  )
}

interface ConfigEditorHost extends HTMLDivElement {
  jsonEditor?: ReturnType<typeof createJSONEditor>
}

function readEditorText(content: Content) {
  if ('text' in content && typeof content.text === 'string')
    return content.text
  if ('json' in content)
    return JSON.stringify(content.json, null, 2)
  return ''
}

function exportConfig(text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'theme.json'
  link.click()
  URL.revokeObjectURL(url)
}
