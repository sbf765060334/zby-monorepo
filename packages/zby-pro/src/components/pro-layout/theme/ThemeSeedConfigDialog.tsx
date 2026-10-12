import { CopyOutlined, ExportOutlined, ImportOutlined } from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { Button, message } from 'antd'
import { clsx } from 'clsx'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createJSONEditor, Mode } from 'vanilla-jsoneditor'

import type { Content } from 'vanilla-jsoneditor'
import ProModal from '../../pro-modal'
import { THEME_SEED_PRESETS } from './themeSeedPresets'

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
  const openRef = useRef(props.open)
  const sourceTextRef = useRef(props.text)
  const mountToken = useRef(0)
  const mountChain = useRef(Promise.resolve())
  const [invalid, setInvalid] = useState(false)
  const [messageApi, messageContextHolder] = message.useMessage()
  const title = intl.getMessage('zby.pro.layout.seed.config', '主题配置')
  sourceTextRef.current = props.text
  if (seenText.current !== props.text) {
    seenText.current = props.text
    textRef.current = props.text
  }
  // 弹窗本身不随关闭卸载。未点确定的编辑器文本在关闭时丢掉，下次打开回到已确认配置。
  if (openRef.current !== props.open) {
    textRef.current = props.text
    seenText.current = props.text
    openRef.current = props.open
  }

  useEffect(() => {
    if (!props.open)
      return
    const text = sourceTextRef.current
    textRef.current = text
    editorRef.current?.set({ text })
  }, [props.open])

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
          onChange: (content: Content) => {
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
    <>
      {messageContextHolder}
      <ProModal
        open={props.open}
        title={title}
        width={800}
        zIndex={2000}
        bodyHeightMode="max-height"
        destroyOnHidden
        getContainer={() => document.body}
        rootClassName={clsx(root, props.hashId)}
        onCancel={props.onCancel}
        footer={(
          <div className={`${root}-config-footer`}>
            <div className={`${root}-config-footer-actions`}>
              <Button
                icon={<ImportOutlined />}
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
            <div className={`${root}-config-footer-actions`}>
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
            </div>
          </div>
        )}
      >
        <div className={`${root}-config-note`}>
          <p>
            {intl.getMessage(
              'zby.pro.layout.seed.configNote',
              '左侧面板用于调节常用种子。主题配置是一份完整的 Seed Token 预设，可以一次写入更多种子，而不必逐项在面板中调整。请使用扁平 JSON，不要包裹 token，也不要写入暗色或紧凑算法；明暗与密度仍由主题开关控制。',
            )}
          </p>
          <p>
            {intl.getMessage(
              'zby.pro.layout.seed.configPromptLead',
              '如需借助主流 AI 生成方案，请使用「一键复制提示词」。复制后请自行修改提示词末尾的风格描述，再交给模型，即可生成符合目标风格的 Seed Token。',
            )}
          </p>
          <div className={`${root}-config-presets`}>
            <Button
              icon={<CopyOutlined />}
              onClick={() => {
                copyPrompt(intl.getMessage(
                  'zby.pro.layout.seed.configPrompt',
                  '你是 Ant Design 主题生成器。请根据文末的风格描述，改写下面这份主题 Token。',
                ))
                void messageApi.success(intl.getMessage('zby.pro.layout.seed.configCopied', '提示词已复制'))
              }}
            >
              {intl.getMessage('zby.pro.layout.seed.configCopyPrompt', '一键复制提示词')}
            </Button>
            {THEME_SEED_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                onClick={() => {
                  textRef.current = preset.text
                  editorRef.current?.set({ text: preset.text })
                  setInvalid(false)
                  void messageApi.success(intl.getMessage('zby.pro.layout.seed.presetFilled', '已填入编辑器'))
                }}
              >
                <span
                  className={`${root}-config-preset-mark`}
                  style={{ background: preset.mark }}
                />
                {intl.getMessage(preset.labelKey, preset.label)}
              </Button>
            ))}
          </div>
        </div>
        <div ref={bindHost} className={`${root}-config-editor`} />
        {invalid
          ? (
              <div className={`${root}-config-error`}>
                {intl.getMessage('zby.pro.layout.seed.configInvalid', '配置需要是 JSON 对象')}
              </div>
            )
          : null}
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
      </ProModal>
    </>
  )
}

interface ConfigEditorHost extends HTMLDivElement {
  jsonEditor?: ReturnType<typeof createJSONEditor>
}

function copyPrompt(text: string) {
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text).catch(() => copyPromptFallback(text))
    return
  }
  copyPromptFallback(text)
}

function copyPromptFallback(text: string) {
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.left = '-9999px'
  document.body.appendChild(area)
  area.select()
  document.execCommand('copy')
  area.remove()
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
