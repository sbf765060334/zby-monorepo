import type {
  ProTableColumnPreference,
  ProTableColumnsState,
  ProTableNewColumnPolicy,
} from '../interface'
import type { ProTableColumnDefinition } from './columns'

function sortByOrder(items: ProTableColumnPreference[]) {
  return items.slice().sort((left, right) => left.order - right.order)
}

export function cloneColumnPreferences(items: ProTableColumnPreference[]) {
  return items.map((item) => ({ ...item }))
}

export function mergeColumnSettingsDraft(
  draft: ProTableColumnPreference[],
  currentPreferences: ProTableColumnPreference[],
) {
  const currentByKey = new Map(currentPreferences.map((item) => [item.key, item]))
  return draft.map((item) => ({
    ...item,
    width: currentByKey.get(item.key)?.width ?? item.width,
  }))
}

export function buildDefaultColumnPreferences(
  definitions: ProTableColumnDefinition[],
): ProTableColumnPreference[] {
  return definitions.map((definition, index) => ({
    key: definition.key,
    visible: definition.defaultPreference?.visible ?? true,
    order: definition.defaultPreference?.order ?? index,
    pin: definition.defaultPreference?.pin ?? null,
    width: definition.defaultPreference?.width,
  }))
}

/**
 * Convert the legacy `columnsState` shape (`{ key: { show: false } }`) to the
 * preference shape used by the view store.  ProTable historically exposed the
 * former API, while view-management persists the latter, so keeping this
 * conversion at the boundary lets both APIs work together.
 */
export function applyLegacyColumnState(
  preferences: ProTableColumnPreference[],
  state?: ProTableColumnsState,
) {
  if (!state) return preferences

  return preferences.map((item) => {
    const legacy = state[item.key]
    if (!legacy) return item

    return {
      ...item,
      visible:
        typeof legacy.visible === 'boolean'
          ? legacy.visible
          : typeof legacy.show === 'boolean'
            ? legacy.show
            : item.visible,
      order: typeof legacy.order === 'number' ? legacy.order : item.order,
      pin: legacy.pin ?? item.pin,
      width: legacy.width ?? item.width,
    }
  })
}

function insertByDefaultOrder(
  defaults: ProTableColumnPreference[],
  current: ProTableColumnPreference[],
) {
  const defaultIndexes = new Map(defaults.map((item, index) => [item.key, index]))
  const next = current.slice()

  defaults.forEach((item) => {
    if (next.some((currentItem) => currentItem.key === item.key)) return

    const defaultIndex = defaultIndexes.get(item.key) ?? Number.MAX_SAFE_INTEGER
    const insertIndex = next.findIndex(
      (currentItem) =>
        (defaultIndexes.get(currentItem.key) ?? Number.MAX_SAFE_INTEGER) >
        defaultIndex,
    )

    if (insertIndex === -1) next.push(item)
    else next.splice(insertIndex, 0, item)
  })

  return next.map((item, index) => ({ ...item, order: index }))
}

export function resolveColumnPreferences(
  definitions: ProTableColumnDefinition[],
  options: {
    current?: ProTableColumnPreference[]
    policy?: ProTableNewColumnPolicy
  },
) {
  const defaults = buildDefaultColumnPreferences(definitions)
  const definitionMap = new Map(definitions.map((item) => [item.key, item]))
  const defaultMap = new Map(defaults.map((item) => [item.key, item]))
  const currentMap = new Map((options.current ?? []).map((item) => [item.key, item]))
  const persisted = sortByOrder(options.current ?? []).filter((item) =>
    definitionMap.has(item.key),
  )
  const persistedKeys = new Set(persisted.map((item) => item.key))
  const newItems = defaults.filter((item) => !persistedKeys.has(item.key))
  const policy = options.policy ?? 'default-order'
  const ordered =
    policy === 'prepend'
      ? newItems.concat(persisted)
      : policy === 'append'
        ? persisted.concat(newItems)
        : persisted.length === 0
          ? defaults
          : insertByDefaultOrder(defaults, persisted)

  return ordered.map((item, index) => {
    const definition = definitionMap.get(item.key)
    const fallback = defaultMap.get(item.key)
    const current = currentMap.get(item.key)
    const capabilities = definition?.capabilities ?? {}

    return {
      key: item.key,
      visible:
        capabilities.visibility === false
          ? (fallback?.visible ?? item.visible)
          : (current?.visible ?? fallback?.visible ?? item.visible),
      order: index,
      pin:
        capabilities.pinning === false
          ? (fallback?.pin ?? item.pin ?? null)
          : (current?.pin ?? fallback?.pin ?? item.pin ?? null),
      width:
        capabilities.resizing === false
          ? undefined
          : (current?.width ?? fallback?.width ?? item.width),
    } satisfies ProTableColumnPreference
  })
}

export function updateColumnPreference(
  items: ProTableColumnPreference[],
  key: string,
  patch: Partial<ProTableColumnPreference>,
) {
  return sortByOrder(items).map((item, index) => ({
    ...item,
    ...(item.key === key ? patch : {}),
    order:
      item.key === key && typeof patch.order === 'number'
        ? patch.order
        : index,
  }))
}

function pinWeight(item: ProTableColumnPreference) {
  return item.pin === 'left' ? 0 : item.pin === 'right' ? 2 : 1
}

function normalizePreferenceOrder(items: ProTableColumnPreference[]) {
  return items.map((item, index) => ({ ...item, order: index }))
}

export function sortVisibleColumnPreferences(items: ProTableColumnPreference[]) {
  return items
    .filter((item) => item.visible)
    .slice()
    .sort((left, right) => {
      const delta = pinWeight(left) - pinWeight(right)
      return delta === 0 ? left.order - right.order : delta
    })
}

export function replaceVisibleColumnOrder(
  items: ProTableColumnPreference[],
  orderedVisibleKeys: string[],
) {
  const orderMap = new Map(orderedVisibleKeys.map((key, index) => [key, index]))
  const visibleCount = orderedVisibleKeys.length

  return normalizePreferenceOrder(
    items
      .map((item) => ({
        ...item,
        order: item.visible ? (orderMap.get(item.key) ?? item.order) : visibleCount + item.order,
      }))
      .sort((left, right) => left.order - right.order),
  )
}

export function moveVisibleColumnToTop(items: ProTableColumnPreference[], key: string) {
  const selected = sortVisibleColumnPreferences(items)
  const leftFixedKeys = selected.filter((item) => item.pin === 'left').map((item) => item.key)
  const rightFixedKeys = selected.filter((item) => item.pin === 'right').map((item) => item.key)
  const restKeys = selected.filter((item) => !item.pin && item.key !== key).map((item) => item.key)
  return replaceVisibleColumnOrder(items, leftFixedKeys.concat(key, restKeys, rightFixedKeys))
}

export function applyVisibleColumnPin(
  items: ProTableColumnPreference[],
  key: string,
  pin: 'left' | 'right' | null,
) {
  const next = updateColumnPreference(items, key, { pin })
  const selected = sortVisibleColumnPreferences(next)
  return replaceVisibleColumnOrder(
    next,
    selected
      .filter((item) => item.pin === 'left')
      .map((item) => item.key)
      .concat(
        selected.filter((item) => !item.pin).map((item) => item.key),
        selected.filter((item) => item.pin === 'right').map((item) => item.key),
      ),
  )
}

export function reorderColumnPreferences(
  items: ProTableColumnPreference[],
  key: string,
  direction: -1 | 1,
) {
  const ordered = sortByOrder(items)
  const index = ordered.findIndex((item) => item.key === key)
  const targetIndex = index + direction

  if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return ordered

  const next = ordered.slice()
  const [active] = next.splice(index, 1)
  next.splice(targetIndex, 0, active)
  return next.map((item, order) => ({ ...item, order }))
}
