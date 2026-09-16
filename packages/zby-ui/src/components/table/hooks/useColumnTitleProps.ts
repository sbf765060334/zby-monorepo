import React from 'react'

import type { AnyObject } from 'antd/es/_util/type'
import type { ColumnTitleProps, FilterValue } from '../interface'

const getMergedFilters = (filters: Record<string, FilterValue | null>) => {
  const mergedFilters: Record<string, FilterValue> = {}
  for (const [key, value] of Object.entries(filters)) {
    if (value != null) {
      mergedFilters[key] = value
    }
  }
  return mergedFilters
}

const useColumnTitleProps = <RecordType extends AnyObject = AnyObject>(
  sorterTitleProps: ColumnTitleProps<RecordType>,
  filters: Record<string, FilterValue | null>,
) => {
  const columnTitleProps = React.useMemo<ColumnTitleProps<RecordType>>(() => {
    return {
      ...sorterTitleProps,
      filters: getMergedFilters(filters),
    }
  }, [sorterTitleProps, filters])
  return columnTitleProps
}

export default useColumnTitleProps
