/**
 * 文件职责：把 ActionIcon 的主题 token、尺寸、颜色和交互状态转换成 css-in-js 规则。
 *
 * ActionIcon.tsx 负责给按钮添加状态类名，本文件负责解释这些类名应该呈现什么样式。
 * 所有颜色和主要尺寸都来自 antd 主题，因此切换主题或 CSS 变量模式时无需重写组件。
 */
import { unit, useStyleRegister } from '@ant-design/cssinjs'
import type { CSSObject } from '@ant-design/cssinjs'
import { ConfigProvider, theme as antdTheme } from 'antd'
import * as React from 'react'

import { getActionIconFontSizes, getActionIconSizes } from '../size'

/** antd 内置的色板名称；每种颜色都会生成默认、悬浮、按下等状态规则。 */
const presetColors = [
  'blue',
  'purple',
  'cyan',
  'green',
  'magenta',
  'pink',
  'red',
  'orange',
  'yellow',
  'volcano',
  'geekblue',
  'lime',
  'gold',
] as const

/** 从 antd useToken 的返回类型中自动取得完整的全局主题 token 类型。 */
type GlobalToken = ReturnType<typeof antdTheme.useToken>['token']

/**
 * ActionIcon 样式生成器使用的完整 token。
 * 除了 antd 全局 token，还加入当前组件选择器，以及 size.ts 计算出的按钮和图标尺寸。
 */
type ActionIconToken = GlobalToken & {
  /** 带点号的组件选择器，例如 `.ant-action-icon`。 */
  componentCls: string
  /** 小号按钮的宽高。 */
  actionIconSizeSM: number | string
  /** 中号按钮的宽高。 */
  actionIconSize: number | string
  /** 大号按钮的宽高。 */
  actionIconSizeLG: number | string
  /** 小号按钮里的图标字号。 */
  actionIconFontSizeSM: number | string
  /** 中号按钮里的图标字号。 */
  actionIconFontSize: number | string
  /** 大号按钮里的图标字号。 */
  actionIconFontSizeLG: number | string
}

/**
 * 清除不同浏览器对 button 等元素提供的默认排版差异，并接入 antd 的字体主题。
 * 这部分相当于组件自己的轻量 reset，返回值会被合并进根按钮样式。
 */
function resetComponent(token: ActionIconToken): CSSObject {
  return {
    boxSizing: 'border-box',
    margin: 0,
    padding: 0,
    color: token.colorText,
    fontSize: token.fontSize,
    lineHeight: token.lineHeight,
    listStyle: 'none',
    fontFamily: token.fontFamily,
  }
}

/** 生成所有尺寸、颜色和变体都会共享的布局与基础交互规则。 */
function genBaseStyle(token: ActionIconToken): CSSObject {
  const { componentCls } = token

  return {
    [componentCls]: {
      // 先统一盒模型和字体，再建立“图标在方形点击区域里水平、垂直居中”的布局。
      ...resetComponent(token),
      position: 'relative',
      display: 'inline-flex',
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
      color: token.colorIcon,
      background: 'transparent',
      border: 'none',
      borderRadius: token.borderRadius,
      cursor: 'pointer',
      appearance: 'none',
      userSelect: 'none',
      touchAction: 'manipulation',
      // 只对用户能感知的颜色变化做过渡，时长和缓动完全跟随 antd 主题。
      transition: [
        `color ${token.motionDurationMid} ${token.motionEaseInOut}`,
        `background-color ${token.motionDurationMid} ${token.motionEaseInOut}`,
        `border-color ${token.motionDurationMid} ${token.motionEaseInOut}`,
      ].join(', '),

      // disabled 按钮不应该再响应 focus、hover 和 active，所以交互规则统一放在此选择器下。
      '&:not(:disabled)': {
        // focus-visible 只在键盘等需要明确焦点提示的场景出现，不干扰普通鼠标点击。
        '&:focus-visible': {
          outline: `${unit(token.lineWidthFocus)} solid ${token.colorPrimaryBorder}`,
          outlineOffset: 1,
        },

        '&:hover': {
          color: token.colorPrimary,
          background: 'transparent',
        },

        '&:active': {
          color: token.colorPrimaryActive,
          background: 'transparent',
        },
      },

      // 原生 disabled 属性会阻止点击；这里额外把颜色和鼠标样式变成不可用状态。
      '&:disabled': {
        color: token.colorTextDisabled,
        cursor: 'not-allowed',
      },

      // selected 是可切换按钮的基础选中态，默认使用主题主色和浅主色背景。
      '&-selected': {
        '&:not(:disabled)': {
          color: token.colorPrimary,
          background: token.colorPrimaryBg,

          '&:hover': {
            color: token.colorPrimary,
            background: token.colorPrimaryBgHover,
          },

          '&:active': {
            background: token.colorPrimaryBgHover,
          },
        },
      },

      // 未显式指定 color 时，danger 类负责把普通态和选中态都切换为错误色体系。
      '&-danger': {
        '&:not(:disabled)': {
          color: token.colorError,

          '&:hover': {
            color: token.colorErrorHover,
            background: 'transparent',
          },

          '&:active': {
            color: token.colorErrorActive,
            background: 'transparent',
          },
        },

        // 当 danger 和 selected 同时存在时，需要用错误色背景覆盖上面的主色选中态。
        [`&${componentCls}-selected`]: {
          '&:not(:disabled)': {
            color: token.colorError,
            background: token.colorErrorBg,

            '&:hover': {
              color: token.colorError,
              background: token.colorErrorBgHover,
            },

            '&:active': {
              background: token.colorErrorBgHover,
            },
          },
        },
      },

      // square 使用主题圆角，circle 使用 50% 圆角；宽高相等，所以最终会得到正圆。
      '&-square': {
        borderRadius: token.borderRadius,
      },

      '&-circle': {
        borderRadius: '50%',
      },

      // 图标容器也使用 flex 居中。line-height: 1 可避免文字行盒给 SVG 带来额外空白。
      [`${componentCls}-icon`]: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,

        // 常见图标直接渲染成 svg，设为 inline-block 可减少行内 SVG 的基线空隙。
        '> svg': {
          display: 'inline-block',
          lineHeight: 1,
        },
      },
    },
  }
}

/**
 * 生成 small、middle、large 三档尺寸规则。
 * middle 直接写在基础类上；small 和 large 由 ActionIcon.tsx 生成的 -sm/-lg 类覆盖。
 */
function genSizeStyle(token: ActionIconToken): CSSObject {
  const { componentCls } = token

  return {
    // 没有尺寸后缀时就是默认的 middle。
    [componentCls]: {
      width: token.actionIconSize,
      height: token.actionIconSize,

      [`${componentCls}-icon`]: {
        fontSize: token.actionIconFontSize,
      },
    },

    // 小号类同时缩小点击区域和内部图标，二者不会出现档位不一致。
    [`${componentCls}-sm`]: {
      width: token.actionIconSizeSM,
      height: token.actionIconSizeSM,

      [`${componentCls}-icon`]: {
        fontSize: token.actionIconFontSizeSM,
      },
    },

    // 大号类与小号类遵循同样的覆盖方式。
    [`${componentCls}-lg`]: {
      width: token.actionIconSizeLG,
      height: token.actionIconSizeLG,

      [`${componentCls}-icon`]: {
        fontSize: token.actionIconFontSizeLG,
      },
    },
  }
}

/** 生成颜色与 variant 的组合样式，例如 primary + solid 或 red + outlined。 */
function genVariantStyle(token: ActionIconToken): CSSObject {
  const { componentCls } = token
  // 预设色板 token 的键名由颜色动态拼接，转成字典后才能按运行时字符串读取。
  const colorToken = token as unknown as Record<string, string>

  /**
   * 根据一组颜色 token 生成某个颜色的全部状态与变体规则。
   * 这样 default、primary、dangerous 和 13 个预设颜色能共用完全相同的交互结构。
   */
  const genColorStyle = (
    color: string,
    style: {
      /** 普通状态的文字/图标颜色。 */
      color: string
      /** 鼠标悬浮时的前景色。 */
      hoverColor: string
      /** 鼠标按下时的前景色。 */
      activeColor: string
      /** 浅色背景及其悬浮、按下状态。 */
      bg: string
      hoverBg: string
      activeBg: string
      /** solid 可选的独立背景色；不传时回退到上面的前景色。 */
      solidBg?: string
      solidHoverBg?: string
      solidActiveBg?: string
      /** solid 的前景色，通常是保证对比度的浅色文字。 */
      solidColor?: string
    },
  ): CSSObject => ({
    // 颜色类本身先决定普通、hover 和 active 的前景色。
    [`&${componentCls}-color-${color}`]: {
      color: style.color,

      '&:not(:disabled):hover': {
        color: style.hoverColor,
      },

      '&:not(:disabled):active': {
        color: style.activeColor,
      },

      // filled 使用浅色背景，适合比 solid 更轻的强调效果。
      [`&${componentCls}-variant-filled`]: {
        color: style.color,
        background: style.bg,

        '&:not(:disabled):hover': {
          color: style.hoverColor,
          background: style.hoverBg,
        },

        '&:not(:disabled):active': {
          color: style.activeColor,
          background: style.activeBg,
        },
      },

      // outlined 与 dashed 只在边框形态上不同，颜色状态可以共用。
      [`&${componentCls}-variant-outlined, &${componentCls}-variant-dashed`]: {
        color: style.color,
        background: 'transparent',
        borderColor: style.color,

        '&:not(:disabled):hover': {
          color: style.hoverColor,
          background: style.bg,
          borderColor: style.hoverColor,
        },

        '&:not(:disabled):active': {
          color: style.activeColor,
          background: style.activeBg,
          borderColor: style.activeColor,
        },
      },

      // solid 使用实色背景；专用 solid token 不存在时，回退到这一色系的普通状态色。
      [`&${componentCls}-variant-solid`]: {
        color: style.solidColor ?? token.colorTextLightSolid,
        background: style.solidBg ?? style.color,

        '&:not(:disabled):hover': {
          color: style.solidColor ?? token.colorTextLightSolid,
          background: style.solidHoverBg ?? style.hoverColor,
        },

        '&:not(:disabled):active': {
          color: style.solidColor ?? token.colorTextLightSolid,
          background: style.solidActiveBg ?? style.activeColor,
        },
      },

      [`&${componentCls}-variant-text, &${componentCls}-variant-link, &${componentCls}-variant-inline`]:
        {
          // 轻量变体主要改变前景色；只有 primary 悬浮时保留浅色背景反馈。
          color: style.color,

          '&:not(:disabled):hover': {
            color: style.hoverColor,
            background: color === 'primary' ? style.bg : 'transparent',
          },

          '&:not(:disabled):active': {
            color: style.activeColor,
            background: 'transparent',
          },
        },
    },
  })

  return {
    [componentCls]: [
      {
        // outlined 和 dashed 都需要一条真实边框；currentColor 让边框自动跟随当前颜色类。
        [`&${componentCls}-variant-outlined, &${componentCls}-variant-dashed`]: {
          border: `${unit(token.lineWidth)} solid currentColor`,
        },

        // dashed 只覆盖边框线型，其余尺寸和颜色继续复用 outlined 规则。
        [`&${componentCls}-variant-dashed`]: {
          borderStyle: 'dashed',
        },

        // inline 用于嵌在文字流中的操作：内容决定实际宽高，但仍保留最小点击区域。
        [`&${componentCls}-variant-inline`]: {
          width: 'auto',
          height: 'auto',
          minWidth: token.actionIconSizeSM,
          minHeight: token.actionIconSizeSM,
          lineHeight: token.lineHeight,
        },

        // link 与 inline 默认沿用 antd 链接色及其交互状态。
        [`&${componentCls}-variant-link, &${componentCls}-variant-inline`]: {
          color: token.colorLink,

          '&:not(:disabled):hover': {
            color: token.colorLinkHover,
          },

          '&:not(:disabled):active': {
            color: token.colorLinkActive,
          },
        },

        // text 没有常驻背景，只在 hover/active 时用中性色背景提示交互。
        [`&${componentCls}-variant-text`]: {
          '&:not(:disabled):hover': {
            background: token.colorFillTertiary,
          },

          '&:not(:disabled):active': {
            background: token.colorFillSecondary,
          },
        },
      },

      // default 使用中性色 token，并为 solid 提供 antd 专门的实色背景 token。
      genColorStyle('default', {
        color: token.colorIcon,
        hoverColor: token.colorIconHover,
        activeColor: token.colorText,
        bg: token.colorFillTertiary,
        hoverBg: token.colorFillSecondary,
        activeBg: token.colorFill,
        solidBg: token.colorBgSolid,
        solidHoverBg: token.colorBgSolidHover,
        solidActiveBg: token.colorBgSolidActive,
        solidColor: token.colorTextLightSolid,
      }),

      // primary 直接使用主题主色阶，主题品牌色变化后会自动同步。
      genColorStyle('primary', {
        color: token.colorPrimary,
        hoverColor: token.colorPrimaryHover,
        activeColor: token.colorPrimaryActive,
        bg: token.colorPrimaryBg,
        hoverBg: token.colorPrimaryBgHover,
        activeBg: token.colorPrimaryBorder,
      }),

      // danger 在内部类名中叫 dangerous，与 ActionIcon.tsx 的 danger -> dangerous 转换对应。
      genColorStyle('dangerous', {
        color: token.colorError,
        hoverColor: token.colorErrorHover,
        activeColor: token.colorErrorActive,
        bg: token.colorErrorBg,
        hoverBg: token.colorErrorBgHover,
        activeBg: token.colorErrorBgActive,
      }),

      // 批量展开 blue、red 等 antd 预设色，不重复手写 13 份相同的状态规则。
      presetColors.map((color) =>
        genColorStyle(color, {
          // 数字 6 是主色，1/2/3 是由浅到深的背景阶，Hover/Active 是交互前景色。
          color: colorToken[`${color}6`],
          hoverColor: colorToken[`${color}Hover`],
          activeColor: colorToken[`${color}Active`],
          bg: colorToken[`${color}1`],
          hoverBg: colorToken[`${color}2`],
          activeBg: colorToken[`${color}3`],
        }),
      ),

      {
        // 颜色与变体规则比基础 disabled 更具体，因此最后用 && 提高优先级并统一覆盖。
        // 这样禁用按钮不会因为仍带有 primary/solid 等类名而看起来可以点击。
        '&&:disabled': {
          color: token.colorTextDisabled,
          background: 'transparent',
          borderColor: 'currentColor',
        },
      },
    ],
  }
}

/**
 * 读取当前 antd 主题、补齐 ActionIcon 专用 token，并把三组样式注册到 css-in-js。
 * 返回的 hashId 和 cssVarCls 会挂到 button 上，让隔离样式和主题变量真正生效。
 */
export default function useStyle(prefixCls: string) {
  // token 是普通主题值，cssVar 是 CSS 变量版本；hashId 用于避免不同组件样式互相污染。
  const { theme, token, hashId, cssVar } = antdTheme.useToken()
  // ConfigContext 里保存了用户给 CSS 变量模式指定的 key。
  const { theme: themeConfig } = React.useContext(ConfigProvider.ConfigContext)
  // 开启 CSS 变量模式时优先用 cssVar，未开启时使用已经计算好的普通 token。
  const styleToken = cssVar ?? token
  const cssVarKey =
    typeof themeConfig?.cssVar === 'object' ? themeConfig.cssVar.key : undefined
  // antd 没有自定义 key 时使用它约定的根变量类名。
  const cssVarCls = cssVarKey ?? 'css-var-root'
  // 尺寸和字号分别计算，方便点击区域与视觉图标按不同的主题公式增长。
  const actionIconSizes = getActionIconSizes(styleToken)
  const actionIconFontSizes = getActionIconFontSizes(styleToken)
  // 把全局 token 与组件派生值合成一份对象，后面的生成器只接收这一个参数。
  const mergedToken: ActionIconToken = {
    ...styleToken,
    componentCls: `.${prefixCls}`,
    actionIconSizeSM: actionIconSizes.small,
    actionIconSize: actionIconSizes.middle,
    actionIconSizeLG: actionIconSizes.large,
    actionIconFontSizeSM: actionIconFontSizes.small,
    actionIconFontSize: actionIconFontSizes.middle,
    actionIconFontSizeLG: actionIconFontSizes.large,
  }

  // path 是样式缓存键的一部分；同一主题和 prefixCls 下会复用已注册规则，不会每次渲染重复插入。
  useStyleRegister(
    {
      theme,
      token,
      hashId,
      path: ['zby-ui', 'action-icon', prefixCls],
    },
    // 基础、尺寸、颜色/变体按固定顺序合并，后注册的具体状态可以覆盖前面的通用规则。
    () => [genBaseStyle(mergedToken), genSizeStyle(mergedToken), genVariantStyle(mergedToken)],
  )

  // as const 保留二元只读元组类型，调用方可以安全地按顺序解构。
  return [hashId, cssVarCls] as const
}
