import { useStyleRegister } from '@ant-design/cssinjs'
import { theme as antdTheme } from 'antd'

const unit = (value: number | string) => typeof value === 'number' ? `${value}px` : value

/** 注册 ProLayout Shell 的 token 驱动样式。 */
export default function useProLayoutStyles(prefixCls: string) {
  const { cssVar, hashId, theme, token } = antdTheme.useToken()
  const styleToken = cssVar ?? token
  const componentCls = `.${prefixCls}`

  useStyleRegister(
    { theme, token: styleToken, hashId, path: ['zby-pro', 'pro-layout', prefixCls] },
    () => ({
      [componentCls]: {
        display: 'flex',
        width: '100%',
        height: '100vh',
        minHeight: 0,
        overflow: 'hidden',
        background: styleToken.colorBgLayout,

        [`${componentCls}-main`]: {
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden',
        },

        [`${componentCls}-sider`]: {
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, #384386 0%, #11162f 100%)',
        },

        [`${componentCls}-sider-logo`]: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 auto',
          minHeight: 58,
          paddingBlock: 12,
          paddingInline: 6,
          overflow: 'hidden',

          img: { maxWidth: '100%', maxHeight: 30 },
        },

        [`${componentCls}-sider-menu`]: {
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          scrollbarWidth: 'thin',
        },

        [`${componentCls}-sider-item`]: {
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          minHeight: 58,
          flexDirection: 'column',
          gap: 2,
          padding: 6,
          border: 0,
          background: 'transparent',
          color: '#868a9c',
          cursor: 'pointer',
          textDecoration: 'none',

          '&:hover': { color: '#c9cad4' },
          '&::before': {
            position: 'absolute',
            insetBlock: 0,
            insetInlineStart: 0,
            width: 2,
            background: styleToken.colorPrimary,
            content: '""',
            opacity: 0,
          },
        },

        [`${componentCls}-sider-item-active`]: {
          color: '#fff',
          '&::before': { opacity: 1 },
        },

        [`${componentCls}-sider-item-icon`]: { fontSize: 24 },
        [`${componentCls}-sider-item-title`]: {
          width: '100%',
          overflow: 'hidden',
          fontSize: 12,
          textAlign: 'center',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },

        [`${componentCls}-system-trigger`]: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: 52,
          border: 0,
          borderBlockStart: '1px solid #30354f',
          background: 'transparent',
          color: '#c9cad4',
          cursor: 'pointer',
          fontSize: 22,
          img: { width: 28, height: 28, objectFit: 'contain' },
        },

        [`${componentCls}-header`]: {
          flex: '0 0 38px',
          borderBlockEnd: `${unit(styleToken.lineWidth)} ${styleToken.lineType} ${styleToken.colorBorderSecondary}`,
          background: styleToken.colorFillTertiary,
        },

        [`${componentCls}-tabs`]: {
          overflow: 'hidden',
          [`.ant-tabs`]: { height: '100%' },
          [`.ant-tabs-nav`]: { height: '100%', margin: 0 },
          [`.ant-tabs-content-holder`]: { display: 'none' },
          [`.ant-tabs-tab`]: { margin: 0, paddingBlock: 4 },
        },

        [`${componentCls}-tab-node`]: {
          height: '100%',
          opacity: 1,
          [`&${componentCls}-tab-node-dragging`]: { opacity: 0.55 },
        },
        [`${componentCls}-fixed-icon`]: {
          color: styleToken.colorTextTertiary,
          cursor: 'pointer',
        },
        [`${componentCls}-collection-trigger`]: {
          marginInlineStart: styleToken.marginXXS,
        },
        [`${componentCls}-header-extra`]: {
          flex: '0 0 auto',
          gap: styleToken.marginXS,
          paddingInline: styleToken.paddingSM,
        },

        [`${componentCls}-content`]: { background: styleToken.colorFillContent },
        [`${componentCls}-breadcrumb`]: {
          display: 'flex',
          alignItems: 'center',
          minHeight: styleToken.controlHeight + styleToken.paddingSM,
          flex: '0 0 auto',
          boxSizing: 'border-box',
          paddingBlock: styleToken.paddingXS,
          paddingInline: styleToken.paddingSM,
          background: styleToken.colorBgContainer,
        },
        [`${componentCls}-breadcrumb-label`]: {
          color: styleToken.colorTextQuaternary,
          fontSize: styleToken.fontSize,
        },
        [`${componentCls}-breadcrumb-item-title`]: { display: 'inline-flex', alignItems: 'center' },
        [`${componentCls}-breadcrumb-icon`]: { marginInlineEnd: styleToken.marginXXS },
        [`${componentCls}-breadcrumb-item-clickable`]: {
          cursor: 'pointer',
          '&:hover': { background: 'transparent', textDecoration: 'underline' },
        },

        [`${componentCls}-pages`]: { background: styleToken.colorFillContent },
        [`${componentCls}-page-body`]: {
          boxSizing: 'border-box',
          background: styleToken.colorFillContent,
          scrollbarWidth: 'thin',
        },
        [`${componentCls}-exception-page`]: {
          display: 'flex',
          minHeight: '100%',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },

      [`.${prefixCls}-menu-drawer`]: {
        [`.ant-drawer-content`]: { background: styleToken.colorBgElevated },
        [`.${prefixCls}-menu-columns`]: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: styleToken.marginSM,
        },
        [`.${prefixCls}-menu-column`]: { minWidth: 0 },
        [`.${prefixCls}-menu-route-row`]: {
          display: 'flex',
          alignItems: 'center',
          minWidth: 0,
        },
        [`.${prefixCls}-menu-route, .${prefixCls}-menu-anchor`]: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          minHeight: styleToken.controlHeight,
          gap: styleToken.marginXS,
          border: 0,
          borderRadius: styleToken.borderRadiusSM,
          background: 'transparent',
          color: styleToken.colorTextSecondary,
          textAlign: 'start',
          textDecoration: 'none',
          cursor: 'pointer',
          '&:hover': { background: styleToken.colorFillTertiary, color: styleToken.colorText },
        },
        [`.${prefixCls}-menu-route`]: {
          minWidth: 0,
          flex: 1,
        },
        [`.${prefixCls}-menu-route-active`]: {
          background: styleToken.colorPrimaryBg,
          color: styleToken.colorPrimaryTextActive,
        },
        [`.${prefixCls}-menu-route-group-title`]: { fontWeight: styleToken.fontWeightStrong },
        [`.${prefixCls}-menu-anchor`]: { minHeight: styleToken.controlHeightSM, fontSize: styleToken.fontSizeSM },
        [`.${prefixCls}-menu-favorite`]: {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: styleToken.controlHeightXS,
          height: styleToken.controlHeightXS,
          flex: '0 0 auto',
          padding: 0,
          border: 0,
          borderRadius: styleToken.borderRadiusXS,
          background: 'transparent',
          color: styleToken.colorTextTertiary,
          cursor: 'pointer',
          opacity: 1,
          transition: `background ${styleToken.motionDurationMid}, color ${styleToken.motionDurationMid}, opacity ${styleToken.motionDurationMid}`,
          '@media (hover: hover) and (pointer: fine)': { opacity: 0 },
          '&:hover, &:focus-visible': {
            background: styleToken.colorWarningBg,
            color: styleToken.colorWarningTextHover,
          },
        },
        [`.${prefixCls}-menu-route-row:hover .${prefixCls}-menu-favorite, .${prefixCls}-menu-route-row:focus-within .${prefixCls}-menu-favorite, .${prefixCls}-menu-favorite-active`]: {
          opacity: 1,
        },
        [`.${prefixCls}-menu-favorite-active`]: {
          color: styleToken.colorWarningText,
        },
      },

      [`.${prefixCls}-collection-panel`]: {
        display: 'flex',
        width: 280,
        maxHeight: 360,
        flexDirection: 'column',
        overflow: 'hidden',
        border: `${unit(styleToken.lineWidth)} ${styleToken.lineType} ${styleToken.colorBorderSecondary}`,
        borderRadius: styleToken.borderRadiusLG,
        background: styleToken.colorBgElevated,
        boxShadow: styleToken.boxShadowSecondary,
        textAlign: 'start',

        [`.${prefixCls}-collection-header`]: {
          padding: styleToken.paddingSM,
          borderBlockEnd: `${unit(styleToken.lineWidth)} ${styleToken.lineType} ${styleToken.colorBorderSecondary}`,
          color: styleToken.colorText,
          fontWeight: styleToken.fontWeightStrong,
        },
        [`.${prefixCls}-collection-body`]: {
          minHeight: 120,
          flex: 1,
          overflowY: 'auto',
          padding: styleToken.paddingSM,
          scrollbarWidth: 'thin',
        },
        [`.${prefixCls}-collection-item`]: {
          display: 'flex',
          alignItems: 'center',
          minWidth: 0,
          borderRadius: styleToken.borderRadiusSM,
          color: styleToken.colorTextSecondary,
          transition: `background ${styleToken.motionDurationMid}, color ${styleToken.motionDurationMid}`,
          '&:hover': {
            background: styleToken.colorFillTertiary,
            color: styleToken.colorText,
          },
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
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: styleToken.controlHeightXS,
          height: styleToken.controlHeightXS,
          flex: '0 0 auto',
          padding: 0,
          border: 0,
          borderRadius: styleToken.borderRadiusXS,
          background: 'transparent',
          color: styleToken.colorTextTertiary,
          cursor: 'pointer',
          opacity: 0,
          transition: `opacity ${styleToken.motionDurationFast}, color ${styleToken.motionDurationFast}`,
          '&:hover, &:focus-visible': { color: styleToken.colorErrorTextHover, opacity: 1 },
        },
        [`.${prefixCls}-collection-item:hover .${prefixCls}-collection-remove, .${prefixCls}-collection-item:focus-within .${prefixCls}-collection-remove`]: {
          opacity: 1,
        },
        [`.${prefixCls}-collection-footer`]: {
          padding: styleToken.paddingSM,
          borderBlockStart: `${unit(styleToken.lineWidth)} ${styleToken.lineType} ${styleToken.colorBorderSecondary}`,
          color: styleToken.colorTextTertiary,
          fontSize: styleToken.fontSizeSM,
          textAlign: 'center',
        },
        [`.${prefixCls}-collection-footer-icon`]: {
          marginInlineEnd: styleToken.marginXXS,
          color: styleToken.colorWarningText,
        },
      },
    }),
  )

  return { hashId }
}
