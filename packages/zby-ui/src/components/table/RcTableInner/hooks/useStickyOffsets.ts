import { useMemo } from 'react';
import type { ColumnType, StickyOffsets } from '../interface';

/**
 * Get sticky column offset width
 */
export function getStickyOffsets<RecordType>(
  colWidths: readonly number[],
  flattenColumns: readonly ColumnType<RecordType>[],
): StickyOffsets {
  const columnCount = flattenColumns.length;

  const getOffsets = (startIndex: number, endIndex: number, offset: number) => {
    const offsets: number[] = [];
    let total = 0;

    for (let i = startIndex; i !== endIndex; i += offset) {
      offsets.push(total);

      if (flattenColumns[i].fixed) {
        total += colWidths[i] || 0;
      }
    }

    return offsets;
  };

  const startOffsets = getOffsets(0, columnCount, 1);
  const endOffsets = getOffsets(columnCount - 1, -1, -1).reverse();

  return {
    start: startOffsets,
    end: endOffsets,
    widths: colWidths as number[],
  };
}

function useStickyOffsets<RecordType>(
  colWidths: number[],
  flattenColumns: readonly ColumnType<RecordType>[],
) {
  return useMemo(
    () => getStickyOffsets(colWidths, flattenColumns),
    [colWidths, flattenColumns],
  );
}

export default useStickyOffsets;
