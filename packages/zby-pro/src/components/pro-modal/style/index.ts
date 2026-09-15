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

        [`${antCls}-modal-container`]: {
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'inherit',
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

      [`&${componentCls}-body-height-mode-height`]: {
        [`${antCls}-modal`]: {
          height: `var(${modalMaxHeightVar})`,

          [`${antCls}-modal-container`]: {
            height: '100%',
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
    // antd Modal 默认 top: 100，上下各留 100px
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
