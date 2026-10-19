import type { CSSObject } from '@ant-design/cssinjs'
import { unit, useStyleRegister } from '@ant-design/cssinjs'
import { ConfigProvider, theme as antdTheme } from 'antd'
import * as React from 'react'

type GlobalToken = ReturnType<typeof antdTheme.useToken>['token']

/** 在 antd 全局 token 基础上补充当前组件根选择器。 */
type ActionTextToken = GlobalToken & {
  /** 当前 ActionText 根选择器，例如 .ant-action-text。 */
  componentCls: string
}

/** 复用 antd 组件的基础 reset，使字体、字号和盒模型跟随主题。 */
function resetComponent(token: ActionTextToken): CSSObject {
  return {
    boxSizing: 'border-box',
    margin: 0,
    padding: 0,
    color: token.colorText,
    fontSize: token.fontSize,
    lineHeight: token.lineHeight,
    listStyle: 'none',
    fontFamily: token.fontFamily,
  }
}

/** 生成文本和操作区的完整组件样式。 */
function genActionTextStyle(token: ActionTextToken): CSSObject {
  const { componentCls } = token
  const actionVisibleStyle: CSSObject = {
    display: 'inline-flex',
    pointerEvents: 'auto',
  }

  return {
    [componentCls]: {
      ...resetComponent(token),
      // 根节点使用 inline-flex，既能嵌入表格文本流，又能约束右侧操作区。
      display: 'inline-flex',
      alignItems: 'center',
      maxWidth: '100%',
      minWidth: 0,
      color: 'inherit',
      verticalAlign: 'top',
      gap: token.marginXXS,

      [`${componentCls}-text`]: {
        // inline-block 让文本在根节点被改成 block 时仍有自己的宽度，text-overflow 才能生效。
        // minWidth: 0 是 flex 子项触发文本省略的必要条件。
        display: 'inline-block',
        flex: '0 1 auto',
        minWidth: 0,
        maxWidth: '100%',
        margin: 0,
      },

      [`${componentCls}-text-ellipsis`]: {
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
      },

      [`${componentCls}-text-link, ${componentCls}-text-button`]: {
        // a 和 button 统一成文本链接外观，保留各自原生语义。
        display: 'inline',
        maxWidth: '100%',
        padding: 0,
        border: 0,
        color: token.colorLink,
        font: 'inherit',
        textAlign: 'inherit',
        background: 'transparent',
        cursor: 'pointer',
        transition: `color ${token.motionDurationMid}`,

        '&:hover': {
          color: token.colorLinkHover,
          textDecoration: 'underline',
        },

        '&:focus-visible': {
          // 仅键盘聚焦时展示主题化焦点环，鼠标点击不产生额外轮廓。
          outline: `${unit(token.lineWidthFocus)} solid ${token.colorPrimaryBorder}`,
          outlineOffset: token.controlOutlineWidth,
        },
      },

      [`${componentCls}-text-link-visited, ${componentCls}-text-button-visited`]: {
        // 已访问状态弱化颜色，但 hover 时仍恢复链接反馈。
        color: token.colorTextTertiary,

        '&:hover': {
          color: token.colorLinkHover,
        },
      },

      [`${componentCls}-actions`]: {
        // 操作区禁止收缩，避免文本过长时挤压图标尺寸。
        display: 'inline-flex',
        flex: '0 0 auto',
        alignItems: 'center',
        gap: token.marginXXS,
      },

      [`${componentCls}-actions-self-hover`]: {
        // 默认完全移出布局交互；根节点 hover 时再恢复 inline-flex 和点击能力。
        display: 'none',
        pointerEvents: 'none',
      },

      [`&:hover ${componentCls}-actions-self-hover`]: actionVisibleStyle,
      [`${componentCls}-actions-always`]: actionVisibleStyle,
    },
  }
}

/**
 * 注册 ActionText CSS-in-JS 样式并返回作用域标识。
 * hashId 隔离样式版本，cssVarCls 让组件正确读取 ConfigProvider 的 CSS 变量主题。
 */
export default function useStyle(prefixCls: string) {
  const { theme, token, hashId, cssVar } = antdTheme.useToken()
  const { theme: themeConfig } = React.useContext(ConfigProvider.ConfigContext)
  const styleToken = cssVar ?? token
  // 开启 antd cssVar 时使用调用方 key；未开启时保留稳定的默认根类。
  const cssVarKey =
    typeof themeConfig?.cssVar === 'object' ? themeConfig.cssVar.key : undefined
  const cssVarCls = cssVarKey ?? 'css-var-root'
  const mergedToken: ActionTextToken = {
    ...styleToken,
    componentCls: `.${prefixCls}`,
  }

  useStyleRegister(
    {
      theme,
      token,
      hashId,
      path: ['zby-ui', 'action-text', prefixCls],
    },
    // path 保证同一主题和 prefixCls 下样式只注册一次。
    () => [genActionTextStyle(mergedToken)],
  )

  return [hashId, cssVarCls] as const
}
