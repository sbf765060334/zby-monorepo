import { memo, useCallback, useMemo } from 'react'

import { shallow, useControllerSelector } from '../../hooks'
import type { ProTableController, ProTableFilter, ProTableQueryRecord } from '../../interface'
import { collectActiveSearchTagItems, type ActiveSearchTagItem } from '../../utils'
import { SearchTags } from './SearchTags'

type SearchTagsMountProps<RecordType, Query extends ProTableQueryRecord, Summary> = {
  controller: ProTableController<RecordType, Query, Summary>
  filters: ProTableFilter<Query>[]
  prefixCls: string
}

function SearchTagsMountInner<RecordType, Query extends ProTableQueryRecord, Summary>({
  controller,
  filters,
  prefixCls,
}: SearchTagsMountProps<RecordType, Query, Summary>) {
  const searchSnapshotState = useControllerSelector(
    controller,
    (state) => ({
      defaultQuery: state.defaultQuery,
      query: state.query,
    }),
    shallow,
  )
  const activeSearchTags = useMemo(
    () =>
      collectActiveSearchTagItems(
        filters,
        searchSnapshotState.query,
        searchSnapshotState.defaultQuery,
      ),
    [filters, searchSnapshotState.defaultQuery, searchSnapshotState.query],
  )
  const handleCloseTag = useCallback(
    (item: ActiveSearchTagItem) => {
      controller.setQueryField(
        item.key as Extract<keyof Query, string>,
        item.nextValue as Query[Extract<keyof Query, string>] | undefined,
      )
    },
    [controller],
  )

  return <SearchTags onCloseTag={handleCloseTag} prefixCls={prefixCls} tags={activeSearchTags} />
}

const MemoSearchTagsMount = memo(SearchTagsMountInner) as typeof SearchTagsMountInner & {
  displayName?: string
}

MemoSearchTagsMount.displayName = 'ProTableSearchTagsMount'

export const SearchTagsMount = MemoSearchTagsMount
