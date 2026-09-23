export type ColumnReorderRejection = 'unfixedBeforeLeftFixed' | 'unfixedAfterRightFixed'

type ColumnPin = 'left' | 'right' | null | undefined

export function getColumnReorderRejection(
  activeKey: string,
  overKey: string,
  items: readonly { key: string; pin?: ColumnPin }[],
): ColumnReorderRejection | null {
  if (activeKey === overKey) return null

  const active = items.find((item) => item.key === activeKey)
  const over = items.find((item) => item.key === overKey)
  if (!active || !over || active.pin) return null
  if (over.pin === 'left') return 'unfixedBeforeLeftFixed'
  if (over.pin === 'right') return 'unfixedAfterRightFixed'
  return null
}
