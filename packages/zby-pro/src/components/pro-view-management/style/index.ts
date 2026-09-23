import type { CSSObject } from '@ant-design/cssinjs'
import { unit, useStyleRegister } from '@ant-design/cssinjs'
import { ConfigProvider, theme as antdTheme } from 'antd'
import * as React from 'react'

type GlobalToken = ReturnType<typeof antdTheme.useToken>['token']

type ProViewManagementToken = GlobalToken & {
  componentCls: string
  antCls: string
}

const genProViewManagementStyle = (
  token: ProViewManagementToken,
): CSSObject => {
  const {
    antCls,
    colorBgContainer,
    colorFillAlter,
    colorSplit,
    colorTextDescription,
    colorTextHeading,
    componentCls,
    lineType,
    lineWidth,
    marginSM,
    marginXS,
    marginXXS,
    paddingSM,
    paddingXS,
    paddingContentVerticalSM,
  } = token

  return {
    [componentCls]: {
      minWidth: 0,

      [`${componentCls}-selector`]: {
        width: 'fit-content',
        minWidth: 120,
        maxWidth: 240,
      },

      [`&${componentCls}-selector-popup`]: {
        maxWidth: 'min(360px, calc(100vw - 32px))',
      },

      [`${componentCls}-selector-option`]: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: marginXS,
        width: '100%',
        minWidth: 0,
      },

      [`${componentCls}-selector-option-name`]: {
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },

      [`${componentCls}-selector-option-count`]: {
        color: colorTextDescription,
        flexShrink: 0,
      },

      [`${componentCls}-selector-label`]: {
        display: 'inline-flex',
        alignItems: 'center',
        minWidth: 0,
        maxWidth: '100%',
      },

      [`${componentCls}-selector-label-name`]: {
        minWidth: 0,
        flex: '0 1 auto',
      },

      [`${componentCls}-selector-label-count`]: {
        marginInlineStart: marginXXS,
        color: colorTextDescription,
        flexShrink: 0,
      },

      [`${componentCls}-selector-footer`]: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: marginXS,
        boxSizing: 'border-box',
        width: '100%',
        minWidth: 0,
        flexShrink: 0,
        padding: `${unit(paddingContentVerticalSM)} ${unit(paddingXS)}`,
        borderTop: `${unit(lineWidth)} ${lineType} ${colorSplit}`,

        [`${antCls}-btn`]: {
          flex: '1 1 0',
          minWidth: 0,
          justifyContent: 'center',
          paddingInline: unit(paddingXS),
          overflow: 'hidden',
        },
      },

      [`${componentCls}-actions`]: {
        flexShrink: 0,
      },

      [`${componentCls}-manager-list`]: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        gap: marginXS,
        height: '100%',
        minWidth: 0,
        minHeight: '100%',
        overflowX: 'hidden',
        overflowY: 'auto',
      },

      [`${componentCls}-manager-row`]: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: marginSM,
        minHeight: token.controlHeight,
        paddingInline: paddingSM,
        paddingBlock: marginXS,
        borderRadius: token.borderRadiusSM,
        background: colorBgContainer,
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100%',

        '&:hover': {
          background: colorFillAlter,
        },
      },

      [`${componentCls}-manager-row-dragging`]: {
        position: 'relative',
        zIndex: token.zIndexPopupBase,
        boxShadow: token.boxShadowSecondary,
      },

      [`${componentCls}-manager-row-main`]: {
        minWidth: 0,
        flex: 1,
      },

      [`${componentCls}-manager-row-form-item`]: {
        width: '100%',
        minWidth: 0,
        marginBottom: 0,

        [`${antCls}-form-item-control-input`]: {
          minHeight: token.controlHeight,
        },
      },

      [`${componentCls}-manager-row-drag`]: {
        display: 'inline-flex',
        alignItems: 'center',
        color: colorTextDescription,
        cursor: 'grab',
        flexShrink: 0,

        '&:active': {
          cursor: 'grabbing',
        },
      },

      [`${componentCls}-manager-row-name`]: {
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        color: colorTextHeading,
      },

      [`${componentCls}-manager-row-actions`]: {
        flexShrink: 0,
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
  const mergedToken: ProViewManagementToken = {
    ...styleToken,
    componentCls: `.${prefixCls}`,
    antCls: `.${getPrefixCls()}`,
  }

  useStyleRegister(
    {
      theme,
      token,
      hashId,
      path: ['zby-pro', 'pro-view-management', prefixCls],
    },
    () => genProViewManagementStyle(mergedToken),
  )

  return [hashId, cssVarCls] as const
}
