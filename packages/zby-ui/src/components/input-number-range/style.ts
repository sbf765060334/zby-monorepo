import { useStyleRegister } from '@ant-design/cssinjs'
import { theme as antdTheme } from 'antd'

const toCssUnit = (value: number | string) => (typeof value === 'number' ? `${value}px` : value)

export function useInputNumberRangeStyle(prefixCls: string) {
  const { theme, token, hashId } = antdTheme.useToken()

  useStyleRegister(
    {
      theme,
      token,
      hashId,
      path: ['zby-ui', 'input-number-range', prefixCls],
    },
    () => {
      const componentCls = `.${prefixCls}`
      const border = `${toCssUnit(token.lineWidth)} ${token.lineType} ${token.colorBorder}`
      const activeShadow = `0 0 0 ${toCssUnit(token.controlOutlineWidth)} ${token.controlOutline}`
      const errorActiveShadow = `0 0 0 ${toCssUnit(token.controlOutlineWidth)} ${token.colorErrorOutline}`
      const warningActiveShadow = `0 0 0 ${toCssUnit(token.controlOutlineWidth)} ${token.colorWarningOutline}`

      return {
        [componentCls]: {
          boxSizing: 'border-box',
          display: 'inline-flex',
          alignItems: 'center',
          width: '100%',
          minHeight: token.controlHeight,
          margin: 0,
          padding: 0,
          color: token.colorText,
          fontSize: token.fontSize,
          lineHeight: token.lineHeight,
          background: token.colorBgContainer,
          border: `${toCssUnit(token.lineWidth)} ${token.lineType} transparent`,
          borderRadius: token.borderRadius,
          transition: `all ${token.motionDurationMid}`,

          '&, *': {
            boxSizing: 'border-box',
          },

          [`${componentCls}-body`]: {
            display: 'inline-flex',
            flex: 1,
            alignItems: 'stretch',
            minWidth: 0,
          },

          [`${componentCls}-input`]: {
            flex: 1,
            width: 'auto',
            minWidth: 0,
            alignSelf: 'stretch',
            background: 'transparent',
            border: 0,
            borderRadius: 0,
            boxShadow: 'none',
            outline: 0,

            '&.ant-input-number': {
              display: 'inline-flex',
              flex: '1 1 0',
              width: 'auto',
              minWidth: 0,
              height: 'auto',
              alignItems: 'center',
              paddingBlock: 0,
              background: 'transparent',
              border: 0,
              borderRadius: 0,
              boxShadow: 'none',
              outline: 0,
            },

            '&.ant-input-number:hover, &.ant-input-number:focus, &.ant-input-number:focus-within, &.ant-input-number-focused':
              {
                background: 'transparent',
                border: 0,
                boxShadow: 'none',
                outline: 0,
              },

            '&.ant-input-number:focus-visible, &.ant-input-number:has(input:focus-visible)': {
              outline: 'none',
            },

            '&.ant-input-number-disabled': {
              background: 'transparent',
              border: 0,
              boxShadow: 'none',
            },

            '.ant-input-number-input-wrap': {
              flex: 1,
              minWidth: 0,
            },

            '.ant-input-number-input': {
              background: 'transparent',
              border: 0,
              boxShadow: 'none',
              outline: 0,
              textAlign: 'start',
            },
          },

          [`${componentCls}-separator`]: {
            display: 'inline-flex',
            flex: 'none',
            alignItems: 'center',
            paddingInline: token.paddingXS,
            color: token.colorTextQuaternary,
            lineHeight: 1,
            userSelect: 'none',
          },

          [`${componentCls}-prefix`]: {
            display: 'inline-flex',
            flex: 'none',
            alignItems: 'center',
            paddingInlineStart: token.paddingSM,
            marginInlineEnd: token.paddingXXS,
            color: token.colorTextQuaternary,
            lineHeight: 1,
          },

          [`${componentCls}-affix`]: {
            display: 'inline-flex',
            flex: 'none',
            alignItems: 'center',
            alignSelf: 'center',
            gap: token.paddingXS,
            paddingInlineEnd: token.paddingSM,
            marginInlineStart: token.paddingXXS,
            color: token.colorTextQuaternary,
            fontSize: token.fontSizeIcon,
            lineHeight: 1,
          },

          [`${componentCls}-suffix`]: {
            display: 'inline-flex',
            flex: 'none',
            alignItems: 'center',
            color: token.colorTextQuaternary,
            fontSize: token.fontSizeIcon,
            lineHeight: 1,
          },

          [`${componentCls}-clear`]: {
            display: 'inline-flex',
            flex: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            width: token.fontSizeIcon,
            height: token.fontSizeIcon,
            color: token.colorTextQuaternary,
            fontSize: token.fontSizeIcon,
            fontStyle: 'normal',
            lineHeight: 1,
            textAlign: 'center',
            cursor: 'pointer',
            opacity: 0,
            transition: `color ${token.motionDurationMid}, opacity ${token.motionDurationMid}`,
            textRendering: 'auto',
            transform: 'translateZ(0)',

            '&:hover': {
              color: token.colorIcon,
            },
          },

          [`${componentCls}-clear-icon`]: {
            position: 'relative',
            display: 'block',
            width: '1em',
            height: '1em',
            borderRadius: '50%',
            background: 'currentColor',

            '&::before, &::after': {
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '0.55em',
              height: 2,
              background: token.colorBgContainer,
              borderRadius: 1,
              content: '""',
            },

            '&::before': {
              transform: 'translate(-50%, -50%) rotate(45deg)',
            },

            '&::after': {
              transform: 'translate(-50%, -50%) rotate(-45deg)',
            },
          },

          [`&:hover:not(${componentCls}-disabled):not(${componentCls}-readonly)`]: {
            [`${componentCls}-clear`]: {
              background: token.colorBgBase,
              borderRadius: '50%',
              opacity: 1,
            },
          },

          '@media (hover: none)': {
            [`${componentCls}-clear`]: {
              background: token.colorBgBase,
              borderRadius: '50%',
              opacity: 1,
            },
          },

          [`&${componentCls}-focused`]: {
            borderColor: token.colorPrimary,
            boxShadow: activeShadow,
            outline: 0,
          },

          [`&${componentCls}-outlined`]: {
            background: token.colorBgContainer,
            border,

            [`&:hover:not(${componentCls}-disabled):not(${componentCls}-readonly)`]: {
              borderColor: token.colorPrimaryHover,
            },
          },

          [`&${componentCls}-filled`]: {
            background: token.colorFillTertiary,
            border: `${toCssUnit(token.lineWidth)} ${token.lineType} transparent`,

            [`&:hover:not(${componentCls}-disabled):not(${componentCls}-readonly)`]: {
              background: token.colorFillSecondary,
            },

            [`&${componentCls}-focused`]: {
              background: token.colorBgContainer,
            },
          },

          [`&${componentCls}-borderless`]: {
            background: 'transparent',
            border: `${toCssUnit(token.lineWidth)} ${token.lineType} transparent`,
            boxShadow: 'none',

            [`&${componentCls}-focused`]: {
              boxShadow: 'none',
            },
          },

          [`&${componentCls}-underlined`]: {
            background: 'transparent',
            borderInline: 0,
            borderBlockStart: 0,
            borderBlockEnd: border,
            borderRadius: 0,
            boxShadow: 'none',

            [`&:hover:not(${componentCls}-disabled):not(${componentCls}-readonly)`]: {
              borderBlockEndColor: token.colorPrimaryHover,
            },
          },

          [`&${componentCls}-status-error`]: {
            '&, &:hover': {
              borderColor: token.colorError,
            },

            [`&${componentCls}-focused`]: {
              borderColor: token.colorError,
              boxShadow: errorActiveShadow,
            },
          },

          [`&${componentCls}-status-warning`]: {
            '&, &:hover': {
              borderColor: token.colorWarning,
            },

            [`&${componentCls}-focused`]: {
              borderColor: token.colorWarning,
              boxShadow: warningActiveShadow,
            },
          },

          [`&${componentCls}-sm`]: {
            minHeight: token.controlHeightSM,
            fontSize: token.fontSizeSM,
            borderRadius: token.borderRadiusSM,
          },

          [`&${componentCls}-lg`]: {
            minHeight: token.controlHeightLG,
            fontSize: token.fontSizeLG,
            borderRadius: token.borderRadiusLG,
          },

          [`&${componentCls}-disabled`]: {
            color: token.colorTextDisabled,
            background: token.colorBgContainerDisabled,
            borderColor: token.colorBorder,
            cursor: 'not-allowed',

            [`${componentCls}-separator`]: {
              color: token.colorTextDisabled,
            },
          },

          [`&${componentCls}-readonly`]: {
            cursor: 'default',
          },
        },
      }
    },
  )

  return hashId
}
