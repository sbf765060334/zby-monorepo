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
        display: 'inline-flex',
        minWidth: 88,
        height: styleToken.controlHeightSM,
        boxSizing: 'border-box',
        alignItems: 'center',
        justifyContent: 'center',
        paddingInline: styleToken.paddingXS,
        border: 0,
        borderRadius: 999,
        background: styleToken.colorFillTertiary,
        color: styleToken.colorTextPlaceholder,
        cursor: 'pointer',
        appearance: 'none',
        font: 'inherit',
        fontSize: styleToken.fontSizeSM,
        lineHeight: styleToken.lineHeightSM,
        gap: styleToken.marginXXS,
        '&:focus-visible': {
          outline: 'none',
          boxShadow: `0 0 0 ${unit(styleToken.controlOutlineWidth)} ${styleToken.controlOutline}`,
        },
        [`> .${prefixCls}-search-trigger-hint`]: {
          color: styleToken.colorTextPlaceholder,
          fontSize: styleToken.fontSizeSM,
          fontWeight: 500,
          letterSpacing: '0.03em',
        },
      },
      [`.${prefixCls}-search-modal`]: {
        [`.${prefixCls}-search-body`]: {
          display: 'flex',
          minHeight: 0,
          flexDirection: 'column',
        },
        [`.${prefixCls}-search-input-wrapper`]: {
          display: 'flex',
          width: '100%',
          minWidth: 0,
          minHeight: styleToken.controlHeightLG,
          boxSizing: 'border-box',
          flexShrink: 0,
          alignItems: 'center',
          gap: styleToken.paddingXS,
          paddingBlock: styleToken.paddingXS,
          paddingInline: styleToken.paddingSM,
          border: `${unit(styleToken.lineWidth)} ${styleToken.lineType} ${styleToken.colorBorder}`,
          borderRadius: styleToken.borderRadius,
          background: styleToken.colorBgContainer,
          transition: `border-color ${styleToken.motionDurationMid} ${styleToken.motionEaseInOut}, box-shadow ${styleToken.motionDurationMid} ${styleToken.motionEaseInOut}`,

          '&:hover': {
            borderColor: styleToken.colorPrimaryHover,
          },

          '&:focus-within': {
            borderColor: styleToken.colorPrimary,
            boxShadow: `0 0 0 ${unit(styleToken.controlOutlineWidth)} ${styleToken.controlOutline}`,
          },
        },
        [`.${prefixCls}-search-input-prefix`]: {
          flexShrink: 0,
          color: styleToken.colorTextQuaternary,
          fontSize: styleToken.fontSizeLG,
        },
        [`.${prefixCls}-search-input`]: {
          width: '100%',
          minWidth: 0,
          padding: 0,
          border: 0,
          outline: 0,
          background: 'transparent',
          color: styleToken.colorText,
          font: 'inherit',
          fontSize: styleToken.fontSizeLG,
          lineHeight: styleToken.lineHeightLG,

          '&::placeholder': {
            color: styleToken.colorTextPlaceholder,
          },
        },
        [`.${prefixCls}-search-input-clear`]: {
          display: 'inline-flex',
          flexShrink: 0,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          border: 0,
          background: 'transparent',
          color: styleToken.colorTextQuaternary,
          cursor: 'pointer',
          fontSize: styleToken.fontSize,

          '&:hover, &:focus-visible': {
            color: styleToken.colorTextTertiary,
          },
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
          scrollPaddingBlock: styleToken.paddingXS,
        },
        [`.${prefixCls}-search-result-row`]: {
          position: 'relative',
          width: '100%',
          minWidth: 0,
        },
        [`.${prefixCls}-search-result`]: {
          display: 'flex',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          flexDirection: 'column',
          gap: styleToken.marginXXS,
          paddingBlock: styleToken.paddingXS,
          paddingInline: styleToken.paddingSM,
          borderRadius: styleToken.borderRadiusSM,
          background: 'transparent',
          color: styleToken.colorText,
          cursor: 'pointer',
        },
        [`.${prefixCls}-search-result:hover, .${prefixCls}-search-result[data-selected='true']`]: {
          background: styleToken.colorFillTertiary,
        },
        [`.${prefixCls}-search-result-recent`]: {
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
