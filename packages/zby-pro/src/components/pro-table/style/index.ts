import type { CSSObject } from '@ant-design/cssinjs'
import { useStyleRegister } from '@ant-design/cssinjs'
import { ConfigProvider, theme as antdTheme } from 'antd'
import * as React from 'react'

type GlobalToken = ReturnType<typeof antdTheme.useToken>['token']

type ProTableToken = GlobalToken & {
  antCls: string
  componentCls: string
  fullscreenPadding: number
  shellPadding: number
}

function genProTableStyle(token: ProTableToken): CSSObject {
  const {
    antCls,
    borderRadiusLG,
    colorBgContainer,
    colorTextDescription,
    colorTextHeading,
    componentCls,
    fullscreenPadding,
    marginSM,
    marginXS,
    paddingSM,
    shellPadding,
    zIndexPopupBase,
  } = token

  return {
    [componentCls]: {
      display: 'flex',
      flexDirection: 'column',
      gap: shellPadding,
      width: '100%',
      maxWidth: '100%',

      '&, *': {
        boxSizing: 'border-box',
      },

      '&-fill': {
        minHeight: '100%',
        height: '100%',
      },

      [`${componentCls}-search-row`]: {
        flexShrink: 0,
        minWidth: 0,
        maxWidth: '100%',

        '&:empty': {
          display: 'none',
        },
      },

      [`${componentCls}-content-main`]: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        gap: marginSM,
      },

      [`${componentCls}-search-views`]: {
        minWidth: 0,
        flexShrink: 0,
        maxWidth: '100%',
      },

      [`${componentCls}-content`]: {
        display: 'flex',
        flexDirection: 'column',
        gap: marginSM,
        flex: 1,
        minHeight: 0,
      },

      [`${componentCls}-content-separated`]: {
        background: colorBgContainer,
        borderRadius: borderRadiusLG,
      },

      [`${componentCls}-toolbar-block`]: {
        display: 'flex',
        flexDirection: 'column',
        gap: marginSM,
        minWidth: 0,
      },

      [`${componentCls}-toolbar`]: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: shellPadding,
        minWidth: 0,
      },

      [`${componentCls}-toolbar-actions`]: {
        display: 'flex',
        alignItems: 'center',
        gap: marginXS,
        flexWrap: 'wrap',
        flex: '1 1 0',
        minWidth: 0,
      },

      [`${componentCls}-toolbar-extra`]: {
        display: 'flex',
        alignItems: 'center',
        gap: marginXS,
        flexWrap: 'wrap',
        flex: '0 0 auto',
        justifyContent: 'flex-end',
        marginInlineStart: 'auto',
        maxWidth: '100%',
      },

      [`${componentCls}-table-layout`]: {
        display: 'flex',
        gap: shellPadding,
        flex: 1,
        minHeight: 0,
      },

      [`${componentCls}-table-aside`]: {
        flex: '0 0 auto',
        minWidth: 0,
      },

      [`${componentCls}-table-main`]: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        gap: marginSM,
        overflow: 'hidden',
      },

      [`${componentCls}-table-top`]: {
        minWidth: 0,
      },

      [`${componentCls}-table-region`]: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      },

      [`${componentCls}-table-region-fill`]: {
        height: '100%',
      },

      [`${componentCls}-table`]: {
        height: '100%',
      },

      [`${componentCls}-table-loading`]: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        minHeight: 0,
      },

      [`${componentCls}-empty`]: {
        paddingBlock: paddingSM,
      },
    },

    [`${componentCls}-columns-modal`]: {
      [`${componentCls}-columns-modal-footer`]: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: marginXS,
        width: '100%',
      },

      [`${componentCls}-columns-modal-footer-actions`]: {
        display: 'flex',
        alignItems: 'center',
        gap: marginXS,
      },

      [`${componentCls}-columns-modal-body`]: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
      },

      [`${componentCls}-columns-panel`]: {
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        minHeight: 0,
        height: '100%',
        flex: 1,
        overflow: 'hidden',
      },

      [`${componentCls}-columns-panel-layout`]: {
        display: 'grid',
        gridTemplateColumns: '560px 240px',
        width: 'max-content',
        maxWidth: '100%',
        minHeight: 0,
        height: '100%',
        flex: 1,
        border: `${token.lineWidth}px ${token.lineType} ${token.colorSplit}`,
        overflow: 'hidden',
      },

      [`${componentCls}-columns-catalog, ${componentCls}-columns-selected`]: {
        minHeight: 0,
        overflow: 'hidden',
      },

      [`${componentCls}-columns-catalog`]: {
        display: 'flex',
        flexDirection: 'column',
        gap: shellPadding,
        padding: paddingSM,
        borderInlineEnd: `${token.lineWidth}px ${token.lineType} ${token.colorSplit}`,
      },

      [`${componentCls}-columns-catalog-search`]: {
        flex: '0 0 auto',
      },

      [`${componentCls}-columns-catalog-list`]: {
        display: 'flex',
        flexDirection: 'column',
        gap: shellPadding,
        minHeight: 0,
        overflow: 'auto',
      },

      [`${componentCls}-columns-catalog-empty`]: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 0,
        flex: 1,
      },

      [`${componentCls}-columns-catalog-section`]: {
        display: 'flex',
        flexDirection: 'column',
        gap: marginXS,
      },

      [`${componentCls}-columns-catalog-section-header`]: {
        display: 'flex',
        alignItems: 'center',
        gap: marginXS,
      },

      [`${componentCls}-columns-catalog-section-title`]: {
        color: colorTextHeading,
        fontWeight: 600,
      },

      [`${componentCls}-columns-catalog-grid`]: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: marginXS,
      },

      [`${componentCls}-columns-catalog-item`]: {
        display: 'flex',
        alignItems: 'center',
        minHeight: token.controlHeight,
        flex: '0 0 auto',
        minWidth: 0,
        maxWidth: '100%',
      },

      [`${componentCls}-columns-catalog-item ${antCls}-checkbox-wrapper`]: {
        minWidth: 0,
        width: '100%',
      },

      [`${componentCls}-columns-catalog-item ${antCls}-checkbox-wrapper > span:last-child`]: {
        minWidth: 0,
        flex: 1,
      },

      [`${componentCls}-columns-catalog-text`]: {
        maxWidth: '100%',
      },

      [`${componentCls}-columns-selected`]: {
        display: 'flex',
        flexDirection: 'column',
        gap: marginSM,
        paddingBlock: paddingSM,
      },

      [`${componentCls}-columns-selected-header`]: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: marginXS,
        paddingInline: shellPadding,
        color: token.colorTextSecondary,
      },

      [`${componentCls}-columns-selected-fixed-limit`]: {
        color: colorTextDescription,
      },

      [`${componentCls}-columns-selected-list`]: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        flex: 1,
        overflowX: 'hidden',
        overflowY: 'auto',
      },

      [`${componentCls}-columns-selected-row`]: {
        display: 'grid',
        gridTemplateColumns: '24px minmax(0, 1fr) auto',
        gap: marginXS,
        alignItems: 'center',
        minHeight: token.controlHeight,
        padding: `${token.paddingXS}px ${shellPadding}px`,
        color: token.colorText,
        background: colorBgContainer,
        borderBottom: `${token.lineWidth}px ${token.lineType} ${token.colorSplit}`,

        '&:hover': {
          background: token.colorPrimaryBg,

          [`${componentCls}-columns-selected-action`]: {
            opacity: 1,
            pointerEvents: 'auto',
          },
        },
      },

      [`${componentCls}-columns-selected-row-dragging`]: {
        background: token.colorPrimaryBg,
      },

      [`${componentCls}-columns-selected-dragger`]: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 20,
        color: colorTextDescription,
        cursor: 'grab',
      },

      [`${componentCls}-columns-selected-title`]: {
        minWidth: 0,
        overflow: 'hidden',
        color: colorTextHeading,
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },

      [`${componentCls}-columns-selected-actions`]: {
        display: 'flex',
        alignItems: 'center',
        gap: marginXS,
      },

      [`${componentCls}-columns-selected-action`]: {
        opacity: 0,
        pointerEvents: 'none',
      },

      [`${componentCls}-columns-selected-action-pin-fixed`]: {
        opacity: 1,
        pointerEvents: 'auto',
      },

      [`${componentCls}-columns-selected-action-wrap`]: {
        display: 'inline-flex',
      },

      [`${componentCls}-columns-selected-action-pin-right .anticon`]: {
        transform: 'rotate(270deg)',
      },

      [`${componentCls}-columns-selected-action-pin-fixed .anticon`]: {
        transform: 'rotate(315deg)',
      },

      '@media (max-width: 960px)': {
        [`${componentCls}-columns-panel-layout`]: {
          gridTemplateColumns: '1fr',
        },

        [`${componentCls}-columns-selected`]: {
          borderTop: `${token.lineWidth}px ${token.lineType} ${token.colorSplit}`,
        },
      },

      '@media (max-width: 768px)': {
        [`${componentCls}-columns-selected-row`]: {
          gridTemplateColumns: '24px minmax(0, 1fr)',
        },

        [`${componentCls}-columns-selected-actions`]: {
          gridColumn: '1 / -1',
          justifyContent: 'flex-end',
        },
      },
    },

    [`${componentCls}-fullscreen`]: {
      position: 'fixed',
      inset: 0,
      zIndex: zIndexPopupBase,
      overflow: 'auto',
      padding: fullscreenPadding,
      background: colorBgContainer,
    },

    [`${antCls}-modal ${componentCls}-columns-modal`]: {
      minWidth: 0,
    },
  }
}

export default function useStyle(prefixCls: string) {
  const { theme, token, hashId, cssVar } = antdTheme.useToken()
  const { getPrefixCls, theme: themeConfig } = React.useContext(ConfigProvider.ConfigContext)
  const styleToken = cssVar ?? token
  const cssVarKey = typeof themeConfig?.cssVar === 'object' ? themeConfig.cssVar.key : undefined
  const cssVarCls = cssVarKey ?? 'css-var-root'
  const mergedToken: ProTableToken = {
    ...styleToken,
    componentCls: `.${prefixCls}`,
    antCls: `.${getPrefixCls()}`,
    shellPadding: styleToken.paddingSM,
    fullscreenPadding: styleToken.paddingLG,
  }

  useStyleRegister(
    {
      theme,
      token,
      hashId,
      path: ['zby-pro', 'pro-table', prefixCls],
    },
    () => genProTableStyle(mergedToken),
  )

  return [hashId, cssVarCls] as const
}
