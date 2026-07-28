import { useStyleRegister } from '@ant-design/cssinjs'
import { theme as antdTheme } from 'antd'

const unit = (value: number | string) => typeof value === 'number' ? `${value}px` : value

/** 注册与 Shuzhi Drawer 模式一致的 ProLayout token 驱动样式。 */
export default function useProLayoutStyles(prefixCls: string) {
  const { cssVar, hashId, theme, token } = antdTheme.useToken()
  const styleToken = cssVar ?? token
  const componentCls = `.${prefixCls}`
  const headerHeight = Math.max(
    token.controlHeightSM + token.marginXXS,
    token.controlHeightLG - token.marginXXS / 2,
  )
  const headerTabHeight = Math.max(token.controlHeightSM, headerHeight - token.marginXXS)
  const headerIdleTabHeight = Math.max(
    token.controlHeightSM,
    headerHeight - token.marginXXS * 2,
  )
  const fixedIconWidth = unit(styleToken.fontSizeLG)
  const fixedIconTextMargin = unit(styleToken.marginXXS)
  const unfixedLabelLeft = `calc((${fixedIconWidth} + ${fixedIconTextMargin}) / -2)`
  const tabCurveValue = Math.min(
    headerIdleTabHeight / 2,
    token.borderRadiusLG + token.marginXXS,
  )
  const tabCurveSize = unit(tabCurveValue)
  const tabSplitWidth = styleToken.marginXXS
  const tabControlGap = `calc(${unit(styleToken.marginXXS)} / 2)`
  const tabAdjacentCurveStartCenter = `calc(100% - ${unit(styleToken.borderRadiusLG)} - ${unit(tabSplitWidth)})`
  const tabAdjacentCurveEndCenter = `calc(${unit(styleToken.borderRadiusLG)} + ${unit(tabSplitWidth)})`
  const tabSplitHeight = Math.max(token.lineWidthBold, token.fontSize)
  const tabCurveOffset = `calc(${tabCurveSize} * -1)`
  const drawerColumnWidth = `calc(${unit(styleToken.controlHeightLG)} * 5 + ${unit(styleToken.sizeXL)})`
  const surfaceShadow = styleToken.boxShadowTertiary || styleToken.boxShadowSecondary

  useStyleRegister(
    { theme, token: styleToken, hashId, path: ['zby-pro', 'pro-layout', prefixCls] },
    () => ({
      [componentCls]: {
        display: 'flex',
        width: '100%',
        height: '100vh',
        minHeight: '100vh',
        overflow: 'auto hidden',
        background: styleToken.colorFillContent,

        [`${componentCls}-main`]: {
          position: 'relative',
          height: '100vh',
          minHeight: '100vh',
          boxSizing: 'border-box',
          overflow: 'hidden',
          background: styleToken.colorFillContent,
          transition: `padding-inline-start ${styleToken.motionDurationMid} ${styleToken.motionEaseInOut}`,
        },

        [`${componentCls}-sider`]: {
          position: 'fixed',
          insetBlockStart: 0,
          insetInlineStart: 0,
          zIndex: styleToken.zIndexPopupBase,
          display: 'flex',
          height: '100%',
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, #384386 0%, #11162f 100%)',

          [`.ant-layout-sider-children`]: { height: '100%' },
        },

        [`${componentCls}-sider-inner`]: {
          display: 'flex',
          width: '100%',
          height: '100%',
          flexDirection: 'column',
        },

        [`${componentCls}-sider-logo`]: {
          width: '100%',
          boxSizing: 'border-box',
          paddingBlockStart: 18,
          paddingInline: 6,
          paddingBlockEnd: 16,
          overflow: 'hidden',

          img: {
            display: 'block',
            width: '100%',
            maxHeight: 30,
            objectFit: 'contain',
          },
        },

        [`${componentCls}-sider-menu-container`]: {
          position: 'relative',
          width: '100%',
          minHeight: 0,
          flex: 1,
          boxSizing: 'border-box',
          overflow: 'hidden',
        },

        [`${componentCls}-sider-menu-scroll`]: {
          width: '100%',
          height: '100%',
          overflowX: 'hidden',
          overflowY: 'auto',
          scrollbarWidth: 'none',
          ['-ms-overflow-style' as const]: 'none',

          '&::-webkit-scrollbar': {
            display: 'none',
            width: 0,
            height: 0,
          },
        },

        [`${componentCls}-sider-menu`]: {
          width: '100%',
          minHeight: '100%',
          boxSizing: 'border-box',
          paddingBlock: styleToken.paddingXS,
        },

        [`${componentCls}-sider-item`]: {
          position: 'relative',
          display: 'block',
          width: 60,
          boxSizing: 'border-box',
          paddingBlock: 10,
          paddingInline: 0,
          border: 0,
          background: 'transparent',
          color: '#868a9c',
          textAlign: 'center',
          textDecoration: 'none',
          cursor: 'pointer',
          userSelect: 'none',
          transition: `color ${styleToken.motionDurationMid} ${styleToken.motionEaseInOut}`,

          dl: {
            position: 'relative',
            display: 'flex',
            width: '100%',
            minHeight: styleToken.controlHeightLG,
            margin: 0,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: styleToken.borderRadiusSM,
            transition: `background ${styleToken.motionDurationMid} ${styleToken.motionEaseInOut}`,
          },

          'dl::before': {
            position: 'absolute',
            insetBlockStart: '50%',
            insetInlineStart: 0,
            width: styleToken.lineWidthBold,
            height: '100%',
            background: '#fff',
            borderStartEndRadius: styleToken.borderRadiusSM,
            borderEndEndRadius: styleToken.borderRadiusSM,
            content: '""',
            opacity: 0,
            transform: 'translateY(-50%)',
            transition: `opacity ${styleToken.motionDurationMid} ${styleToken.motionEaseOut}`,
          },

          dt: {
            display: 'inline-flex',
            margin: 0,
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            lineHeight: '24px',
          },

          dd: {
            maxWidth: '100%',
            minWidth: 0,
            margin: 0,
            marginBlockStart: 2,
            fontSize: styleToken.fontSizeSM,
            lineHeight: styleToken.lineHeight,
          },

          '&:hover': { color: '#c9cad4' },
          '&:focus-visible': {
            color: '#c9cad4',
            outline: `${unit(styleToken.lineWidthFocus)} ${styleToken.lineType} ${styleToken.controlOutline}`,
            outlineOffset: styleToken.marginXXS,
          },
        },

        [`${componentCls}-sider-item-title`]: {
          display: 'block',
          maxWidth: '100%',
          minWidth: 0,
          overflow: 'hidden',
          color: 'inherit',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },

        [`${componentCls}-sider-item-hover`]: { color: '#c9cad4' },
        [`${componentCls}-sider-item-active`]: {
          color: '#fff',
          '&:hover, &:focus-visible': { color: '#fff' },
          dl: { '&::before': { opacity: 1 } },
        },

        [`${componentCls}-system-trigger`]: {
          display: 'flex',
          width: '100%',
          height: 60,
          flex: '0 0 auto',
          alignItems: 'center',
          justifyContent: 'center',
          border: 0,
          borderBlockStart: '1px solid #30354f',
          background: 'transparent',
          color: '#868a9c',
          fontSize: 24,
          cursor: 'pointer',
          transition: `color ${styleToken.motionDurationMid} ${styleToken.motionEaseInOut}`,

          '&:hover, &:focus-visible': { color: '#c9cad4' },
        },

        [`${componentCls}-header`]: {
          position: 'absolute',
          insetBlockStart: 0,
          insetInlineStart: 0,
          zIndex: 1,
          display: 'flex',
          width: '100%',
          height: headerHeight,
          boxSizing: 'border-box',
          alignItems: 'center',
          paddingInline: styleToken.paddingSM,
          background: styleToken.colorBgContainer,
          transition: `padding-inline-start ${styleToken.motionDurationMid} ${styleToken.motionEaseInOut}`,
        },

        [`${componentCls}-tabs`]: {
          display: 'flex',
          minWidth: 0,
          height: '100%',
          maxHeight: headerHeight,
          flex: 1,
          alignItems: 'center',
          overflow: 'hidden',
          background: styleToken.colorBgContainer,

          [`.ant-tabs`]: {
            maxWidth: '100%',
            height: '100%',
            maxHeight: headerHeight,
          },
          [`.ant-tabs-nav`]: {
            height: '100%',
            maxHeight: headerHeight,
            margin: 0,
            alignItems: 'flex-end',
            '&::before': { borderBlockEnd: 0 },
          },
          [`.ant-tabs-nav-wrap, .ant-tabs-nav-list, .ant-tabs-nav-operations`]: {
            height: '100%',
            maxHeight: headerHeight,
            alignItems: 'flex-end',
          },
          [`.ant-tabs-nav-list`]: {
            paddingInline: tabCurveSize,
          },
          [`.ant-tabs-extra-content`]: {
            display: 'inline-flex',
            height: '100%',
            alignItems: 'center',
          },
          [`.ant-tabs-tab`]: {
            display: 'inline-flex',
            height: headerIdleTabHeight,
            minHeight: headerIdleTabHeight,
            boxSizing: 'border-box',
            marginBlock: styleToken.marginXXS,
            marginInline: 0,
            paddingBlock: 0,
            paddingInline: styleToken.paddingSM,
            alignItems: 'center',
            border: `${unit(styleToken.lineWidth)} ${styleToken.lineType} transparent`,
            borderRadius: `${unit(styleToken.borderRadiusLG)} !important`,
            background: styleToken.colorBgContainer,
            color: styleToken.colorTextTertiary,
            fontSize: styleToken.fontSize,
            lineHeight: styleToken.lineHeight,
            transition: 'none',

            '&:hover, &:focus-visible': {
              borderColor: 'transparent',
              background: styleToken.colorFillTertiary,
              color: styleToken.colorTextSecondary,
            },
          },
          [`.ant-tabs-tab-btn`]: {
            display: 'inline-flex',
            minWidth: 0,
            height: '100%',
            alignItems: 'center',
            color: 'inherit',
            lineHeight: styleToken.lineHeight,
            transition: 'none',

            '&:active, &:focus:not(:focus-visible)': {
              color: 'inherit',
            },
          },
          [`.ant-tabs-tab-active`]: {
            zIndex: 1,
            height: headerIdleTabHeight,
            minHeight: headerIdleTabHeight,
            margin: 0,
            borderColor: 'transparent',
            borderBlockEndColor: `${styleToken.colorBgLayout} !important`,
            borderRadius: `${tabCurveSize} ${tabCurveSize} 0 0 !important`,
            background: styleToken.colorBgLayout,
            color: styleToken.colorText,

            '&:hover, &:focus-visible': {
              borderColor: 'transparent',
              background: styleToken.colorBgLayout,
              color: styleToken.colorText,
            },
          },
          [`.ant-tabs-tab-active .ant-tabs-tab-btn`]: {
            color: styleToken.colorText,
            textShadow: 'none',
          },
          [`.ant-tabs-tab-remove`]: {
            display: 'inline-flex',
            width: styleToken.fontSize,
            height: styleToken.fontSize,
            alignItems: 'center',
            justifyContent: 'center',
            marginInlineStart: tabControlGap,
            borderRadius: styleToken.borderRadiusXS,
            color: styleToken.colorTextTertiary,
            lineHeight: unit(styleToken.fontSize),
            opacity: 0,
            transition: `background ${styleToken.motionDurationFast} ${styleToken.motionEaseInOut}, color ${styleToken.motionDurationFast} ${styleToken.motionEaseInOut}, opacity ${styleToken.motionDurationMid} ${styleToken.motionEaseOut}`,

            '&:hover, &:active, &:focus-visible': {
              background: 'transparent',
              color: styleToken.colorTextTertiary,
            },
          },
          [`.ant-tabs-tab:hover .ant-tabs-tab-remove, .ant-tabs-tab-active .ant-tabs-tab-remove`]: {
            opacity: 1,
          },
          [`.ant-tabs-content-holder`]: { display: 'none' },
        },

        [`${componentCls}-tab-node`]: {
          position: 'relative',
          display: 'flex',
          height: '100%',
          alignItems: 'flex-end',
          overflow: 'hidden',
          transition: `opacity ${styleToken.motionDurationFast} ${styleToken.motionEaseOut}`,
        },
        [`${componentCls}-tab-node-dragging`]: {
          zIndex: styleToken.zIndexPopupBase,
          overflow: 'visible',
          [`.ant-tabs-tab`]: {
            borderColor: styleToken.colorBorder,
            boxShadow: surfaceShadow,
          },
        },
        [`${componentCls}-tab-node-active`]: {
          zIndex: 1,
          height: headerTabHeight,
          alignSelf: 'flex-end',
          alignItems: 'flex-start',
          overflow: 'visible',
          borderRadius: `${tabCurveSize} ${tabCurveSize} 0 0`,
          background: styleToken.colorBgLayout,

          '&::before, &::after': {
            position: 'absolute',
            insetBlockEnd: 0,
            width: tabCurveSize,
            height: tabCurveSize,
            content: '""',
            pointerEvents: 'none',
          },
          '&::before': {
            insetInlineStart: tabCurveOffset,
            background: `radial-gradient(circle at ${tabAdjacentCurveStartCenter} 0, transparent ${tabCurveSize}, ${styleToken.colorBgLayout} ${tabCurveSize})`,
          },
          '&::after': {
            insetInlineEnd: tabCurveOffset,
            background: `radial-gradient(circle at ${tabAdjacentCurveEndCenter} 0, transparent ${tabCurveSize}, ${styleToken.colorBgLayout} ${tabCurveSize})`,
          },
        },
        [`${componentCls}-tab-node-dropping`]: { opacity: 0.72 },
        [`${componentCls}-tab-split`]: {
          position: 'relative',
          width: tabSplitWidth,
          height: headerIdleTabHeight,
          marginBlock: styleToken.marginXXS,
          flexShrink: 0,
          alignSelf: 'flex-end',
          transition: `opacity ${styleToken.motionDurationFast} ${styleToken.motionEaseOut}`,

          '&::before': {
            position: 'absolute',
            insetBlockStart: '50%',
            insetInline: 0,
            width: styleToken.lineWidth,
            height: tabSplitHeight,
            marginInline: 'auto',
            background: styleToken.colorBorderSecondary,
            content: '""',
            transform: 'translateY(-50%)',
          },
        },
        [`${componentCls}-tab-split-hidden, ${componentCls}-tab-node:hover + ${componentCls}-tab-split, ${componentCls}-tab-split:has(+ ${componentCls}-tab-node:hover)`]: {
          opacity: 0,
        },
        [`${componentCls}-tab-label-wrap`]: {
          maxWidth: '100%',
          minWidth: 0,
        },
        [`${componentCls}-tab-label`]: {
          position: 'relative',
          left: unfixedLabelLeft,
          display: 'inline-block',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          transition: `left ${styleToken.motionDurationMid} ${styleToken.motionEaseOut}`,
        },
        [`.ant-tabs-tab:hover ${componentCls}-tab-label`]: { left: 0 },
        [`${componentCls}-tab-label-fixed`]: { left: 0 },
        [`${componentCls}-fixed-icon`]: {
          display: 'inline-flex',
          width: fixedIconWidth,
          minWidth: fixedIconWidth,
          height: styleToken.fontSizeLG,
          marginInlineEnd: fixedIconTextMargin,
          flexShrink: 0,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
          padding: 0,
          border: 0,
          background: 'transparent',
          color: styleToken.colorTextTertiary,
          fontSize: fixedIconWidth,
          cursor: 'pointer',
          opacity: 0,
          transform: 'rotate(0deg)',
          transition: `opacity ${styleToken.motionDurationMid} ${styleToken.motionEaseOut}, color ${styleToken.motionDurationFast} ${styleToken.motionEaseInOut}, transform ${styleToken.motionDurationMid} ${styleToken.motionEaseOut}`,

          '&:hover, &:focus-visible': { color: styleToken.colorTextSecondary },
        },
        [`.ant-tabs-tab:hover ${componentCls}-fixed-icon-unfixed, ${componentCls}-fixed-icon-unfixed:focus-visible`]: {
          opacity: 1,
        },
        [`${componentCls}-fixed-icon-active`]: {
          color: styleToken.colorTextSecondary,
          opacity: 1,
          transform: 'rotate(-45deg)',
        },
        [`${componentCls}-collection-trigger`]: {
          marginInlineStart: 0,
          color: styleToken.colorTextTertiary,

          '&:hover, &:focus-visible, &.ant-dropdown-open': {
            color: styleToken.colorTextSecondary,
          },
        },
        [`${componentCls}-header-extra`]: {
          display: 'flex',
          marginInlineStart: styleToken.marginLG,
          flex: '0 0 auto',
          alignItems: 'center',
          gap: styleToken.marginXS,
          color: styleToken.colorTextTertiary,
        },
        [`${componentCls}-theme-trigger`]: {
          color: styleToken.colorTextTertiary,
          '&:hover': { color: styleToken.colorTextSecondary },
        },

        [`${componentCls}-content, ${componentCls}-pages, ${componentCls}-page-body`]: {
          background: styleToken.colorBgLayout,
        },
        [`${componentCls}-breadcrumb`]: {
          display: 'flex',
          minHeight: `calc(${unit(styleToken.controlHeight)} + ${unit(styleToken.paddingSM)})`,
          flex: '0 0 auto',
          boxSizing: 'border-box',
          alignItems: 'center',
          paddingBlock: styleToken.paddingXS,
          paddingInline: styleToken.paddingSM,
          background: styleToken.colorBgContainer,
        },
        [`${componentCls}-breadcrumb-label`]: {
          color: styleToken.colorTextQuaternary,
          fontSize: styleToken.fontSize,
        },
        [`${componentCls}-breadcrumb-item-title`]: {
          display: 'inline-flex',
          alignItems: 'center',
        },
        [`${componentCls}-breadcrumb-icon`]: { marginInlineEnd: styleToken.marginXXS },
        [`${componentCls}-breadcrumb-item-clickable`]: {
          cursor: 'pointer',
          '&:hover': { background: 'transparent', textDecoration: 'underline' },
        },
        [`${componentCls}-page-body`]: {
          position: 'relative',
          boxSizing: 'border-box',
          overflow: 'auto',
          scrollbarWidth: 'thin',
        },
        [`${componentCls}-exception-page`]: {
          display: 'flex',
          minHeight: '100%',
          boxSizing: 'border-box',
          alignItems: 'center',
          justifyContent: 'center',
          padding: styleToken.paddingSM,
        },
      },

      [`.${prefixCls}-menu-drawer`]: {
        [`.ant-drawer-section`]: {
          borderInlineEnd: `${unit(styleToken.lineWidth)} ${styleToken.lineType} ${styleToken.colorBorderSecondary}`,
          background: styleToken.colorBgElevated,
          boxShadow: surfaceShadow,
        },
        [`.${prefixCls}-menu-columns`]: {
          display: 'inline-block',
          height: '100%',
          columnWidth: drawerColumnWidth,
          columnGap: 0,
          columnFill: 'auto',
          background: styleToken.colorBgElevated,
        },
        [`.${prefixCls}-menu-group, .${prefixCls}-menu-entry`]: {
          width: drawerColumnWidth,
          boxSizing: 'border-box',
          breakInside: 'avoid',
          WebkitColumnBreakInside: 'avoid',
          paddingInline: styleToken.paddingMD,
          borderInlineEnd: `${unit(styleToken.lineWidth)} ${styleToken.lineType} ${styleToken.colorBorderSecondary}`,
        },
        [`.${prefixCls}-menu-group`]: { paddingBlock: styleToken.paddingSM },
        [`.${prefixCls}-menu-entry`]: { paddingBlock: 0 },
        [`.${prefixCls}-menu-title`]: {
          overflow: 'hidden',
          marginBlockEnd: styleToken.marginSM,
          paddingBlock: styleToken.paddingXS,
          paddingInlineEnd: styleToken.paddingSM,
          borderBlockEnd: `${unit(styleToken.lineWidth)} ${styleToken.lineType} ${styleToken.colorBorderSecondary}`,
          color: styleToken.colorTextTertiary,
          fontSize: styleToken.fontSizeSM,
          fontWeight: styleToken.fontWeightStrong,
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
        [`.${prefixCls}-menu`]: {
          position: 'relative',
          overflow: 'hidden',
          borderRadius: styleToken.borderRadiusSM,
          color: styleToken.colorTextSecondary,
          transition: `background ${styleToken.motionDurationMid} ${styleToken.motionEaseInOut}, color ${styleToken.motionDurationMid} ${styleToken.motionEaseInOut}`,

          '&:hover': {
            background: styleToken.colorFillTertiary,
            color: styleToken.colorText,
          },
        },
        [`.${prefixCls}-menu-row`]: {
          display: 'flex',
          alignItems: 'center',
          paddingBlock: styleToken.paddingXXS,
          paddingInlineEnd: styleToken.paddingXS,
        },
        [`.${prefixCls}-menu-main`]: { minWidth: 0, flex: 1 },
        [`.${prefixCls}-menu-direct .${prefixCls}-menu-row`]: {
          paddingInlineStart: styleToken.sizeMD,
        },
        [`.${prefixCls}-menu-active`]: {
          position: 'relative',
          background: styleToken.colorPrimaryBg,
          color: styleToken.colorPrimaryText,

          '&:hover': {
            background: styleToken.colorPrimaryBg,
            color: styleToken.colorPrimaryText,
          },
          '&::before': {
            position: 'absolute',
            insetBlockStart: '50%',
            insetInlineStart: 0,
            width: styleToken.lineWidthBold,
            height: '100%',
            background: styleToken.colorPrimary,
            borderStartEndRadius: styleToken.borderRadiusXS,
            borderEndEndRadius: styleToken.borderRadiusXS,
            content: '""',
            transform: 'translateY(-50%)',
          },
        },
        [`.${prefixCls}-menu-button`]: {
          display: 'flex',
          width: '100%',
          minWidth: 0,
          minHeight: styleToken.controlHeight,
          boxSizing: 'border-box',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: styleToken.marginXXS,
          padding: 0,
          border: 0,
          background: 'transparent',
          color: 'inherit',
          font: 'inherit',
          textAlign: 'start',
          textDecoration: 'none',
          cursor: 'pointer',

          '&:hover, &:active, &:focus, &:visited': {
            background: 'transparent',
            color: 'inherit',
          },
        },
        [`.${prefixCls}-menu-button-title`]: {
          minWidth: 0,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
        [`.${prefixCls}-menu-tag`]: {
          flexShrink: 0,
          marginInlineStart: styleToken.marginXXS,
        },
        [`.${prefixCls}-menu-favorite`]: {
          display: 'inline-flex',
          width: styleToken.controlHeightXS,
          height: styleToken.controlHeightXS,
          flexShrink: 0,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          border: 0,
          borderRadius: styleToken.borderRadiusXS,
          background: 'transparent',
          color: styleToken.colorTextTertiary,
          cursor: 'pointer',
          opacity: 1,
          transition: `background ${styleToken.motionDurationMid} ${styleToken.motionEaseInOut}, color ${styleToken.motionDurationMid} ${styleToken.motionEaseInOut}, opacity ${styleToken.motionDurationMid} ${styleToken.motionEaseOut}`,

          '@media (hover: hover) and (pointer: fine)': { opacity: 0 },
          '&:hover, &:focus-visible': {
            background: styleToken.colorWarningBg,
            color: styleToken.colorWarningTextHover,
          },
        },
        [`.${prefixCls}-menu:hover .${prefixCls}-menu-favorite, .${prefixCls}-menu-favorite-active`]: {
          opacity: 1,
        },
        [`.${prefixCls}-menu-favorite-active`]: {
          color: styleToken.colorWarningText,
          opacity: 1,
        },
      },

      [`.${prefixCls}-collection-panel`]: {
        display: 'flex',
        width: `calc(${unit(styleToken.controlHeightLG)} * 4)`,
        maxHeight: `calc(${unit(styleToken.controlHeightLG)} * 12 + ${unit(styleToken.paddingLG)})`,
        flexDirection: 'column',
        overflow: 'hidden',
        border: `${unit(styleToken.lineWidth)} ${styleToken.lineType} ${styleToken.colorBorderSecondary}`,
        borderRadius: styleToken.borderRadiusLG,
        background: styleToken.colorBgElevated,
        boxShadow: surfaceShadow,
        textAlign: 'start',

        [`.${prefixCls}-collection-header`]: {
          padding: styleToken.paddingSM,
          borderBlockEnd: `${unit(styleToken.lineWidth)} ${styleToken.lineType} ${styleToken.colorBorderSecondary}`,
          color: styleToken.colorText,
          fontWeight: styleToken.fontWeightStrong,
        },
        [`.${prefixCls}-collection-body`]: {
          minHeight: `calc(${unit(styleToken.controlHeightLG)} * 2 + ${unit(styleToken.paddingLG)})`,
          flex: 1,
          overflowY: 'auto',
          padding: styleToken.paddingSM,
          scrollbarWidth: 'thin',
        },
        [`.${prefixCls}-collection-item`]: {
          position: 'relative',
          display: 'flex',
          minWidth: 0,
          alignItems: 'center',
          borderRadius: styleToken.borderRadiusSM,
          color: styleToken.colorTextSecondary,
          transition: `background ${styleToken.motionDurationMid} ${styleToken.motionEaseInOut}, color ${styleToken.motionDurationMid} ${styleToken.motionEaseInOut}`,

          '&:hover': { background: styleToken.colorFillTertiary, color: styleToken.colorText },
        },
        [`.${prefixCls}-collection-item-active`]: {
          background: styleToken.colorPrimaryBg,
          color: styleToken.colorPrimaryTextActive,
        },
        [`.${prefixCls}-collection-item-main`]: {
          minWidth: 0,
          flex: 1,
          overflow: 'hidden',
          paddingBlock: styleToken.paddingXXS,
          paddingInline: styleToken.paddingXS,
          border: 0,
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          textAlign: 'start',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
        [`.${prefixCls}-collection-remove`]: {
          position: 'absolute',
          insetBlockStart: '50%',
          insetInlineEnd: styleToken.paddingXXS,
          display: 'inline-flex',
          padding: 0,
          border: 0,
          background: 'transparent',
          color: styleToken.colorTextTertiary,
          fontSize: styleToken.fontSizeSM,
          cursor: 'pointer',
          opacity: 0,
          transform: 'translateY(-50%)',
          transition: `opacity ${styleToken.motionDurationFast} ${styleToken.motionEaseOut}, color ${styleToken.motionDurationFast} ${styleToken.motionEaseInOut}`,

          '&:hover, &:focus-visible': {
            color: styleToken.colorErrorTextHover,
            opacity: 1,
          },
        },
        [`.${prefixCls}-collection-item:hover .${prefixCls}-collection-remove, .${prefixCls}-collection-item:focus-within .${prefixCls}-collection-remove`]: {
          opacity: 1,
        },
        [`.${prefixCls}-collection-footer`]: {
          position: 'relative',
          paddingBlock: styleToken.paddingSM,
          color: styleToken.colorTextTertiary,
          fontSize: styleToken.fontSizeSM,
          textAlign: 'center',

          '&::before': {
            position: 'absolute',
            insetBlockStart: 0,
            insetInlineStart: '50%',
            width: `calc(${unit(styleToken.controlHeightLG)} + ${unit(styleToken.paddingLG)})`,
            borderBlockStart: `${unit(styleToken.lineWidth)} ${styleToken.lineType} ${styleToken.colorBorderSecondary}`,
            content: '""',
            transform: 'translateX(-50%)',
          },
        },
        [`.${prefixCls}-collection-footer-icon`]: {
          marginInline: styleToken.marginXXS,
          color: styleToken.colorWarningText,
        },
      },

      [`.${prefixCls}-system-popover`]: {
        [`.ant-popover-inner`]: {
          border: `${unit(styleToken.lineWidth)} ${styleToken.lineType} ${styleToken.colorBorderSecondary}`,
          boxShadow: surfaceShadow,
        },
        [`.${prefixCls}-system-list`]: {
          width: `calc(${unit(styleToken.controlHeightLG)} * 5 + ${unit(styleToken.paddingXL)})`,
        },
        [`.${prefixCls}-system-item`]: {
          position: 'relative',
          width: '100%',
          minHeight: styleToken.controlHeight,
          boxSizing: 'border-box',
          padding: styleToken.paddingXXS,
          border: 0,
          borderRadius: styleToken.borderRadiusSM,
          background: 'transparent',
          font: 'inherit',
          cursor: 'pointer',
          transition: `background ${styleToken.motionDurationMid} ${styleToken.motionEaseInOut}, color ${styleToken.motionDurationMid} ${styleToken.motionEaseInOut}`,

          '&:hover': {
            background: styleToken.colorFillTertiary,
            color: styleToken.colorPrimaryTextActive,
          },
          '&:disabled': { cursor: 'default' },
        },
        [`.${prefixCls}-system-item-content`]: {
          display: 'flex',
          width: '100%',
          minWidth: 0,
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: styleToken.marginXS,
          textAlign: 'start',
        },
        [`.${prefixCls}-system-item-active`]: {
          background: styleToken.colorPrimaryBg,
          color: styleToken.colorPrimaryTextActive,

          '&::before': {
            position: 'absolute',
            insetBlockStart: '50%',
            insetInlineStart: 0,
            width: styleToken.lineWidthBold,
            height: '60%',
            background: styleToken.colorPrimary,
            borderStartEndRadius: styleToken.borderRadiusXS,
            borderEndEndRadius: styleToken.borderRadiusXS,
            content: '""',
            transform: 'translateY(-50%)',
          },
        },
        [`.${prefixCls}-system-logo`]: {
          display: 'flex',
          width: styleToken.controlHeightSM,
          height: styleToken.controlHeightSM,
          boxSizing: 'border-box',
          alignItems: 'center',
          justifyContent: 'center',
          padding: styleToken.paddingXXS,
          border: `${unit(styleToken.lineWidth)} ${styleToken.lineType} ${styleToken.colorBorderSecondary}`,
          borderRadius: styleToken.borderRadiusSM,
          background: styleToken.colorBgElevated,

          img: { maxWidth: '100%', maxHeight: '100%' },
        },
      },
    }),
  )

  return { hashId, headerHeight }
}
