import { isEqual } from '@rc-component/util'

import type {
  ProViewManagementCreateValidationPayload,
  ProViewManagementRenameValidationPayload,
  ProViewManagementView,
} from './interface'

export const DEFAULT_PREFIX_CLS = 'pro-view-management'

export function orderViews<TSnapshot>(
  views: ProViewManagementView<TSnapshot>[],
) {
  return views
    .slice()
    .sort(
      (left, right) =>
        left.order - right.order || left.name.localeCompare(right.name),
    )
}

export function normalizeSystemViews<TSnapshot>(
  views: ProViewManagementView<TSnapshot>[],
) {
  return orderViews(
    views.map((view, index) => ({
      ...view,
      scope: 'system' as const,
      order: typeof view.order === 'number' ? view.order : index,
    })),
  )
}

export function normalizeCustomViews<TSnapshot>(
  views: ProViewManagementView<TSnapshot>[],
) {
  return orderViews(
    views
      .filter((view) => view.scope === 'custom')
      .map((view, index) => ({
        ...view,
        scope: 'custom' as const,
        order: typeof view.order === 'number' ? view.order : index,
      })),
  ).map((view, index) => ({
    ...view,
    order: index,
  }))
}

export function getFirstView<TSnapshot>(
  systemViews: ProViewManagementView<TSnapshot>[],
  customViews: ProViewManagementView<TSnapshot>[],
) {
  return systemViews[0] ?? customViews[0] ?? null
}

export function resolveActiveView<TSnapshot>(
  activeViewId: string | null,
  systemViews: ProViewManagementView<TSnapshot>[],
  customViews: ProViewManagementView<TSnapshot>[],
) {
  return (
    systemViews.find((view) => view.id === activeViewId) ??
    customViews.find((view) => view.id === activeViewId) ??
    getFirstView(systemViews, customViews)
  )
}

export function buildViewId() {
  return `view_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function resolveDirty<TSnapshot>(
  dirty: boolean | undefined,
  activeView: ProViewManagementView<TSnapshot> | null,
  currentSnapshot: TSnapshot,
  isSnapshotEqual?: (left: TSnapshot, right: TSnapshot) => boolean,
) {
  if (typeof dirty === 'boolean') {
    return dirty
  }

  if (!activeView) {
    return false
  }

  return !(isSnapshotEqual ?? isEqual)(activeView.snapshot, currentSnapshot)
}

export type ViewNameValidationMessages = {
  required: string
  duplicated: string
  maxCustomViews: (count: number) => string
}

export function validateCreateViewName<TSnapshot>(
  {
    customViews,
    maxCustomViews,
    name,
    systemViews,
  }: ProViewManagementCreateValidationPayload<TSnapshot>,
  messages: ViewNameValidationMessages,
) {
  const trimmedName = name.trim()

  if (!trimmedName) {
    return messages.required
  }

  if (
    typeof maxCustomViews === 'number' &&
    customViews.length >= maxCustomViews
  ) {
    return messages.maxCustomViews(maxCustomViews)
  }

  const duplicated = systemViews
    .concat(customViews)
    .some((view) => view.name === trimmedName)

  return duplicated ? messages.duplicated : undefined
}

export function validateRenameViewName<TSnapshot>(
  {
    customViews,
    name,
    systemViews,
    viewId,
  }: ProViewManagementRenameValidationPayload<TSnapshot>,
  messages: ViewNameValidationMessages,
) {
  const trimmedName = name.trim()

  if (!trimmedName) {
    return messages.required
  }

  const duplicated = systemViews
    .concat(customViews)
    .some((view) => view.id !== viewId && view.name === trimmedName)

  return duplicated ? messages.duplicated : undefined
}
