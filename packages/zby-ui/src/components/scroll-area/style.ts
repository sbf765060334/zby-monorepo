import { unit, useStyleRegister } from '@ant-design/cssinjs'
import type { CSSObject } from '@ant-design/cssinjs'
import { theme as antdTheme } from 'antd'

export interface ComponentToken {
  /**
   * @descCN 滚动条轨道尺寸
   * @descEN Size of scrollbar track
   */
  trackSize?: number
  /**
   * @descCN 滚动条滑块背景色
   * @descEN Background of scrollbar thumb
   */
  thumbBg?: string
  /**
   * @descCN 滚动条滑块悬浮背景色
   * @descEN Background of scrollbar thumb on hover
   */
  thumbHoverBg?: string
  /**
   * @descCN 滚动条层级
   * @descEN z-index of scrollbar
   */
  zIndex?: number
}

declare module 'antd/es/theme/interface/components' {
  interface ComponentTokenMap {
    ScrollArea?: ComponentToken
  }
}

type GlobalToken = ReturnType<typeof antdTheme.useToken>['token']

type ScrollAreaToken = GlobalToken & {
  componentCls: string
  scrollAreaTrackSize: number
  scrollAreaThumbBg: string
  scrollAreaThumbHoverBg: string
  scrollAreaZIndex: number
}

/**
 * 复刻 antd resetComponent 在普通组件根节点上的基础重置。
 * 这里使用本地纯函数，避免为了一个无状态的样式对象再混入 antd/es 内部模块，
 * 从而保证 ConfigProvider、theme.useToken 和 ScrollArea 始终来自同一个 antd 根入口实例。
 */
function resetComponent(token: GlobalToken): CSSObject {
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

/**
 * 生成 ScrollArea 的结构样式。滚动距离、滑块尺寸和位移由组件运行时计算，
 * 这里仅负责滚动容器、轨道、滑块以及不同展示状态对应的视觉规则。
 */
const genBaseStyle = (token: ScrollAreaToken): CSSObject => {
  const { componentCls } = token
  const trackSize = unit(token.scrollAreaTrackSize)
  const trackInset = unit(token.paddingXXS)

  return {
    [componentCls]: {
      ...resetComponent(token),
      position: 'relative',
      display: 'block',
      overflow: 'hidden',

      [`> ${componentCls}-viewport`]: {
        width: '100%',
        height: '100%',
        maxWidth: '100%',
        maxHeight: '100%',
        boxSizing: 'border-box',
        WebkitOverflowScrolling: 'touch',
      },

      // 自定义滚动条模式下仍由原生 viewport 承担滚动，只隐藏浏览器自带滚动条。
      [`&:not(${componentCls}-native) > ${componentCls}-viewport`]: {
        scrollbarWidth: 'none',
        ['-ms-overflow-style' as const]: 'none',

        '&::-webkit-scrollbar': {
          display: 'none',
          width: 0,
          height: 0,
        },
      },

      [`> ${componentCls}-viewport > ${componentCls}-content`]: {
        minWidth: '100%',
        minHeight: '100%',
        boxSizing: 'border-box',
      },

      [`> ${componentCls}-track`]: {
        position: 'absolute',
        zIndex: token.scrollAreaZIndex,
        borderRadius: token.borderRadiusSM,
        opacity: 0,
        pointerEvents: 'none',
        transition: `opacity ${token.motionDurationMid} ${token.motionEaseInOut}`,
      },

      [`> ${componentCls}-track > ${componentCls}-thumb`]: {
        position: 'absolute',
        borderRadius: token.borderRadiusLG,
        background: token.scrollAreaThumbBg,
        cursor: 'pointer',
        userSelect: 'none',
        transition: `background ${token.motionDurationMid} ${token.motionEaseInOut}`,

        '&:hover': {
          background: token.scrollAreaThumbHoverBg,
        },
      },

      [`> ${componentCls}-track-horizontal`]: {
        insetInlineStart: trackInset,
        insetInlineEnd: trackInset,
        insetBlockEnd: trackInset,
        height: trackSize,

        [`> ${componentCls}-thumb`]: {
          height: '100%',
        },
      },

      [`> ${componentCls}-track-vertical`]: {
        insetBlockStart: trackInset,
        insetBlockEnd: trackInset,
        insetInlineEnd: trackInset,
        width: trackSize,

        [`> ${componentCls}-thumb`]: {
          width: '100%',
        },
      },

      // always、hover、scrolling 和 dragging 最终都收敛为轨道可见且可交互。
      [`&${componentCls}-scrollbar-always > ${componentCls}-track, &${componentCls}-scrollbar-hover:hover > ${componentCls}-track, &${componentCls}-scrolling > ${componentCls}-track, &${componentCls}-dragging > ${componentCls}-track`]:
        {
          opacity: 1,
          pointerEvents: 'auto',
        },

      [`&${componentCls}-vertical > ${componentCls}-viewport`]: {
        overflowX: 'hidden',
        overflowY: 'auto',
      },

      [`&${componentCls}-horizontal > ${componentCls}-viewport`]: {
        overflowX: 'auto',
        overflowY: 'hidden',
      },

      [`&${componentCls}-both > ${componentCls}-viewport`]: {
        overflow: 'auto',
      },
    },
  }
}

/**
 * 使用 antd 根入口暴露的 useToken 获取最终 GlobalToken。
 * antd 会把 theme.components.ScrollArea 保留在 token.ScrollArea 中，
 * 因此这里可以在不依赖 antd/es DesignTokenContext 的情况下消费自定义组件 token。
 */
export default function useStyle(prefixCls: string) {
  const { theme, token, hashId } = antdTheme.useToken()
  const componentToken = token.ScrollArea
  const mergedToken: ScrollAreaToken = {
    ...token,
    componentCls: `.${prefixCls}`,
    scrollAreaTrackSize: componentToken?.trackSize ?? token.sizeXS,
    scrollAreaThumbBg: componentToken?.thumbBg ?? token.colorTextQuaternary,
    scrollAreaThumbHoverBg: componentToken?.thumbHoverBg ?? token.colorTextTertiary,
    scrollAreaZIndex: componentToken?.zIndex ?? token.zIndexBase + 1,
  }

  useStyleRegister(
    {
      theme,
      token,
      hashId,
      path: ['zby-ui', 'scroll-area', prefixCls],
    },
    () => genBaseStyle(mergedToken),
  )

  // 与 antd genStyleHooks 的返回形态保持一致，便于组件继续统一拼接 hashId/cssVarCls。
  return [hashId, ''] as const
}
