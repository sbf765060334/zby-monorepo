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
 * 可以来自 PointerEvent.clientX / clientY，也可以由触发元素的几何中心计算得到。
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
   * 显式传入 origin 时优先使用该坐标；否则使用 recordThemeSwitchPoint 最近记录的
   * 指针位置，二者都不存在时回退到视口中心。
   *
   * - 环境支持且用户未禁用动效：执行圆形 clip-path 过渡动画
   * - 否则：直接调用 onThemeModeChange，无动画降级
   */
  handleThemeModeChange: (
    nextThemeMode: ZbyThemeMode,
    origin?: ZbyThemeTransitionOrigin,
  ) => void
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

let transitionAnimationId = 0

/**
 * 基于浏览器 View Transition API 实现主题切换时的圆形扩散（ripple）动画。
 *
 * ## 原理概述
 *
 * 1. 调用 `document.startViewTransition(callback)` 后，浏览器会先对当前 DOM 拍「旧快照」
 * 2. 执行 callback 更新 DOM（此处通过 flushSync 同步更新 React 树）
 * 3. 浏览器再对更新后的 DOM 拍「新快照」
 * 4. 对指定 view-transition-name 的 old/new 伪元素
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
    (
      nextThemeMode: ZbyThemeMode,
      origin?: ZbyThemeTransitionOrigin,
    ) => {
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

      // 先按视口坐标确定圆心，再转换到具名过渡元素自身的局部坐标。
      const viewportOrigin = origin ?? themeSwitchPointRef.current ?? {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      }
      const transitionTarget = findViewTransitionTarget(viewTransitionName)
      const transitionTargetRect = transitionTarget?.getBoundingClientRect()
      const targetLeft = transitionTargetRect?.left ?? 0
      const targetTop = transitionTargetRect?.top ?? 0
      const targetWidth = transitionTargetRect?.width || window.innerWidth
      const targetHeight = transitionTargetRect?.height || window.innerHeight

      // View Transition 快照层在 Chromium 中按设备像素绘制，而 getBoundingClientRect
      // 返回的是 CSS 像素。将局部坐标和目标尺寸统一转换到快照层坐标系，避免高 DPR
      // 屏幕上圆心相对触发按钮向左上偏移（例如 DPR=1.5 时偏移约 1.5 倍）。
      const pixelRatio = window.devicePixelRatio || 1
      const x = (viewportOrigin.x - targetLeft) * pixelRatio
      const y = (viewportOrigin.y - targetTop) * pixelRatio
      const snapshotWidth = targetWidth * pixelRatio
      const snapshotHeight = targetHeight * pixelRatio

      // 终点半径：圆心到具名过渡元素四个角中最远点的距离，确保能覆盖整个目标区域。
      // Math.max(x, snapshotWidth - x) 得到圆心到左右边缘的较大水平距离
      // Math.max(y, snapshotHeight - y) 得到圆心到上下边缘的较大垂直距离
      // Math.hypot 计算该矩形的对角线长度，即覆盖全屏所需最小半径
      const endRadius = Math.hypot(
        Math.max(x, snapshotWidth - x),
        Math.max(y, snapshotHeight - y),
      )

      // clip-path 关键帧：从半径 0 的圆 → 半径 endRadius 的圆，圆心固定在目标元素内的 (x, y)
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
      //   改由下方 CSS @keyframes 的 clip-path 完全接管视觉效果。
      //
      // ::view-transition-old/new(${viewTransitionName}) { z-index }
      //   根据切换方向动态调整 old/new 层的叠放顺序：
      //   - 进入暗色：new 在上（999），圆形扩散的暗色新快照可见
      //   - 进入亮色：old 在上（999），圆形收缩的暗色旧快照可见
      //
      // 采用 CSS @keyframes 驱动 clip-path，而不是依赖 Web Animations API 的
      // pseudoElement 选项。后者在部分支持 View Transition 的浏览器/运行环境中
      // 不稳定，会导致默认动画被关闭后主题瞬间切换。
      const animationName = `zby-theme-transition-${enteringDark ? 'reveal' : 'hide'}-${++transitionAnimationId}`
      const animationClipPath = enteringDark ? clipPath : [...clipPath].reverse()
      const animatedTarget = enteringDark
        ? `::view-transition-new(${viewTransitionName})`
        : `::view-transition-old(${viewTransitionName})`
      const styleElement = document.createElement('style')
      styleElement.textContent = `
        @keyframes ${animationName} {
          from {
            clip-path: ${animationClipPath[0]};
          }
          to {
            clip-path: ${animationClipPath[1]};
          }
        }

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

        ${animatedTarget} {
          animation: ${animationName} 520ms cubic-bezier(0.4, 0, 0.2, 1) both;
        }
      `
      document.head.appendChild(styleElement)

      let transition: ViewTransitionLike

      // startViewTransition 的实现并不一定在调用主题回调前失败：Polyfill、测试桩或非标准实现
      // 可能先执行 callback、完成主题提交，再从 startViewTransition 本身同步抛错。如果 catch
      // 无条件再次调用 onThemeModeChange，同一次用户操作就会重复写入状态、持久化或上报埋点。
      //
      // 用三态而不是简单 boolean 区分异常发生的准确阶段：
      // - idle：主题回调尚未开始，可在 catch 中安全降级为直接提交；
      // - running：异常来自主题回调自身，必须保留原始异常，不能把它当作动画失败重试；
      // - done：主题已经成功提交，仅 View Transition 启动失败，无需再次提交。
      let themeCommitState: 'idle' | 'running' | 'done' = 'idle'
      const commitThemeMode = () => {
        if (themeCommitState !== 'idle') {
          return
        }

        themeCommitState = 'running'
        onThemeModeChange(nextThemeMode)
        themeCommitState = 'done'
      }

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
          flushSync(commitThemeMode)
        })
      } catch (error) {
        // 无论失败发生在哪个阶段，动画都不会继续，先移除为本次过渡注入的临时样式。
        styleElement.remove()

        if (themeCommitState === 'idle') {
          // 浏览器在执行更新回调前就拒绝启动 View Transition，安全降级为无动画切换。
          commitThemeMode()
          return
        }

        if (themeCommitState === 'running') {
          // 主题业务回调自身抛错。重试既可能重复副作用，也可能掩盖第一次异常，故原样透传。
          throw error
        }

        // 主题已经成功更新，只是 startViewTransition 随后抛错；保留新主题且不重复提交。
        return
      }

      // ── 7. finished：过渡结束，清理资源 ──
      //
      // - remove() 移除临时 style 标签，防止多次切换后 head 中 style 堆积
      // 使用 finally 确保无论过渡成功或中断都会执行清理
      void transition.finished
        .finally(() => {
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

/** 查找声明了指定 view-transition-name 的元素，用于把视口坐标转换为局部坐标。 */
function findViewTransitionTarget(viewTransitionName: string): HTMLElement | undefined {
  const matchesViewTransitionName = (element: HTMLElement) => {
    const style = element.style as CSSStyleDeclaration & { viewTransitionName?: string }
    return style.getPropertyValue('view-transition-name') === viewTransitionName ||
      style.viewTransitionName === viewTransitionName
  }

  const inlineTarget = Array.from(document.querySelectorAll<HTMLElement>('[style]')).find(
    matchesViewTransitionName,
  )
  if (inlineTarget)
    return inlineTarget

  // CSS-in-JS 或测试环境可能不会把 view-transition-name 暴露在 style 属性上，
  // 此时用计算样式兜底，避免退回视口坐标。
  return Array.from(document.querySelectorAll<HTMLElement>('*')).find((element) => {
    try {
      return getComputedStyle(element).getPropertyValue('view-transition-name') === viewTransitionName
    } catch {
      return false
    }
  })
}
