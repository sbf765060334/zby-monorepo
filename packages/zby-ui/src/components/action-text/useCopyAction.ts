import * as React from 'react'

import type { ActionTextCopyConfig } from './ActionText'

/** 复制成功状态保留时长，与常见 Typography 复制反馈保持一致。 */
const COPY_FEEDBACK_DURATION = 3000

/**
 * 未显式配置 text 时，从 children 生成默认复制内容。
 * 这里保留浅层拼接语义；复杂 React 元素应通过 copyable.text 明确提供文本。
 */
const getChildrenText = (children: React.ReactNode) => {
  if (children === null || children === undefined) return ''

  return (Array.isArray(children) ? children : [children])
    .filter((child) => child !== null && child !== undefined)
    .map(String)
    .join('')
}

/**
 * 兼容旧浏览器和 Clipboard API 不可用场景的同步复制方案。
 * copy 事件中同时写入纯文本；HTML 模式额外写入 text/html MIME 数据。
 */
const execCopy = (text: string, isHtmlFormat: boolean) => {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') {
    return false
  }

  let copySucceeded = false
  const handleCopy = (event: ClipboardEvent) => {
    // 拦截本次临时 copy 事件，避免页面上其他复制监听器改写数据。
    event.stopPropagation()
    event.preventDefault()
    event.clipboardData?.clearData()
    event.clipboardData?.setData('text/plain', text)

    if (isHtmlFormat) {
      event.clipboardData?.setData('text/html', text)
    }

    copySucceeded = true
  }

  try {
    // capture=true 保证在冒泡阶段的业务监听器之前写入目标内容。
    document.addEventListener('copy', handleCopy, { capture: true })
    document.execCommand('copy')
    return copySucceeded
  } catch {
    return false
  } finally {
    // 无论复制成功或抛错，都必须移除一次性全局监听器。
    document.removeEventListener('copy', handleCopy, { capture: true })
  }
}

/**
 * 优先使用现代异步 Clipboard API。
 * HTML 模式必须通过 ClipboardItem 同时声明 MIME；能力不足时交给 execCopy fallback。
 */
const asyncCopy = async (text: string, isHtmlFormat: boolean) => {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false

  try {
    if (
      isHtmlFormat &&
      typeof ClipboardItem !== 'undefined' &&
      typeof navigator.clipboard.write === 'function'
    ) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([text], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        }),
      ])
      return true
    }

    if (isHtmlFormat) return false

    // 普通文本使用覆盖面更广的 writeText。
    if (typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    return false
  }

  return false
}

/** 先尝试现代异步 API，失败后自动退回同步 copy 事件方案。 */
const copyText = async (text: string, format?: ActionTextCopyConfig['format']) => {
  const isHtmlFormat = format === 'text/html'

  if (await asyncCopy(text, isHtmlFormat)) return true

  return execCopy(text, isHtmlFormat)
}

/**
 * 管理一次复制交互的完整状态机：
 * idle → loading → copied → 3 秒后回到 idle。
 */
export default function useCopyAction(
  copyConfig: ActionTextCopyConfig,
  children?: React.ReactNode,
) {
  const [copied, setCopied] = React.useState(false)
  const [copyLoading, setCopyLoading] = React.useState(false)
  const copyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // 新复制动作开始或组件卸载时清理旧计时器，避免过期任务更新当前状态。
  const clearCopyTimer = React.useCallback(() => {
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current)
      copyTimerRef.current = null
    }
  }, [])

  React.useEffect(() => clearCopyTimer, [clearCopyTimer])

  const onClick = React.useCallback(
    async (event?: React.MouseEvent<HTMLButtonElement>) => {
      // 复制按钮可能位于可点击文本或链接中，必须阻止父级点击和导航。
      event?.preventDefault()
      event?.stopPropagation()
      setCopyLoading(true)

      try {
        // 函数式 text 在用户实际点击时求值，并允许业务异步获取内容。
        const configuredText =
          typeof copyConfig.text === 'function'
            ? await copyConfig.text()
            : copyConfig.text
        const text = configuredText || getChildrenText(children) || ''
        const copySucceeded = await copyText(text, copyConfig.format)

        // 浏览器拒绝权限且 fallback 也失败时，不展示成功状态、不触发 onCopy。
        if (!copySucceeded) return

        setCopied(true)
        clearCopyTimer()
        // 每次成功复制都重新开始三秒反馈周期。
        copyTimerRef.current = setTimeout(() => {
          setCopied(false)
          copyTimerRef.current = null
        }, COPY_FEEDBACK_DURATION)
        copyConfig.onCopy?.(event)
      } finally {
        // 成功、失败或 text 函数抛错都必须结束 loading。
        setCopyLoading(false)
      }
    },
    [children, clearCopyTimer, copyConfig],
  )

  return { copied, copyLoading, onClick }
}
