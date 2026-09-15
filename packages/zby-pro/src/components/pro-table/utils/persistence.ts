export const PRO_TABLE_DEFAULT_VIEW_ID = '__default__'

export function getViewsScopeKey(persistenceKey: string) {
  return `${persistenceKey}:views`
}
