import { useEvent, useLayoutEffect, warning } from '@rc-component/util';
import * as React from 'react';
import type {
  ColumnsType,
  ColumnResizeConfig,
  ColumnResizeInfo,
  ColumnResizeKey,
  ColumnResizeWidths,
  ColumnType,
} from '../interface';
import { INTERNAL_COLUMN_RESIZE_FILLER, INTERNAL_COLUMN_RESIZE_META } from '../interface';
import { INTERNAL_COL_DEFINE } from '../utils/legacyUtil';

const DEFAULT_COLUMN_WIDTH = 160;
const DEFAULT_MIN_WIDTH = 32;
const DEFAULT_EXPAND_WIDTH = 48;
const FILLER_COLUMN_KEY = '__RC_TABLE_COLUMN_RESIZE_FILLER__';
const SYNTHETIC_KEY_PATTERN = /^(?:key(?:-\d+)+|RC_TABLE_KEY(?:_next)*)$/;

function normalizeResizeConfig<RecordType>(
  columnResize: boolean | ColumnResizeConfig<RecordType> | undefined,
): ColumnResizeConfig<RecordType> | null {
  if (!columnResize) {
    return null;
  }

  return columnResize === true ? {} : columnResize;
}

function getFiniteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function parsePixelWidth(value: unknown) {
  const numberValue = getFiniteNumber(value);
  if (numberValue !== undefined) {
    return numberValue;
  }

  if (typeof value === 'string') {
    const matched = value.trim().match(/^(\d+(?:\.\d+)?)px$/);
    if (matched) {
      return Number(matched[1]);
    }
  }

  return undefined;
}

function areMeasuredWidthsEqual(
  left: Record<number, number>,
  right: Record<number, number>,
) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  return leftKeys.length === rightKeys.length && leftKeys.every((key) => left[Number(key)] === right[Number(key)]);
}

function stringifyDataIndex(dataIndex: ColumnType<any>['dataIndex']) {
  if (typeof dataIndex === 'string' || typeof dataIndex === 'number') {
    return String(dataIndex);
  }

  if (
    Array.isArray(dataIndex) &&
    dataIndex.every((item) => typeof item === 'string' || typeof item === 'number')
  ) {
    return dataIndex.join('.');
  }

  return undefined;
}

function getResizeKeyInfo<RecordType>(
  column: ColumnType<RecordType>,
  fallbackKey: React.Key,
): { key: ColumnResizeKey; stable: boolean } {
  const dataIndexKey = stringifyDataIndex(column.dataIndex);
  const columnKey = column.key;

  if (
    dataIndexKey &&
    (columnKey === undefined || columnKey === null || SYNTHETIC_KEY_PATTERN.test(String(columnKey)))
  ) {
    return { key: dataIndexKey, stable: true };
  }

  if (
    (typeof columnKey === 'string' || typeof columnKey === 'number') &&
    !SYNTHETIC_KEY_PATTERN.test(String(columnKey))
  ) {
    return { key: columnKey, stable: true };
  }

  if (dataIndexKey) {
    return { key: dataIndexKey, stable: true };
  }

  const rawKey = fallbackKey;

  return { key: typeof rawKey === 'number' ? rawKey : String(rawKey), stable: false };
}

function getInternalColumnType<RecordType>(column: ColumnType<RecordType>) {
  return (column as Record<string, any>)[INTERNAL_COL_DEFINE]?.columnType as string | undefined;
}

function isSelectionColumn<RecordType>(column: ColumnType<RecordType>) {
  return typeof column.className === 'string' && column.className.includes('-selection-column');
}

function isExpandableColumn<RecordType>(column: ColumnType<RecordType>) {
  return getInternalColumnType(column) === 'EXPAND_COLUMN';
}

function clampWidth(width: number, minWidth?: number, maxWidth?: number) {
  let nextWidth = Math.max(width, minWidth ?? DEFAULT_MIN_WIDTH);

  if (typeof maxWidth === 'number' && Number.isFinite(maxWidth) && maxWidth > 0) {
    nextWidth = Math.min(nextWidth, maxWidth);
  }

  return Math.round(nextWidth);
}

function createWidthSignature(widths: ColumnResizeWidths | undefined) {
  return Object.entries(widths ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, width]) => `${key}:${width}`)
    .join('|');
}

function areWidthsEqual(left: ColumnResizeWidths, right: ColumnResizeWidths) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  return leftKeys.length === rightKeys.length && leftKeys.every((key) => left[key] === right[key]);
}

function mergeDefaultWidths(
  defaultWidths: ColumnResizeWidths | undefined,
  currentWidths: ColumnResizeWidths,
  resizedKeys: Set<string>,
) {
  const nextWidths: ColumnResizeWidths = {};

  Object.entries(defaultWidths ?? {}).forEach(([key, width]) => {
    nextWidths[key] =
      resizedKeys.has(key) && currentWidths[key] !== undefined ? currentWidths[key] : width;
  });

  Object.entries(currentWidths).forEach(([key, width]) => {
    if (resizedKeys.has(key) && nextWidths[key] === undefined) {
      nextWidths[key] = width;
    }
  });

  return areWidthsEqual(currentWidths, nextWidths) ? currentWidths : nextWidths;
}

function isFixedEndColumn<RecordType>(column: ColumnType<RecordType>) {
  return column.fixed === 'end' || column.fixed === 'right';
}

function cloneColumnsWithResizedLeaves<RecordType>(
  columns: ColumnsType<RecordType>,
  flattenColumns: readonly ColumnType<RecordType>[],
  fillerColumn?: ColumnType<RecordType>,
  fillerLeafIndex?: number,
) {
  let leafIndex = 0;
  let fillerInserted = false;

  function cloneColumn(column: ColumnsType<RecordType>[number]): ColumnsType<RecordType>[number] {
    if ('children' in column && column.children?.length) {
      return {
        ...column,
        children: cloneColumns(column.children),
      };
    }

    const resizedColumn = flattenColumns[leafIndex];
    leafIndex += 1;

    return (resizedColumn ?? column) as ColumnsType<RecordType>[number];
  }

  function cloneColumns(sourceColumns: ColumnsType<RecordType>): ColumnsType<RecordType> {
    const clonedColumns: ColumnsType<RecordType>[number][] = [];

    sourceColumns.forEach((column) => {
      if (!('children' in column && column.children?.length)) {
        if (fillerColumn && !fillerInserted && leafIndex === fillerLeafIndex) {
          clonedColumns.push(fillerColumn);
          fillerInserted = true;
        }
      }

      clonedColumns.push(cloneColumn(column));
    });

    return clonedColumns;
  }

  const nextColumns = cloneColumns(columns);

  if (fillerColumn && !fillerInserted) {
    return [...nextColumns, fillerColumn];
  }

  return nextColumns;
}

export function useColumnResize<RecordType>({
  columnResize,
  columns,
  flattenColumns,
  columnsKey,
  viewportWidth,
  measureRootRef,
}: {
  columnResize?: boolean | ColumnResizeConfig<RecordType>;
  columns: ColumnsType<RecordType>;
  flattenColumns: readonly ColumnType<RecordType>[];
  columnsKey: React.Key[];
  viewportWidth?: number;
  measureRootRef?: React.RefObject<HTMLElement | null>;
}) {
  const resizeConfig = normalizeResizeConfig(columnResize);
  const enabled = Boolean(resizeConfig);

  React.useEffect(() => {
    if (!enabled || process.env.NODE_ENV === 'production') {
      return;
    }

    flattenColumns.forEach((column, index) => {
      if (isExpandableColumn(column) || isSelectionColumn(column)) {
        return;
      }

      const { stable } = getResizeKeyInfo(column, columnsKey[index] ?? index);
      if (!stable) {
        warning(
          false,
          'A column without a stable `key` or stringifiable `dataIndex` is not resizable when `columnResize` is enabled.',
        );
      }
    });
  }, [columnsKey, enabled, flattenColumns]);
  const controlledWidths = resizeConfig?.widths;
  const defaultWidths = resizeConfig?.defaultWidths;
  const defaultWidthsSignature = createWidthSignature(defaultWidths);
  const controlledWidthsSignature = createWidthSignature(controlledWidths);
  const measurableWidthsSignature = flattenColumns
    .map((column, index) => {
      const width = column.width;
      return typeof width === 'string' &&
        parsePixelWidth(width) === undefined &&
        (isSelectionColumn(column) || isExpandableColumn(column))
        ? `${index}:${width}`
        : '';
    })
    .join('|');
  const resizedKeysRef = React.useRef<Set<string>>(new Set());
  const pendingResizeEndKeysRef = React.useRef<Set<string>>(new Set());
  const [measuredWidths, setMeasuredWidths] = React.useState<Record<number, number>>({});
  const [innerWidths, setInnerWidths] = React.useState<ColumnResizeWidths>(() =>
    enabled && !controlledWidths ? (defaultWidths ?? {}) : {},
  );

  React.useEffect(() => {
    if (!enabled || controlledWidths) {
      resizedKeysRef.current.clear();
      return;
    }

    setInnerWidths((currentWidths) =>
      mergeDefaultWidths(defaultWidths, currentWidths, resizedKeysRef.current),
    );
  }, [controlledWidths, defaultWidthsSignature, enabled]);

  useLayoutEffect(() => {
    if (!enabled || !measurableWidthsSignature) {
      setMeasuredWidths((current) =>
        Object.keys(current).length ? {} : current,
      );
      return;
    }

    const measureRoot = measureRootRef?.current;
    if (!measureRoot) {
      return;
    }

    const nextMeasuredWidths: Record<number, number> = {};
    flattenColumns.forEach((column, index) => {
      const width = column.width;
      if (
        typeof width !== 'string' ||
        parsePixelWidth(width) !== undefined ||
        (!isSelectionColumn(column) && !isExpandableColumn(column))
      ) {
        return;
      }

      const measureElement = document.createElement('div');
      measureElement.dataset.tableColumnWidthMeasure = '';
      Object.assign(measureElement.style, {
        height: '0',
        overflow: 'hidden',
        position: 'absolute',
        visibility: 'hidden',
        width,
      });
      measureRoot.appendChild(measureElement);
      const measuredWidth = measureElement.getBoundingClientRect().width || measureElement.offsetWidth;
      measureElement.remove();

      if (Number.isFinite(measuredWidth) && measuredWidth > 0) {
        nextMeasuredWidths[index] = measuredWidth;
      }
    });

    setMeasuredWidths((current) =>
      areMeasuredWidthsEqual(current, nextMeasuredWidths) ? current : nextMeasuredWidths,
    );
  }, [enabled, measurableWidthsSignature, measureRootRef, viewportWidth]);

  const sourceWidths = controlledWidths ?? innerWidths;
  const defaultWidth = getFiniteNumber(resizeConfig?.defaultWidth) ?? DEFAULT_COLUMN_WIDTH;
  const globalMinWidth = getFiniteNumber(resizeConfig?.minWidth) ?? DEFAULT_MIN_WIDTH;
  const globalMaxWidth = getFiniteNumber(resizeConfig?.maxWidth);

  const resizeState = React.useMemo(() => {
    if (!enabled) {
      return null;
    }

    const widthMap: ColumnResizeWidths = {};
    let totalWidth = 0;

    const resizedFlattenColumns = flattenColumns.map((column, index) => {
      const { key, stable } = getResizeKeyInfo(column, columnsKey[index] ?? index);
      const isExpand = isExpandableColumn(column);
      const isSelection = isSelectionColumn(column);
      const isSystemColumn = isExpand || isSelection;
      const minWidth = getFiniteNumber(column.minWidth) ?? globalMinWidth;
      const maxWidth = getFiniteNumber(column.maxWidth) ?? globalMaxWidth;
      const rawColumnWidth = parsePixelWidth(column.width) ?? measuredWidths[index];
      const fallbackWidth = isExpand || isSelection ? DEFAULT_EXPAND_WIDTH : defaultWidth;
      const configuredWidth =
        getFiniteNumber(sourceWidths[key]) ??
        getFiniteNumber(defaultWidths?.[key]) ??
        rawColumnWidth ??
        fallbackWidth;
      const width = isSystemColumn
        ? Math.round(configuredWidth)
        : clampWidth(configuredWidth, minWidth, maxWidth);
      const resizable = stable && column.resizable !== false && !isExpand && !isSelection;

      if (
        process.env.NODE_ENV !== 'production' &&
        !isSystemColumn &&
        column.width !== undefined &&
        rawColumnWidth === undefined
      ) {
        warning(
          false,
          '`columns[].width` should be a number or pixel string when `columnResize` is enabled.',
        );
      }

      totalWidth += width;
      widthMap[key] = width;

      return {
        ...column,
        width,
        [INTERNAL_COLUMN_RESIZE_META]: {
          key,
          width,
          minWidth,
          maxWidth,
          resizable,
          source: column,
        },
      } as ColumnType<RecordType>;
    });
    const measuredViewportWidth = getFiniteNumber(viewportWidth);
    const remainingWidth = measuredViewportWidth ? measuredViewportWidth - totalWidth : 0;
    const fillerWidth = remainingWidth > 1 ? Math.round(remainingWidth) : 0;
    const hasHorizontalOverflow = measuredViewportWidth
      ? totalWidth - measuredViewportWidth > 1
      : false;
    const fillerColumn =
      fillerWidth > 0
        ? ({
            key: FILLER_COLUMN_KEY,
            title: null,
            width: fillerWidth,
            minWidth: fillerWidth,
            resizable: false,
            render: () => null,
            [INTERNAL_COLUMN_RESIZE_FILLER]: true,
          } as ColumnType<RecordType>)
        : undefined;
    const fillerLeafIndex = fillerColumn
      ? resizedFlattenColumns.findIndex(isFixedEndColumn)
      : undefined;
    const normalizedFillerLeafIndex =
      typeof fillerLeafIndex === 'number' && fillerLeafIndex >= 0
        ? fillerLeafIndex
        : resizedFlattenColumns.length;
    const flattenColumnsWithFiller = fillerColumn
      ? [
          ...resizedFlattenColumns.slice(0, normalizedFillerLeafIndex),
          fillerColumn,
          ...resizedFlattenColumns.slice(normalizedFillerLeafIndex),
        ]
      : resizedFlattenColumns;
    const layoutWidth = fillerWidth > 0 ? totalWidth + fillerWidth : totalWidth;

    return {
      columns: cloneColumnsWithResizedLeaves(
        columns,
        resizedFlattenColumns,
        fillerColumn,
        normalizedFillerLeafIndex,
      ),
      flattenColumns: flattenColumnsWithFiller,
      widths: widthMap,
      scrollX: layoutWidth,
      realScrollX: totalWidth,
      fillerWidth,
      hasHorizontalOverflow,
      colWidths: flattenColumnsWithFiller.map((column) => column.width as number),
    };
  }, [
    columns,
    columnsKey,
    controlledWidthsSignature,
    defaultWidth,
    defaultWidths,
    defaultWidthsSignature,
    enabled,
    flattenColumns,
    globalMaxWidth,
    globalMinWidth,
    measuredWidths,
    sourceWidths,
    viewportWidth,
  ]);

  const widthsRef = React.useRef<ColumnResizeWidths>({});
  const columnsRef = React.useRef<readonly ColumnType<RecordType>[]>([]);
  const resizeFrameRef = React.useRef<number | null>(null);
  const pendingResizeRef = React.useRef<{
    key: ColumnResizeKey;
    width: number;
    nativeEvent: PointerEvent;
  } | null>(null);

  React.useEffect(() => {
    widthsRef.current = resizeState?.widths ?? {};
    columnsRef.current = resizeState?.flattenColumns ?? flattenColumns;
  }, [flattenColumns, resizeState]);

  const applyWidth = useEvent(
    (key: ColumnResizeKey, width: number, nativeEvent: PointerEvent, triggerResizeEnd: boolean) => {
      const currentWidths = widthsRef.current;
      const currentColumn = columnsRef.current.find(
        (column) => column[INTERNAL_COLUMN_RESIZE_META]?.key === key,
      );
      const resizeMeta = currentColumn?.[INTERNAL_COLUMN_RESIZE_META];

      if (!currentColumn || !resizeMeta) {
        return;
      }

      const previousWidth = currentWidths[key] ?? resizeMeta.width;
      const nextWidth = clampWidth(width, resizeMeta.minWidth, resizeMeta.maxWidth);

      if (nextWidth === previousWidth) {
        // Pointer-up often repeats the last move width after rAF. ProTable
        // keeps `widths` controlled, which clears `resizedKeysRef` on each
        // update, so the drag-end mark lives in `pendingResizeEndKeysRef`.
        if (triggerResizeEnd && pendingResizeEndKeysRef.current.has(String(key))) {
          pendingResizeEndKeysRef.current.delete(String(key));
          resizeConfig?.onResizeEnd?.({
            key,
            width: nextWidth,
            previousWidth,
            delta: 0,
            widths: currentWidths,
            column: resizeMeta.source,
            nativeEvent,
          });
        }
        return;
      }

      const nextWidths = {
        ...currentWidths,
        [key]: nextWidth,
      };
      const info: ColumnResizeInfo<RecordType> = {
        key,
        width: nextWidth,
        previousWidth,
        delta: nextWidth - previousWidth,
        widths: nextWidths,
        column: resizeMeta.source,
        nativeEvent,
      };

      widthsRef.current = nextWidths;
      resizedKeysRef.current.add(String(key));
      pendingResizeEndKeysRef.current.add(String(key));

      if (!controlledWidths) {
        setInnerWidths(nextWidths);
      }

      resizeConfig?.onWidthsChange?.(nextWidths, info);
      resizeConfig?.onResize?.(info);

      if (triggerResizeEnd) {
        pendingResizeEndKeysRef.current.delete(String(key));
        resizeConfig?.onResizeEnd?.(info);
      }
    },
  );

  const flushPendingResize = useEvent(() => {
    resizeFrameRef.current = null;
    const pendingResize = pendingResizeRef.current;
    pendingResizeRef.current = null;

    if (!pendingResize) {
      return;
    }

    applyWidth(pendingResize.key, pendingResize.width, pendingResize.nativeEvent, false);
  });

  React.useEffect(
    () => () => {
      if (
        resizeFrameRef.current !== null &&
        typeof window !== 'undefined' &&
        typeof window.cancelAnimationFrame === 'function'
      ) {
        window.cancelAnimationFrame(resizeFrameRef.current);
      }
    },
    [],
  );

  const updateWidth = useEvent(
    (key: ColumnResizeKey, width: number, nativeEvent: PointerEvent, triggerResizeEnd: boolean) => {
      if (triggerResizeEnd) {
        if (
          resizeFrameRef.current !== null &&
          typeof window !== 'undefined' &&
          typeof window.cancelAnimationFrame === 'function'
        ) {
          window.cancelAnimationFrame(resizeFrameRef.current);
          resizeFrameRef.current = null;
        }

        pendingResizeRef.current = null;
        applyWidth(key, width, nativeEvent, true);
        return;
      }

      if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
        applyWidth(key, width, nativeEvent, false);
        return;
      }

      pendingResizeRef.current = { key, width, nativeEvent };

      if (resizeFrameRef.current === null) {
        resizeFrameRef.current = window.requestAnimationFrame(flushPendingResize);
      }
    },
  );

  return {
    enabled,
    columns: resizeState?.columns ?? columns,
    flattenColumns: resizeState?.flattenColumns ?? flattenColumns,
    scrollX: resizeState?.scrollX,
    realScrollX: resizeState?.realScrollX,
    hasHorizontalOverflow: resizeState?.hasHorizontalOverflow ?? false,
    colWidths: resizeState?.colWidths,
    onColumnResize: updateWidth,
  };
}
