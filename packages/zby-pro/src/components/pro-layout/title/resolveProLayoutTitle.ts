/**
 * 文件职责：定义 ProLayout 这一侧「标题描述符长什么样、怎么翻译、怎么比较」。
 *
 * router-core 对 title 完全不透明，所以形状和解释规则都由本文件决定。业务想换成
 * 别的约定时，只要自行提供 RouterTitleProvider 和 isSameTitle 即可，不必改 core。
 */
import type { IntlShape } from '@zby/intl'
import type { RouterTitle } from '@zby/router-core'
import type { ProLayoutTitleDescriptor } from '../types'

/** 只认带 string 类型 key 的对象，避免把普通业务元数据误当成描述符。 */
function isTitleDescriptor(title: RouterTitle): title is ProLayoutTitleDescriptor {
  return typeof title === 'object' &&
    title !== null &&
    typeof (title as ProLayoutTitleDescriptor).key === 'string'
}

/**
 * 把标题描述符解释成当前语言的纯文本。
 *
 * 字符串直接当作语言包 key；`intl.getMessage` 在缺失该 key 时会返回 key 本身，
 * 因此漏配文案只会显示成 `app.menu.dashboard`，不会变成空白。
 */
export function resolveProLayoutTitle(intl: IntlShape, title: RouterTitle): string {
  if (typeof title === 'string')
    return intl.getMessage(title)

  if (isTitleDescriptor(title))
    return intl.getMessage(title.key, title.defaultMessage, title.values)

  // 既不是 key 也不是描述符时不猜测语义，交回空串由调用处决定怎么兜底。
  return ''
}

/**
 * 判断两个标题描述符是否等价，供 `createRouterCore` 的 `isSameTitle` 使用。
 *
 * 对象描述符通常是调用处每次新建的字面量，只比引用会让 `setTabLabel` 每次都发布
 * 新状态并触发整条页签栏重渲染。`values` 只做一层浅比较，Date 等引用类型的值需要
 * 调用方自己保持稳定引用。
 */
export function isSameProLayoutTitle(left: RouterTitle, right: RouterTitle): boolean {
  if (Object.is(left, right))
    return true

  if (!isTitleDescriptor(left) || !isTitleDescriptor(right))
    return false

  return left.key === right.key &&
    left.defaultMessage === right.defaultMessage &&
    isSameValues(left.values, right.values)
}

function isSameValues(
  left: ProLayoutTitleDescriptor['values'],
  right: ProLayoutTitleDescriptor['values'],
) {
  if (Object.is(left, right))
    return true
  if (!left || !right)
    return false

  const leftKeys = Object.keys(left)
  return leftKeys.length === Object.keys(right).length &&
    leftKeys.every((key) => Object.is(left[key], right[key]))
}
