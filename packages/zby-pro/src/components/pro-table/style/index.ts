import type { CSSObject } from '@ant-design/cssinjs'
import { unit, useStyleRegister } from '@ant-design/cssinjs'
import { ConfigProvider, theme as antdTheme } from 'antd'
import * as React from 'react'

type GlobalToken = ReturnType<typeof antdTheme.useToken>['token']

type ProTableToken = GlobalToken & {
  antCls: string
  componentCls: string
  fullscreenPadding: number | string
  iconCls: string
  shellPadding: number | string
}

function genProTableStyle(token: ProTableToken): CSSObject {
  const {
    antCls,
    borderRadius,
    borderRadiusLG,
    colorBgContainer,
    colorBgTextHover,
    colorBorder,
    colorText,
    colorTextDescription,
    colorTextHeading,
    colorTextTertiary,
    componentCls,
    controlHeight,
    fontFamily,
    fontSize,
    fullscreenPadding,
    iconCls,
    lineHeight,
    lineType,
    lineWidth,
    marginSM,
    marginXS,
    paddingSM,
    paddingXS,
    shellPadding,
    zIndexPopupBase,
  } = token

  const line = (color: string) => `${unit(lineWidth)} ${lineType} ${color}`
  const columnsSettingsBodyWidth = 800

  return {
    [componentCls]: {
      display: 'flex',
      flexDirection: 'column',
      gap: shellPadding,
      width: '100%',
      maxWidth: '100%',
      color: colorText,
      fontFamily,
      fontSize,
      lineHeight,

      '&, *': {
        boxSizing: 'border-box',
      },

      '&-fill': {
        minHeight: '100%',
        height: '100%',
      },

      '&-fullscreen': {
        position: 'fixed',
        inset: 0,
        zIndex: zIndexPopupBase,
        overflow: 'hidden',
        width: 'auto',
        maxWidth: 'none',
        minHeight: 0,
        height: 'auto',
        padding: fullscreenPadding,
        background: colorBgContainer,

        [`${componentCls}-content`]: {
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        },
      },

      [`${componentCls}-search-row`]: {
        flexShrink: 0,
        minWidth: 0,
        maxWidth: '100%',

        '&:empty': {
          display: 'none',
        },
      },

      [`${componentCls}-search-fields`]: {
        display: 'contents',
      },

      [`${componentCls}-search-field`]: {
        display: 'inline-flex',
        alignItems: 'center',
        boxSizing: 'border-box',
        height: controlHeight,
        maxWidth: '100%',
        paddingBlock: 0,
        paddingInline: paddingXS,
        border: `${line('transparent')}`,
        borderRadius,
        verticalAlign: 'top',
        cursor: 'text',
        backgroundColor: colorBgTextHover,
      },

      [`${componentCls}-search-field-label`]: {
        flex: 'none',
        color: colorTextTertiary,
      },

      [`${componentCls}-search-field-control`]: {
        display: 'inline-flex',
        alignItems: 'center',
        minWidth: 0,
        color: colorText,

        [`${antCls}-select, ${antCls}-picker`]: {
          minWidth: 0,
          borderColor: 'transparent !important',
          background: 'transparent !important',
          boxShadow: 'none !important',
          outline: 'none !important',
        },

        [`${antCls}-select-content`]: {
          flexWrap: 'nowrap',
        },

        [`${antCls}-select:hover, ${antCls}-select-focused, ${antCls}-select-open, ${antCls}-picker:hover, ${antCls}-picker-focused`]:
          {
            borderColor: 'transparent !important',
            background: 'transparent !important',
            boxShadow: 'none !important',
            outline: 'none !important',
          },

        [`${antCls}-input-affix-wrapper`]: {
          width: 'auto',
          border: '0 !important',
          boxShadow: 'none !important',
          outline: 'none !important',
          background: 'transparent',
        },

        [`${antCls}-input-affix-wrapper:hover, ${antCls}-input-affix-wrapper-focused, ${antCls}-input-affix-wrapper:focus, ${antCls}-input-affix-wrapper:focus-within, ${antCls}-input-affix-wrapper:focus-visible`]:
          {
            border: '0 !important',
            boxShadow: 'none !important',
            outline: 'none !important',
          },

        [`${antCls}-input`]: {
          width: 'auto',
          minWidth: 0,
          paddingInline: 0,
          background: 'transparent',
          boxShadow: 'none',
          outline: 'none',
          fieldSizing: 'content',
        },

        [`${antCls}-picker`]: {
          width: 'auto',
        },

        [`${antCls}-picker-input`]: {
          width: 'auto',
          flex: 'none',
        },

        [`${antCls}-picker-input > input`]: {
          width: 'auto',
          minWidth: 0,
          fieldSizing: 'content',
        },

        [`${antCls}-picker-active-bar`]: {
          display: 'none',
        },
      },

      [`${componentCls}-search-actions`]: {
        flexShrink: 0,
      },

      [`${componentCls}-search-overlay${antCls}-drawer-inline`]: {
        overflow: 'hidden',
        top: `calc(${unit(marginXS)} - ${unit(marginSM)})`,
        [`&:not(${antCls}-drawer-open)`]: {
          pointerEvents: 'none',
        },
      },

      [`${componentCls}-search-overlay${antCls}-drawer-top > ${antCls}-drawer-content-wrapper`]: {
        height: 'auto',
        maxHeight: '90%',
        boxShadow: 'none',
      },

      [`${componentCls}-search-overlay ${antCls}-drawer-section`]: {
        height: 'auto',
        maxHeight: '90%',
        overflow: 'hidden',
        boxShadow: 'none',
        background: colorBgContainer,
      },

      [`${componentCls}-search-overlay ${antCls}-drawer-body`]: {
        minHeight: 0,
        overflowY: 'auto',
        paddingTop: 0,
        paddingInline: 0,
        paddingBottom: paddingSM,
      },

      [`${componentCls}-search-overlay-body`]: {
        minWidth: 0,
      },

      [`${componentCls}-search-tags`]: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: marginXS,
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

        [`&${antCls}-table-wrapper ${antCls}-table-pagination${antCls}-pagination`]: {
          marginBlockEnd: 0,
        },
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

    [`${componentCls}-settings-modal-tabs`]: {
      [`${antCls}-tabs-nav`]: {
        margin: 0,
      },
    },

    [`${componentCls}-settings-reset-modal`]: {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'auto',

      [`${antCls}-modal-mask`]: {
        position: 'absolute',
        inset: 0,
      },

      [`${antCls}-modal-wrap`]: {
        position: 'absolute',
        inset: 0,
        pointerEvents: 'auto',
      },

      [`${antCls}-modal`]: {
        height: 'fit-content !important',
      },
    },

    [`${componentCls}-settings-reset-description`]: {
      color: colorTextDescription,
    },

    [`${componentCls}-settings-reset-footer`]: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      flexWrap: 'wrap',
      gap: marginXS,
      width: '100%',

      [`${antCls}-btn + ${antCls}-btn`]: {
        marginInlineStart: 0,
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
        flex: 1,
        width: columnsSettingsBodyWidth,
        maxWidth: '100%',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
      },

      [`${componentCls}-settings-tab-panel`]: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',

        '&[hidden]': {
          display: 'none',
        },
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
        gridTemplateColumns: 'minmax(0, 1fr) 240px',
        width: '100%',
        maxWidth: '100%',
        minHeight: 0,
        height: '100%',
        flex: 1,
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
      },

      [`${componentCls}-columns-catalog-list`]: {
        display: 'flex',
        flexDirection: 'column',
        gap: shellPadding,
        minHeight: 0,
        overflow: 'auto',
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
        display: 'block',
        maxWidth: '100%',
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
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

      // 拖动位移不参与滚动高度，避免列表被越拖越长。
      [`${componentCls}-columns-selected-list-clip`]: {
        flex: '0 0 auto',
        minHeight: '100%',
        overflow: 'clip',
      },

      [`${componentCls}-columns-selected-row`]: {
        display: 'grid',
        gridTemplateColumns: '24px minmax(0, 1fr) auto',
        gap: marginXS,
        alignItems: 'center',
        minHeight: token.controlHeight,
        paddingBlock: paddingXS,
        paddingInline: shellPadding,
        color: token.colorText,
        background: colorBgContainer,

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

      [`${componentCls}-columns-selected-row-more`]: {
        color: colorTextDescription,

        [`${componentCls}-columns-selected-title`]: {
          color: colorTextDescription,
        },
      },

      [`${componentCls}-columns-selected-row-more-start`]: {
        borderTopWidth: token.lineWidthBold,
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
        userSelect: 'none',
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

      [`${componentCls}-columns-selected-action-pin-right ${iconCls}`]: {
        transform: 'rotate(270deg)',
      },

      [`${componentCls}-columns-selected-action-pin-fixed ${iconCls}`]: {
        transform: 'rotate(315deg)',
      },

      '@media (max-width: 960px)': {
        [`${componentCls}-columns-panel-layout`]: {
          gridTemplateColumns: '1fr',
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

    [`${componentCls}-filters-panel`]: {
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      minHeight: 360,
      height: '100%',
      flex: 1,
      padding: paddingSM,

      '&, *': {
        boxSizing: 'border-box',
      },

      [`${componentCls}-filters-panel-layout`]: {
        display: 'grid',
        gridTemplateColumns: 'minmax(260px, 1fr) auto minmax(260px, 1fr)',
        alignItems: 'stretch',
        gap: paddingSM,
        width: '100%',
        maxWidth: '100%',
        minHeight: 0,
        height: '100%',
        flex: 1,
      },

      [`${componentCls}-filters-pane`]: {
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        background: colorBgContainer,
        border: line(colorBorder),
        borderRadius: borderRadiusLG,
      },

      [`${componentCls}-filters-operations`]: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        gap: marginXS,
      },

      [`${componentCls}-filters-pane-row`]: {
        gridTemplateColumns: '24px minmax(0, 1fr) auto',
        paddingBlock: paddingXS,
        paddingInline: paddingSM,
        borderBottom: 'none',
      },

      [`${componentCls}-filters-pane-check`]: {
        minWidth: 0,
      },

      [`${componentCls}-filters-pane-check ${antCls}-checkbox-wrapper`]: {
        maxWidth: '100%',
      },

      [`${componentCls}-filters-pane-row-selected`]: {
        background: token.colorPrimaryBg,
      },

      [`${componentCls}-filters-pane-header`]: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: marginXS,
        paddingBlock: paddingXS,
        paddingInline: paddingSM,
        background: token.colorFillAlter,
        borderBottom: line(colorBorder),
      },

      [`${componentCls}-filters-pane-title`]: {
        color: colorTextHeading,
        fontWeight: token.fontWeightStrong,
      },

      [`${componentCls}-filters-pane-count`]: {
        color: colorTextTertiary,
        fontVariantNumeric: 'tabular-nums',
      },

      [`${componentCls}-filters-pane-list`]: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        flex: 1,
        paddingBlock: paddingXS,
        overflowX: 'hidden',
        overflowY: 'auto',
      },

      [`${componentCls}-filters-pane-empty`]: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        minHeight: 160,
        padding: paddingSM,
      },

      '@media (max-width: 960px)': {
        [`${componentCls}-filters-panel-layout`]: {
          gridTemplateColumns: '1fr',
          width: '100%',
        },

        [`${componentCls}-filters-operations`]: {
          flexDirection: 'row',
          justifyContent: 'center',
          paddingBlock: paddingSM,
        },
      },

      '@media (max-width: 768px)': {
        [`${componentCls}-filters-pane-row ${componentCls}-columns-selected-actions`]: {
          gridColumn: 'auto',
        },
      },
    },

    [`${antCls}-modal ${componentCls}-columns-modal`]: {
      minWidth: 0,
    },
  }
}

export default function useStyle(prefixCls: string) {
  const { theme, token, hashId, cssVar } = antdTheme.useToken()
  const { getPrefixCls, iconPrefixCls, theme: themeConfig } = React.useContext(
    ConfigProvider.ConfigContext,
  )
  const styleToken = cssVar ?? token
  const cssVarKey = typeof themeConfig?.cssVar === 'object' ? themeConfig.cssVar.key : undefined
  const cssVarCls = cssVarKey ?? 'css-var-root'
  const mergedToken: ProTableToken = {
    ...styleToken,
    componentCls: `.${prefixCls}`,
    antCls: `.${getPrefixCls()}`,
    iconCls: `.${iconPrefixCls}`,
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
