import type { ColumnType, ColumnsType, ColumnResizeWidths } from '../interface';
import { INTERNAL_COLUMN_RESIZE_FILLER } from '../interface';
import { getCellFixedInfo } from '../utils/fixUtil';
import { getStickyOffsets } from './useStickyOffsets';

export interface ColumnResizeDragLayout<RecordType = any> {
  columns: ColumnsType<RecordType>;
  flattenColumns: readonly ColumnType<RecordType>[];
  widths: ColumnResizeWidths;
  scrollX: number;
  realScrollX: number;
  hasHorizontalOverflow: boolean;
  colWidths: number[];
  structureKey: string;
  expandedStickyStart: number;
}

export interface ColumnResizeDragStore<RecordType = any> {
  current: ColumnResizeDragLayout<RecordType> | null;
  listeners: Set<() => void>;
}

export function createColumnResizeDragStore<RecordType>(): ColumnResizeDragStore<RecordType> {
  return {
    current: null,
    listeners: new Set(),
  };
}

export function getColumnResizeStructureKey<RecordType>(
  flattenColumns: readonly ColumnType<RecordType>[],
) {
  const fillerIndex = flattenColumns.findIndex(column => column[INTERNAL_COLUMN_RESIZE_FILLER]);
  return `${flattenColumns.length}:${fillerIndex}`;
}

export function publishColumnResizeDrag<RecordType>(
  store: ColumnResizeDragStore<RecordType>,
  layout: ColumnResizeDragLayout<RecordType> | null,
) {
  store.current = layout;
  store.listeners.forEach(listener => listener());
}

function isOwnedByTable(element: Element, root: HTMLElement, prefixCls: string) {
  return element.closest(`.${prefixCls}`) === root;
}

function layoutTables(root: HTMLElement, prefixCls: string) {
  const selector = ['header', 'body', 'content', 'summary']
    .map(part => `.${prefixCls}-${part} > table`)
    .join(', ');

  return Array.from(root.querySelectorAll<HTMLTableElement>(selector)).filter(table =>
    isOwnedByTable(table, root, prefixCls),
  );
}

function applyFixedCellOffsets(
  row: Element,
  prefixCls: string,
  flattenColumns: readonly ColumnType<any>[],
  colWidths: readonly number[],
  scrollbarSize = 0,
) {
  const cells = Array.from(row.children).filter(child =>
    child.classList.contains(`${prefixCls}-cell`),
  );
  if (cells.length === 0) {
    return;
  }

  const stickyOffsets = getStickyOffsets(colWidths, flattenColumns);
  const offsets = scrollbarSize
    ? {
        ...stickyOffsets,
        end: stickyOffsets.end.map(offset => offset + scrollbarSize),
      }
    : stickyOffsets;
  let colIndex = 0;
  cells.forEach(cell => {
    const colSpan = Number(cell.getAttribute('colspan') || 1);
    const colEnd = colIndex + colSpan - 1;
    if (colIndex < flattenColumns.length && colEnd < flattenColumns.length) {
      const fixedInfo = getCellFixedInfo(colIndex, colEnd, flattenColumns, offsets);
      const element = cell as HTMLElement;
      if (typeof fixedInfo.fixStart === 'number') {
        element.style.insetInlineStart = `${fixedInfo.fixStart}px`;
      }
      if (typeof fixedInfo.fixEnd === 'number') {
        element.style.insetInlineEnd = `${fixedInfo.fixEnd}px`;
      }
    }
    colIndex += colSpan;
  });
}

function applyVirtualCellWidths(row: Element, prefixCls: string, colWidths: readonly number[]) {
  const cells = Array.from(row.children).filter(child =>
    child.classList.contains(`${prefixCls}-cell`),
  );
  cells.forEach((cell, index) => {
    const colSpan = Number(cell.getAttribute('colspan') || 1);
    if (colSpan !== 1 || colWidths[index] === undefined) {
      return;
    }
    const element = cell as HTMLElement;
    const width = `${colWidths[index]}px`;
    element.style.width = width;
    element.style.flex = `0 0 ${width}`;
  });
}

export function applyColumnResizeDragLayout<RecordType>(
  root: HTMLElement | null | undefined,
  layout: ColumnResizeDragLayout<RecordType>,
  prefixCls: string,
) {
  if (!root) {
    return;
  }

  const { colWidths, scrollX, hasHorizontalOverflow, flattenColumns, expandedStickyStart } = layout;
  const widthText = `${scrollX}px`;

  layoutTables(root, prefixCls).forEach(table => {
    const cols = table.querySelectorAll(':scope > colgroup > col');
    const hasScrollbarColumn = cols.length === colWidths.length + 1;
    if (cols.length !== colWidths.length && !hasScrollbarColumn) {
      return;
    }

    colWidths.forEach((width, index) => {
      (cols[index] as HTMLElement).style.width = `${width}px`;
    });
    if (table.style.width) {
      table.style.width = widthText;
    }

    const scrollbarSize = hasScrollbarColumn
      ? Number.parseFloat((cols[cols.length - 1] as HTMLElement).style.width) || 0
      : 0;
    table.querySelectorAll('tr').forEach(row => {
      if (row.closest('table') !== table || row.classList.contains(`${prefixCls}-expanded-row`)) {
        return;
      }
      applyFixedCellOffsets(row, prefixCls, flattenColumns, colWidths, scrollbarSize);
    });
  });

  root.classList.toggle(`${prefixCls}-scroll-horizontal`, hasHorizontalOverflow);
  root.classList.toggle(`${prefixCls}-fix-start-shadow`, hasHorizontalOverflow);
  root.classList.toggle(`${prefixCls}-fix-end-shadow`, hasHorizontalOverflow);
  if (!hasHorizontalOverflow) {
    root.classList.remove(
      `${prefixCls}-fix-start-shadow-show`,
      `${prefixCls}-fix-end-shadow-show`,
    );
  }

  root.querySelectorAll(`.${prefixCls}-expanded-row-fixed`).forEach(node => {
    if (!isOwnedByTable(node, root, prefixCls)) {
      return;
    }
    const element = node as HTMLElement;
    const currentLeft = Number.parseFloat(element.style.left) || 0;
    const currentWidth = Number.parseFloat(element.style.width);
    if (Number.isFinite(currentWidth)) {
      element.style.width = `${currentWidth + currentLeft - expandedStickyStart}px`;
    }
    element.style.left = `${expandedStickyStart}px`;
  });

  root.querySelectorAll(`.${prefixCls}-tbody-virtual .${prefixCls}-row`).forEach(row => {
    if (!isOwnedByTable(row, root, prefixCls)) {
      return;
    }
    const element = row as HTMLElement;
    element.style.width = widthText;
    applyFixedCellOffsets(row, prefixCls, flattenColumns, colWidths);
    applyVirtualCellWidths(row, prefixCls, colWidths);
  });
}
