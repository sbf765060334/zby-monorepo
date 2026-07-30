import { useStyleRegister } from '@ant-design/cssinjs'
import { theme as antdTheme } from 'antd'

const unit = (value: number | string) => typeof value === 'number' ? `${value}px` : value

/** 搜索弹窗通过 Portal 渲染，因此使用独立 hashId 注册并作用域化样式。 */
export default function useRouteSearchStyles(prefixCls: string) {
  const { cssVar, hashId, theme, token } = antdTheme.useToken()
  const styleToken = cssVar ?? token

  useStyleRegister(
    {
      theme,
      token: styleToken,
      hashId,
      path: ['zby-pro', 'route-search', prefixCls],
    },
    () => ({
      [`.${prefixCls}-search-trigger`]: {
        width: 32,
        minWidth: 32,
        height: 32,
        padding: 0,
        borderRadius: styleToken.borderRadiusSM,
        background: 'transparent',
        color: styleToken.colorText,
        fontSize: styleToken.fontSizeLG,
        '&:hover': {
          background: styleToken.colorFillSecondary,
          color: styleToken.colorText,
        },
      },
      [`.${prefixCls}-search-modal`]: {
        [`.ant-modal`]: {
          top: '12vh',
          paddingBlockEnd: 0,
        },
        [`.ant-modal-content`]: {
          overflow: 'hidden',
          padding: 0,
          border: `${unit(styleToken.lineWidth)} ${styleToken.lineType} ${styleToken.colorBorderSecondary}`,
          boxShadow: styleToken.boxShadowSecondary,
        },
        [`.ant-modal-header`]: {
          margin: 0,
          paddingBlock: styleToken.paddingSM,
          paddingInline: styleToken.paddingLG,
          borderBlockEnd: `${unit(styleToken.lineWidth)} ${styleToken.lineType} ${styleToken.colorBorderSecondary}`,
        },
        [`.ant-modal-close`]: {
          insetBlockStart: styleToken.paddingXS,
          insetInlineEnd: styleToken.paddingSM,
        },
        [`.ant-modal-body`]: {
          padding: styleToken.paddingLG,
        },
        [`.${prefixCls}-search-body`]: {
          display: 'flex',
          minHeight: 0,
          flexDirection: 'column',
        },
        [`.${prefixCls}-search-body > .ant-input-affix-wrapper`]: {
          flexShrink: 0,
        },
        [`.${prefixCls}-search-section-header`]: {
          display: 'flex',
          minHeight: styleToken.controlHeightSM,
          flexShrink: 0,
          marginBlockStart: styleToken.marginMD,
          marginBlockEnd: styleToken.marginXS,
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: styleToken.marginSM,
        },
        [`.${prefixCls}-search-section-title`]: {
          color: styleToken.colorTextTertiary,
          fontSize: styleToken.fontSizeSM,
        },
        [`.${prefixCls}-search-clear`]: {
          padding: 0,
          border: 0,
          background: 'transparent',
          color: styleToken.colorTextTertiary,
          cursor: 'pointer',
          font: 'inherit',
          fontSize: styleToken.fontSizeSM,

          '&:hover, &:focus-visible': {
            color: styleToken.colorTextSecondary,
          },
        },
        [`.${prefixCls}-search-results`]: {
          display: 'flex',
          minHeight: 0,
          flex: '0 1 auto',
          flexDirection: 'column',
          gap: styleToken.marginXXS,
          overflowY: 'auto',
        },
        [`.${prefixCls}-search-result`]: {
          position: 'relative',
          display: 'flex',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          alignItems: 'center',
          borderRadius: styleToken.borderRadiusSM,
          background: 'transparent',
          color: styleToken.colorText,
        },
        [`.${prefixCls}-search-result:hover, .${prefixCls}-search-result-active`]: {
          background: styleToken.colorFillTertiary,
        },
        [`.${prefixCls}-search-result-main`]: {
          display: 'flex',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          flexDirection: 'column',
          gap: styleToken.marginXXS,
          paddingBlock: styleToken.paddingXS,
          paddingInline: styleToken.paddingSM,
          border: 0,
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          font: 'inherit',
          textAlign: 'start',
        },
        [`.${prefixCls}-search-result-recent .${prefixCls}-search-result-main`]: {
          paddingInlineEnd: `calc(${unit(styleToken.controlHeightSM)} + ${unit(styleToken.paddingSM)})`,
        },
        [`.${prefixCls}-search-remove`]: {
          position: 'absolute',
          insetBlockStart: '50%',
          insetInlineEnd: styleToken.paddingSM,
          display: 'inline-flex',
          width: styleToken.controlHeightSM,
          height: styleToken.controlHeightSM,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          border: 0,
          borderRadius: styleToken.borderRadiusSM,
          background: 'transparent',
          color: styleToken.colorTextTertiary,
          cursor: 'pointer',
          opacity: 0,
          pointerEvents: 'none',
          transform: 'translateY(-50%)',
          transition: `opacity ${styleToken.motionDurationMid} ${styleToken.motionEaseOut}, color ${styleToken.motionDurationFast} ${styleToken.motionEaseInOut}, background ${styleToken.motionDurationFast} ${styleToken.motionEaseInOut}`,

          '&:hover, &:focus-visible': {
            background: styleToken.colorFillSecondary,
            color: styleToken.colorTextSecondary,
          },

          '@media (hover: none)': {
            opacity: 1,
            pointerEvents: 'auto',
          },
        },
        [`.${prefixCls}-search-result:hover .${prefixCls}-search-remove, .${prefixCls}-search-result:focus-within .${prefixCls}-search-remove`]: {
          opacity: 1,
          pointerEvents: 'auto',
        },
        [`.${prefixCls}-search-result-title`]: {
          color: styleToken.colorText,
          lineHeight: styleToken.lineHeight,
        },
        [`.${prefixCls}-search-result-path`]: {
          overflow: 'hidden',
          color: styleToken.colorTextTertiary,
          fontFamily: styleToken.fontFamilyCode,
          fontSize: styleToken.fontSizeSM,
          lineHeight: styleToken.lineHeight,
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
        [`.${prefixCls}-search-highlight`]: {
          padding: 0,
          background: 'transparent',
          color: styleToken.colorPrimaryTextActive,
          fontWeight: styleToken.fontWeightStrong,
        },
      },
    }),
  )

  return hashId
}
