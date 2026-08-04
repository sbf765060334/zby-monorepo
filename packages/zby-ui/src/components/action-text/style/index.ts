import type { CSSObject } from '@ant-design/cssinjs'
import { unit, useStyleRegister } from '@ant-design/cssinjs'
import { ConfigProvider, theme as antdTheme } from 'antd'
import * as React from 'react'

type GlobalToken = ReturnType<typeof antdTheme.useToken>['token']

/** 在 antd 全局 token 基础上补充当前组件和 antd 根选择器。 */
type ActionTextToken = GlobalToken & {
  /** 当前 ActionText 根选择器，例如 .ant-action-text。 */
  componentCls: string
  /** ConfigProvider 生成的 antd 根前缀，例如 .ant。 */
  antCls: string
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

/** 生成文本、操作区和编辑 Popover 的完整组件样式。 */
function genActionTextStyle(token: ActionTextToken): CSSObject {
  const { componentCls } = token
  const editPopoverCls = `${componentCls}-edit-popover`
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
        // minWidth: 0 是 flex 子项触发文本省略的必要条件。
        flex: '0 1 auto',
        minWidth: 0,
        maxWidth: '100%',
        margin: 0,
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

    [editPopoverCls]: {
      // Popover 挂载在 portal 中，因此使用独立 root className 作为样式作用域。
      [`${componentCls}-edit-content`]: {
        width: 260,
      },

      [`${componentCls}-edit-form`]: {
        [`${componentCls}-edit-footer`]: {
          // 确认和取消按钮固定右对齐，与表单主体保持小号间距。
          display: 'flex',
          justifyContent: 'flex-end',
          marginBlockStart: token.marginSM,
        },

        [`${componentCls}-edit-footer ${token.antCls}-form-item`]: {
          // 自定义 footer 中若复用 Form.Item，不继承默认底部留白。
          marginBlockEnd: 0,
        },
      },
    },
  }
}

/**
 * 注册 ActionText CSS-in-JS 样式并返回作用域标识。
 * hashId 隔离样式版本，cssVarCls 让组件正确读取 ConfigProvider 的 CSS 变量主题。
 */
export default function useStyle(prefixCls: string) {
  const { theme, token, hashId, cssVar } = antdTheme.useToken()
  const { getPrefixCls, theme: themeConfig } = React.useContext(
    ConfigProvider.ConfigContext,
  )
  const styleToken = cssVar ?? token
  // 开启 antd cssVar 时使用调用方 key；未开启时保留稳定的默认根类。
  const cssVarKey =
    typeof themeConfig?.cssVar === 'object' ? themeConfig.cssVar.key : undefined
  const cssVarCls = cssVarKey ?? 'css-var-root'
  const mergedToken: ActionTextToken = {
    ...styleToken,
    componentCls: `.${prefixCls}`,
    antCls: `.${getPrefixCls()}`,
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
