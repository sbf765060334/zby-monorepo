import { useContext } from '@rc-component/context';
import { clsx } from 'clsx';
import * as React from 'react';
import TableContext from '../context/TableContext';
import devRenderTimes from '../hooks/useRenderTimes';
import {
  INTERNAL_COLUMN_RESIZE_FILLER,
  INTERNAL_COLUMN_RESIZE_META,
} from '../interface';
import type {
  AlignType,
  CellEllipsisType,
  ColumnResizeKey,
  ColumnType,
  CustomizeComponent,
  DataIndex,
  DefaultRecordType,
  Direction,
  ScopeType,
} from '../interface';
import useCellRender from './useCellRender';
import useHoverState from './useHoverState';
import { useEvent } from '@rc-component/util';

function getDraggedColumnWidth(
  startWidth: number,
  startX: number,
  clientX: number,
  direction?: Direction,
) {
  const delta = clientX - startX;
  return startWidth + (direction === 'rtl' ? -delta : delta);
}

export interface CellProps<RecordType extends DefaultRecordType> {
  prefixCls?: string;
  className?: string;
  style?: React.CSSProperties;
  record?: RecordType;
  /** `column` index is the real show rowIndex */
  index?: number;
  /** the index of the record. For the render(value, record, renderIndex) */
  renderIndex?: number;
  dataIndex?: DataIndex<RecordType>;
  render?: ColumnType<RecordType>['render'];
  component?: CustomizeComponent;
  children?: React.ReactNode;
  column?: ColumnType<RecordType>;
  colSpan?: number;
  rowSpan?: number;
  scope?: ScopeType;
  ellipsis?: CellEllipsisType;
  align?: AlignType;

  shouldCellUpdate?: (record: RecordType, prevRecord: RecordType) => boolean;

  // Fixed
  fixStart?: number | false;
  fixEnd?: number | false;
  fixedStartShadow?: boolean;
  fixedEndShadow?: boolean;
  offsetFixedStartShadow?: number;
  offsetFixedEndShadow?: number;
  zIndex?: number;
  zIndexReverse?: number;
  allColsFixedLeft?: boolean;

  // ====================== Private Props ======================
  /** @private Used for `expandable` with nest tree */
  appendNode?: React.ReactNode;
  additionalProps?: React.TdHTMLAttributes<HTMLTableCellElement>;
  /** @private Original rowSpan before patching it for expanded rows */
  originRowSpan?: number;

  rowType?: 'header' | 'body' | 'footer';

  isSticky?: boolean;
}

const getTitleFromCellRenderChildren = ({
  ellipsis,
  rowType,
  children,
}: Pick<CellProps<any>, 'ellipsis' | 'rowType' | 'children'>) => {
  let title: string;
  const ellipsisConfig: CellEllipsisType = ellipsis === true ? { showTitle: true } : ellipsis;
  if (ellipsisConfig && (ellipsisConfig.showTitle || rowType === 'header')) {
    if (typeof children === 'string' || typeof children === 'number') {
      title = children.toString();
    } else if (
      React.isValidElement<any>(children) &&
      typeof (children.props as any)?.children === 'string'
    ) {
      title = (children.props as any)?.children;
    }
  }
  return title;
};

const Cell = <RecordType,>(props: CellProps<RecordType>) => {
  if (process.env.NODE_ENV !== 'production') {
    devRenderTimes(props);
  }

  const {
    component: Component,
    children,
    ellipsis,
    scope,

    // Style
    prefixCls,
    className,
    style,
    align,

    // Value
    column,
    record,
    render,
    dataIndex,
    renderIndex,
    shouldCellUpdate,

    // Row
    index,
    rowType,

    // Span
    colSpan,
    rowSpan,

    // Fixed
    fixStart,
    fixEnd,
    fixedStartShadow,
    fixedEndShadow,
    offsetFixedStartShadow,
    offsetFixedEndShadow,
    zIndex,
    zIndexReverse,

    // Private
    appendNode,
    additionalProps = {},
    originRowSpan,
    isSticky,
  } = props;

  const cellPrefixCls = `${prefixCls}-cell`;

  const {
    allColumnsFixedLeft,
    rowHoverable,
    direction,
    onColumnResizeDrag,
    onColumnResizeEnd,
  } = useContext(TableContext, [
    'allColumnsFixedLeft',
    'rowHoverable',
    'direction',
    'onColumnResizeDrag',
    'onColumnResizeEnd',
  ]);

  // ====================== Value =======================
  const [childNode, legacyCellProps] = useCellRender(
    record,
    dataIndex,
    renderIndex,
    children,
    render,
    shouldCellUpdate,
  );

  // ====================== Fixed =======================
  const fixedStyle: React.CSSProperties = {};
  const isFixStart = typeof fixStart === 'number' && !allColumnsFixedLeft;
  const isFixEnd = typeof fixEnd === 'number' && !allColumnsFixedLeft;

  const [showFixStartShadow, showFixEndShadow] = useContext(TableContext, ({ scrollInfo }) => {
    if (!isFixStart && !isFixEnd) {
      return [false, false];
    }

    const [absScroll, scrollWidth] = scrollInfo;

    const showStartShadow =
      (isFixStart && fixedStartShadow && absScroll) -
        // For precision, we not show shadow by default which has better user experience.
        (offsetFixedStartShadow as number) >=
      1;
    const showEndShadow =
      (isFixEnd && fixedEndShadow && scrollWidth - absScroll) -
        // Same as above
        (offsetFixedEndShadow as number) >
      1;

    return [showStartShadow, showEndShadow];
  });

  if (isFixStart) {
    fixedStyle.insetInlineStart = fixStart as number;
    fixedStyle['--z-offset'] = zIndex;
    fixedStyle['--z-offset-reverse'] = zIndexReverse;
  }
  if (isFixEnd) {
    fixedStyle.insetInlineEnd = fixEnd as number;
    fixedStyle['--z-offset'] = zIndex;
    fixedStyle['--z-offset-reverse'] = zIndexReverse;
  }

  // ================ RowSpan & ColSpan =================
  const mergedColSpan = legacyCellProps?.colSpan ?? additionalProps.colSpan ?? colSpan ?? 1;
  const mergedRowSpan = legacyCellProps?.rowSpan ?? additionalProps.rowSpan ?? rowSpan ?? 1;
  const mergedHoverRowSpan = legacyCellProps?.rowSpan ?? originRowSpan ?? mergedRowSpan;

  // ====================== Hover =======================
  const [hovering, onHover] = useHoverState(index, mergedHoverRowSpan);

  const onMouseEnter: React.MouseEventHandler<HTMLTableCellElement> = useEvent(event => {
    if (record) {
      onHover(index, index + mergedHoverRowSpan - 1);
    }

    additionalProps?.onMouseEnter?.(event);
  });

  const onMouseLeave: React.MouseEventHandler<HTMLTableCellElement> = useEvent(event => {
    if (record) {
      onHover(-1, -1);
    }

    additionalProps?.onMouseLeave?.(event);
  });

  const columnResizeMeta =
    rowType === 'header'
      ? column?.[INTERNAL_COLUMN_RESIZE_META]
      : undefined;
  const columnResizeFiller = column?.[INTERNAL_COLUMN_RESIZE_FILLER];
  const [resizeActive, setResizeActive] = React.useState(false);
  const resizeDragRef = React.useRef<{
    key: ColumnResizeKey;
    startX: number;
    startWidth: number;
  } | null>(null);
  const resizeCleanupRef = React.useRef<(() => void) | null>(null);

  const cleanupResizeListeners = useEvent(() => {
    resizeCleanupRef.current?.();
    resizeCleanupRef.current = null;
  });

  const onResizePointerDown = useEvent((event: React.PointerEvent<HTMLSpanElement>) => {
    if (!columnResizeMeta?.resizable) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    resizeDragRef.current = {
      key: columnResizeMeta.key,
      startX: event.clientX,
      startWidth: columnResizeMeta.width,
    };
    setResizeActive(true);

    const ownerDocument = event.currentTarget.ownerDocument;
    const onDocumentPointerMove = (nativeEvent: PointerEvent) => {
      const dragState = resizeDragRef.current;
      if (!dragState) {
        return;
      }

      nativeEvent.preventDefault();
      onColumnResizeDrag?.(
        dragState.key,
        getDraggedColumnWidth(
          dragState.startWidth,
          dragState.startX,
          nativeEvent.clientX,
          direction,
        ),
        nativeEvent,
      );
    };
    const onDocumentPointerUp = (nativeEvent: PointerEvent) => {
      const dragState = resizeDragRef.current;
      if (!dragState) {
        return;
      }

      nativeEvent.preventDefault();
      cleanupResizeListeners();
      resizeDragRef.current = null;
      setResizeActive(false);
      onColumnResizeEnd?.(
        dragState.key,
        getDraggedColumnWidth(
          dragState.startWidth,
          dragState.startX,
          nativeEvent.clientX,
          direction,
        ),
        nativeEvent,
      );
    };

    cleanupResizeListeners();
    ownerDocument.addEventListener('pointermove', onDocumentPointerMove);
    ownerDocument.addEventListener('pointerup', onDocumentPointerUp);
    ownerDocument.addEventListener('pointercancel', onDocumentPointerUp);
    resizeCleanupRef.current = () => {
      ownerDocument.removeEventListener('pointermove', onDocumentPointerMove);
      ownerDocument.removeEventListener('pointerup', onDocumentPointerUp);
      ownerDocument.removeEventListener('pointercancel', onDocumentPointerUp);
    };
  });

  const onResizeMouseDown = useEvent((event: React.MouseEvent<HTMLSpanElement>) => {
    if (typeof window !== 'undefined' && 'PointerEvent' in window) {
      return;
    }
    if (!columnResizeMeta?.resizable) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    resizeDragRef.current = {
      key: columnResizeMeta.key,
      startX: event.clientX,
      startWidth: columnResizeMeta.width,
    };
    setResizeActive(true);

    const ownerDocument = event.currentTarget.ownerDocument;
    const onDocumentMouseMove = (nativeEvent: MouseEvent) => {
      const dragState = resizeDragRef.current;
      if (!dragState) {
        return;
      }

      nativeEvent.preventDefault();
      onColumnResizeDrag?.(
        dragState.key,
        getDraggedColumnWidth(
          dragState.startWidth,
          dragState.startX,
          nativeEvent.clientX,
          direction,
        ),
        nativeEvent as unknown as PointerEvent,
      );
    };
    const onDocumentMouseUp = (nativeEvent: MouseEvent) => {
      const dragState = resizeDragRef.current;
      if (!dragState) {
        return;
      }

      nativeEvent.preventDefault();
      cleanupResizeListeners();
      resizeDragRef.current = null;
      setResizeActive(false);
      onColumnResizeEnd?.(
        dragState.key,
        getDraggedColumnWidth(
          dragState.startWidth,
          dragState.startX,
          nativeEvent.clientX,
          direction,
        ),
        nativeEvent as unknown as PointerEvent,
      );
    };

    cleanupResizeListeners();
    ownerDocument.addEventListener('mousemove', onDocumentMouseMove);
    ownerDocument.addEventListener('mouseup', onDocumentMouseUp);
    resizeCleanupRef.current = () => {
      ownerDocument.removeEventListener('mousemove', onDocumentMouseMove);
      ownerDocument.removeEventListener('mouseup', onDocumentMouseUp);
    };
  });

  React.useEffect(() => () => cleanupResizeListeners(), [cleanupResizeListeners]);

  // ====================== Render ======================
  if (mergedColSpan === 0 || mergedRowSpan === 0) {
    return null;
  }

  // >>>>> Title
  const title =
    additionalProps.title ??
    getTitleFromCellRenderChildren({
      rowType,
      ellipsis,
      children: childNode,
    });

  // >>>>> ClassName
  const mergedClassName = clsx(
    cellPrefixCls,
    className,
    {
      [`${cellPrefixCls}-resizable`]: columnResizeMeta?.resizable,
      [`${cellPrefixCls}-resize-filler`]: columnResizeFiller,

      // Fixed
      [`${cellPrefixCls}-fix`]: isFixStart || isFixEnd,
      [`${cellPrefixCls}-fix-start`]: isFixStart,
      [`${cellPrefixCls}-fix-end`]: isFixEnd,

      // Fixed shadow
      [`${cellPrefixCls}-fix-start-shadow`]: fixedStartShadow,
      [`${cellPrefixCls}-fix-start-shadow-show`]: fixedStartShadow && showFixStartShadow,
      [`${cellPrefixCls}-fix-end-shadow`]: fixedEndShadow,
      [`${cellPrefixCls}-fix-end-shadow-show`]: fixedEndShadow && showFixEndShadow,

      [`${cellPrefixCls}-ellipsis`]: ellipsis,
      [`${cellPrefixCls}-with-append`]: appendNode,
      [`${cellPrefixCls}-fix-sticky`]: (isFixStart || isFixEnd) && isSticky,
      [`${cellPrefixCls}-row-hover`]: !legacyCellProps && hovering,
    },
    additionalProps.className,
    legacyCellProps?.className,
  );

  // >>>>> Style
  const alignStyle: React.CSSProperties = {};
  if (align) {
    alignStyle.textAlign = align;
  }

  // The order is important since user can overwrite style.
  // For example ant-design/ant-design#51763
  const mergedStyle: React.CSSProperties = {
    ...legacyCellProps?.style,
    ...fixedStyle,
    ...alignStyle,
    ...additionalProps.style,
    ...style,
  };

  // >>>>> Children Node
  let mergedChildNode = childNode;

  // Not crash if final `childNode` is not validate ReactNode
  if (
    typeof mergedChildNode === 'object' &&
    !Array.isArray(mergedChildNode) &&
    !React.isValidElement(mergedChildNode)
  ) {
    mergedChildNode = null;
  }

  if (ellipsis && (fixedStartShadow || fixedEndShadow)) {
    mergedChildNode = <span className={`${cellPrefixCls}-content`}>{mergedChildNode}</span>;
  }

  const resizeHandle =
    columnResizeMeta?.resizable && mergedColSpan === 1 ? (
      <span
        aria-hidden="true"
        className={clsx(`${cellPrefixCls}-resize-handle`, {
          [`${cellPrefixCls}-resize-handle-active`]: resizeActive,
        })}
        onClick={event => event.stopPropagation()}
        onMouseDown={onResizeMouseDown}
        onPointerDown={onResizePointerDown}
      />
    ) : null;

  return (
    <Component
      {...legacyCellProps}
      {...additionalProps}
      className={mergedClassName}
      style={mergedStyle}
      // A11y
      title={title}
      scope={scope}
      // Hover
      onMouseEnter={rowHoverable ? onMouseEnter : undefined}
      onMouseLeave={rowHoverable ? onMouseLeave : undefined}
      //Span
      colSpan={mergedColSpan !== 1 ? mergedColSpan : null}
      rowSpan={mergedRowSpan !== 1 ? mergedRowSpan : null}
    >
      {appendNode}
      {mergedChildNode}
      {resizeHandle}
    </Component>
  );
};

export default React.memo(Cell) as typeof Cell;
