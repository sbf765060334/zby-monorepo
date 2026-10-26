import type { CSSObject } from '@ant-design/cssinjs'
import { unit, useStyleRegister } from '@ant-design/cssinjs'
import { ConfigProvider, theme as antdTheme } from 'antd'
import * as React from 'react'

type GlobalToken = ReturnType<typeof antdTheme.useToken>['token']

type ProModalToken = GlobalToken & {
  antCls: string
  compactViewportBudget: string
  componentCls: string
  viewportBudget: string
}

const genProModalStyle = (token: ProModalToken): CSSObject => {
  const { antCls, compactViewportBudget, componentCls, viewportBudget } = token
  const modalMaxHeightVar = `--${componentCls.replace('.', '')}-max-height`

  return {
    [componentCls]: {
      [`${antCls}-modal`]: {
        [modalMaxHeightVar]: viewportBudget,
        maxHeight: `var(${modalMaxHeightVar})`,

        [`${antCls}-modal-render`]: {
          maxHeight: 'inherit',
          minHeight: 0,
        },

        [`${antCls}-modal-container`]: {
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'inherit',
          minHeight: 0,
        },

        [`${antCls}-modal-header`]: {
          flexShrink: 0,
        },

        [`${antCls}-modal-body`]: {
          flex: 'auto',
          minWidth: 0,
          minHeight: 0,
          overflow: 'auto',
        },

        [`${antCls}-modal-footer`]: {
          flexShrink: 0,
        },
      },

      [`&${componentCls}-body-height-mode-fill`]: {
        [`${antCls}-modal`]: {
          height: `var(${modalMaxHeightVar})`,

          [`${antCls}-modal-render`]: {
            height: '100%',
          },

          [`${antCls}-modal-container`]: {
            height: '100%',
          },

          // flex-basis 为 0，内容区拿到确定的剩余高度，子元素百分比高度才能解析。
          [`${antCls}-modal-body`]: {
            display: 'flex',
            flexDirection: 'column',
            flex: '1 1 0%',
          },
        },
      },

      [`@media (max-width: ${token.screenSMMax}px)`]: {
        [`${antCls}-modal`]: {
          top: 0,
          [modalMaxHeightVar]: compactViewportBudget,
        },
      },
    },
  }
}

export default function useStyle(prefixCls: string) {
  const { theme, token, hashId, cssVar } = antdTheme.useToken()
  const { getPrefixCls, theme: themeConfig } = React.useContext(
    ConfigProvider.ConfigContext,
  )
  const styleToken = cssVar ?? token
  const cssVarKey =
    typeof themeConfig?.cssVar === 'object' ? themeConfig.cssVar.key : undefined
  const cssVarCls = cssVarKey ?? 'css-var-root'
  const mergedToken: ProModalToken = {
    ...styleToken,
    componentCls: `.${prefixCls}`,
    antCls: `.${getPrefixCls()}`,
    // 弹窗盒子的最大高度，与 top 偏移或是否居中无关。默认留出 200px，避免盒子贴齐视口边缘。
    viewportBudget: 'calc(100vh - 200px)',
    compactViewportBudget: `calc(100vh - ${unit(styleToken.marginXS)} * 2)`,
  }

  useStyleRegister(
    {
      theme,
      token,
      hashId,
      path: ['zby-pro', 'pro-modal', prefixCls],
    },
    () => genProModalStyle(mergedToken),
  )

  return [hashId, cssVarCls] as const
}
