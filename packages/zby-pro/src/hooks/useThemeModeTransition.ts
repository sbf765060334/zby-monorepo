import * as React from 'react'
import { flushSync } from 'react-dom'

/**
 * 主题模式枚举。
 * - `light`：亮色主题
 * - `dark`：暗色主题
 */
export type ZbyThemeMode = 'light' | 'dark'

/**
 * 圆形扩散动画的圆心坐标。
 * 坐标系为浏览器视口（viewport），原点在左上角，单位为 CSS 像素。
 * 通常来自 PointerEvent.clientX / clientY。
 */
export type ZbyThemeTransitionOrigin = {
  x: number
  y: number
}

export type UseThemeModeTransitionOptions = {
  /**
   * 当前生效的主题模式。
   * 用于短路判断：若 nextThemeMode 与 themeMode 相同则不做任何操作。
   */
  themeMode: ZbyThemeMode

  /**
   * 参与 View Transition 的 CSS `view-transition-name` 值。
   *
   * 必须与页面上某个 DOM 元素（通常是 `<main>` 或根容器）设置的
   * `style={{ viewTransitionName: 'xxx' }}` 保持一致。
   *
   * View Transition API 会为每个具名元素单独生成 old/new 快照层，
   * 本 hook 的 clip-path 圆形动画就作用在该命名层上，而非默认的 root 层。
   */
  viewTransitionName: string

  /**
   * 过渡期间 `::view-transition` 根伪元素的背景色。
   *
   * View Transition 在动画过程中会在旧快照与新快照之间留出间隙，
   * 若此处背景色与页面底色不一致，切换瞬间会出现白闪/黑闪。
   * 建议传入当前主题的 layout 背景色，例如 Ant Design 的 `token.colorBgLayout`。
   */
  background: string

  /**
   * 真正更新主题状态的回调。
   *
   * 调用方在此函数内修改 store / context / localStorage 等，
   * 从而触发 React 重新渲染并应用新主题 CSS 变量。
   * 本 hook 不会自行持久化主题，只负责包裹动画逻辑。
   */
  onThemeModeChange: (value: ZbyThemeMode) => void
}

export type UseThemeModeTransitionReturn = {
  /**
   * 记录用户按下切换按钮时的指针坐标，作为后续圆形动画的圆心。
   *
   * 应绑定到主题切换按钮的 `onPointerDown`（而非 onClick），
   * 以便在 click 触发 handleThemeModeChange 之前就已写入坐标。
   *
   * @example
   * <Button onPointerDown={recordThemeSwitchPoint} onClick={() => handleThemeModeChange('dark')}>
   */
  recordThemeSwitchPoint: React.PointerEventHandler<HTMLElement>

  /**
   * 带圆形扩散 View Transition 的主题切换入口。
   *
   * - 环境支持且用户未禁用动效：执行圆形 clip-path 过渡动画
   * - 否则：直接调用 onThemeModeChange，无动画降级
   */
  handleThemeModeChange: (nextThemeMode: ZbyThemeMode) => void
}

/**
 * View Transition API（document.startViewTransition）返回对象的精简类型。
 *
 * - `ready`：浏览器已完成旧/新 DOM 快照的捕获，可以开始自定义动画
 * - `finished`：整个过渡（含自定义动画）全部结束
 */
type ViewTransitionLike = {
  ready: Promise<void>
  finished: Promise<void>
}

/**
 * 扩展标准 Document 类型，声明可选的 startViewTransition 方法。
 *
 * 该 API 目前并非所有浏览器都支持（Chrome 111+、Edge 111+ 等），
 * TypeScript 内置 lib 可能尚未包含，故在此手动声明并在运行时检测。
 */
type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => ViewTransitionLike
}

/**
 * 基于浏览器 View Transition API 实现主题切换时的圆形扩散（ripple）动画。
 *
 * ## 原理概述
 *
 * 1. 调用 `document.startViewTransition(callback)` 后，浏览器会先对当前 DOM 拍「旧快照」
 * 2. 执行 callback 更新 DOM（此处通过 flushSync 同步更新 React 树）
 * 3. 浏览器再对更新后的 DOM 拍「新快照」
 * 4. 在 ready 阶段，对指定 view-transition-name 的 old/new 伪元素
 *    施加 clip-path 从圆心向外（或向内）的圆形遮罩动画
 * 5. 动画结束后清理临时注入的 style 标签
 *
 * ## 调用方接入步骤
 *
 * 1. 在需要参与过渡的容器上设置 `viewTransitionName`（与 viewTransitionName 参数一致）
 * 2. 将 `recordThemeSwitchPoint` 绑定到切换按钮的 `onPointerDown`
 * 3. 在按钮 click 时调用 `handleThemeModeChange(nextMode)`
 * 4. `background` 传入与页面底色一致的色值，避免过渡间隙闪烁
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
 */
export function useThemeModeTransition({
  themeMode,
  viewTransitionName,
  background,
  onThemeModeChange,
}: UseThemeModeTransitionOptions): UseThemeModeTransitionReturn {
  /**
   * 缓存用户点击位置。
   * 使用 ref 而非 state，避免坐标变化触发不必要的重渲染。
   * 若用户未通过 recordThemeSwitchPoint 记录（例如键盘触发切换），
   * handleThemeModeChange 会 fallback 到视口中心 (innerWidth/2, innerHeight/2)。
   */
  const themeSwitchPointRef = React.useRef<ZbyThemeTransitionOrigin | null>(null)

  const recordThemeSwitchPoint = React.useCallback<React.PointerEventHandler<HTMLElement>>(
    (event) => {
      themeSwitchPointRef.current = { x: event.clientX, y: event.clientY }
    },
    [],
  )

  const handleThemeModeChange = React.useCallback(
    (nextThemeMode: ZbyThemeMode) => {
      // ── 1. 短路：目标模式与当前相同，无需切换 ──
      if (nextThemeMode === themeMode) {
        return
      }

      // ── 2. SSR / 预渲染环境：无 document/window，无法使用 View Transition ──
      if (typeof document === 'undefined' || typeof window === 'undefined') {
        onThemeModeChange(nextThemeMode)
        return
      }

      const viewTransitionDocument = document as ViewTransitionDocument

      // ── 3. 降级条件 ──
      // a) 浏览器不支持 startViewTransition
      // b) 用户在系统设置中开启了 prefers-reduced-motion: reduce（无障碍要求）
      if (
        !viewTransitionDocument.startViewTransition ||
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ) {
        onThemeModeChange(nextThemeMode)
        return
      }

      // ── 4. 计算圆形 clip-path 动画参数 ──

      // 圆心：优先使用用户点击坐标，否则取视口几何中心
      const { x, y } = themeSwitchPointRef.current ?? {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      }

      // 终点半径：圆心到视口四个角中最远点的距离，确保圆能完全覆盖整个屏幕
      // Math.max(x, innerWidth - x) 得到圆心到左右边缘的较大水平距离
      // Math.max(y, innerHeight - y) 得到圆心到上下边缘的较大垂直距离
      // Math.hypot 计算该矩形的对角线长度，即覆盖全屏所需最小半径
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      )

      // clip-path 关键帧：从半径 0 的圆 → 半径 endRadius 的圆，圆心固定在 (x, y)
      const clipPath = [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`]

      // 区分切换方向，决定动画施加在哪一层快照以及 z-index 叠放顺序
      const enteringDark = nextThemeMode === 'dark'

      // ── 5. 动态注入 View Transition 伪元素样式 ──
      // 必须在 startViewTransition 之前插入，以便浏览器在捕获快照时即应用这些规则。
      // 过渡结束后通过 styleElement.remove() 清理，避免污染全局样式。
      //
      // 注入的 CSS 规则说明：
      //
      // ::view-transition
      //   过渡根容器背景色，填充 old/new 快照之间的空白区域，防止闪屏。
      //
      // ::view-transition-group(root) { z-index: 0 }
      //   默认 root 组（整页快照）置于底层，不参与圆形动画的可见层叠。
      //
      // ::view-transition-group(${viewTransitionName}) { z-index: 1 }
      //   具名组（页面主容器）置于 root 之上，clip-path 动画作用于此组。
      //
      // ::view-transition-image-pair { isolation: isolate }
      //   为 root 与具名组的 image-pair 创建独立堆叠上下文，
      //   防止 mix-blend-mode 等属性在多层快照间产生意外混合。
      //
      // ::view-transition-old/new { animation: none; mix-blend-mode: normal }
      //   禁用浏览器对 View Transition 伪元素的默认 cross-fade 动画，
      //   改由下方 Web Animations API 的 clip-path 完全接管视觉效果。
      //
      // ::view-transition-old/new(${viewTransitionName}) { z-index }
      //   根据切换方向动态调整 old/new 层的叠放顺序：
      //   - 进入暗色：new 在上（999），圆形扩散的暗色新快照可见
      //   - 进入亮色：old 在上（999），圆形收缩的暗色旧快照可见
      const styleElement = document.createElement('style')
      styleElement.textContent = `
        ::view-transition {
          background: ${background};
        }

        ::view-transition-group(root) {
          z-index: 0;
        }

        ::view-transition-group(${viewTransitionName}) {
          z-index: 1;
        }

        ::view-transition-image-pair(root),
        ::view-transition-image-pair(${viewTransitionName}) {
          isolation: isolate;
        }

        ::view-transition-old(root),
        ::view-transition-new(root),
        ::view-transition-old(${viewTransitionName}),
        ::view-transition-new(${viewTransitionName}) {
          animation: none;
          mix-blend-mode: normal;
        }

        ::view-transition-old(${viewTransitionName}) {
          z-index: ${enteringDark ? 1 : 999};
        }

        ::view-transition-new(${viewTransitionName}) {
          z-index: ${enteringDark ? 999 : 1};
        }
      `
      document.head.appendChild(styleElement)

      let themeTransitionAnimation: Animation | undefined
      let transition: ViewTransitionLike

      try {
        // ── 6. 启动 View Transition ──
        //
        // startViewTransition 的 callback 内必须同步完成 DOM 变更，
        // 否则浏览器可能在 callback 返回时 DOM 尚未更新，导致新旧快照相同。
        //
        // React 18 默认批处理更新是异步的，因此使用 flushSync 强制同步提交：
        // flushSync 会立即执行 onThemeModeChange → React setState → DOM 更新，
        // 确保浏览器在 callback 结束时能捕获到正确的新快照。
        transition = viewTransitionDocument.startViewTransition(() => {
          flushSync(() => onThemeModeChange(nextThemeMode))
        })
      } catch {
        // startViewTransition 可能因跨文档导航、重复调用等原因抛错，降级为直接切换
        styleElement.remove()
        onThemeModeChange(nextThemeMode)
        return
      }

      // ── 7. ready：快照已就绪，开始自定义 clip-path 动画 ──
      //
      // 使用 Web Animations API（document.documentElement.animate）而非 CSS @keyframes，
      // 因为需要动态圆心坐标，且目标伪元素为 View Transition 生成的
      // ::view-transition-old(name) / ::view-transition-new(name)。
      //
      // 动画方向：
      // - 进入暗色（enteringDark=true）：对新快照 (::view-transition-new) 做 0→全屏 圆形扩散，
      //   暗色从点击处向外「覆盖」亮色
      // - 进入亮色（enteringDark=false）：对旧快照 (::view-transition-old) 做 全屏→0 圆形收缩，
      //   暗色从外向内「褪去」露出亮色
      //
      // 上方注入的 z-index 规则配合此逻辑：
      // - 进入暗色时 new 层 z-index:999 在上，扩散的新暗色可见
      // - 进入亮色时 old 层 z-index:999 在上，收缩的旧暗色可见
      void transition.ready
        .then(() => {
          themeTransitionAnimation = document.documentElement.animate(
            {
              clipPath: enteringDark ? clipPath : [...clipPath].reverse(),
            },
            {
              duration: 520,
              easing: 'cubic-bezier(0.4, 0, 0.2, 1)', // Material Design 标准缓动曲线
              fill: 'forwards', // 动画结束后保持最终帧，避免回弹
              pseudoElement: `::view-transition-${enteringDark ? 'new' : 'old'}(${viewTransitionName})`,
            } as KeyframeAnimationOptions,
          )
        })
        .catch(() => undefined)

      // ── 8. finished：过渡结束，清理资源 ──
      //
      // - cancel() 释放 Web Animation 占用的资源
      // - remove() 移除临时 style 标签，防止多次切换后 head 中 style 堆积
      // 使用 finally 确保无论过渡成功或中断都会执行清理
      void transition.finished
        .finally(() => {
          themeTransitionAnimation?.cancel()
          styleElement.remove()
        })
        .catch(() => undefined)
    },
    [background, onThemeModeChange, themeMode, viewTransitionName],
  )

  return {
    recordThemeSwitchPoint,
    handleThemeModeChange,
  }
}
