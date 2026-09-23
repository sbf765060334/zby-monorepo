import type { Modifier } from '@dnd-kit/core'
import type { Transform } from '@dnd-kit/utilities'

type AxisRect = {
  top: number
  bottom: number
  left: number
  right: number
}

type BoundingRect = {
  top: number
  left: number
  width: number
  height: number
}

export function restrictTransformToRect(
  transform: Transform,
  rect: AxisRect,
  boundingRect: BoundingRect,
): Transform {
  const next = { ...transform }

  if (rect.top + transform.y <= boundingRect.top) {
    next.y = boundingRect.top - rect.top
  } else if (rect.bottom + transform.y >= boundingRect.top + boundingRect.height) {
    next.y = boundingRect.top + boundingRect.height - rect.bottom
  }

  if (rect.left + transform.x <= boundingRect.left) {
    next.x = boundingRect.left - rect.left
  } else if (rect.right + transform.x >= boundingRect.left + boundingRect.width) {
    next.x = boundingRect.left + boundingRect.width - rect.right
  }

  return next
}

/** 把拖动位移限制在最近的滚动容器可视区域内，避免 transform 把滚动高度越撑越长。 */
export const restrictToFirstScrollableAncestor: Modifier = ({
  draggingNodeRect,
  transform,
  scrollableAncestorRects,
}) => {
  const boundingRect = scrollableAncestorRects[0]
  if (!draggingNodeRect || !boundingRect) return transform
  return restrictTransformToRect(transform, draggingNodeRect, boundingRect)
}
