import {
  PlaygroundGrid,
  PlaygroundPage,
  PlaygroundSection,
} from '../../components/ComponentPlayground'
import BasicTableExample from './examples/BasicTableExample'
import BorderedTableExample from './examples/BorderedTableExample'
import ColumnBodyEllipsisExample from './examples/ColumnBodyEllipsisExample'
import ColumnEnhancementExample from './examples/ColumnEnhancementExample'
import ColumnHeaderFilterExample from './examples/ColumnHeaderFilterExample'
import ColumnResizeControlledExample from './examples/ColumnResizeControlledExample'
import ColumnResizeExample from './examples/ColumnResizeExample'
import ColumnResizeRtlExample from './examples/ColumnResizeRtlExample'
import ControlledHighlightExample from './examples/ControlledHighlightExample'
import CopyableConfigExample from './examples/CopyableConfigExample'
import EmptyLoadingExample from './examples/EmptyLoadingExample'
import ExpandableRowsExample from './examples/ExpandableRowsExample'
import FillPaginationExample from './examples/FillPaginationExample'
import FillTableExample from './examples/FillTableExample'
import FixedColumnsExample from './examples/FixedColumnsExample'
import RowSelectionExample from './examples/RowSelectionExample'
import SizeExample from './examples/SizeExample'
import SortFilterExample from './examples/SortFilterExample'
import StickyHeaderExample from './examples/StickyHeaderExample'
import SummaryExample from './examples/SummaryExample'
import UncontrolledHighlightExample from './examples/UncontrolledHighlightExample'
import VirtualFillTableExample from './examples/VirtualFillTableExample'
import VirtualRowSpanExample from './examples/VirtualRowSpanExample'
import VirtualTableExample from './examples/VirtualTableExample'

export default function TablePlayground() {
  return (
    <PlaygroundPage
      title="Table"
      description="按独立卡片展示 AntD 基线能力与 ZBY Table 扩展。每个实例自行管理状态。"
    >
      <PlaygroundSection
        title="渲染与布局"
        description="普通、Fill、虚拟、虚拟 Fill，以及填充高度与分页的组合。"
      >
        <PlaygroundGrid columns={1}>
          <BasicTableExample />
          <FillTableExample />
          <FillPaginationExample />
          <VirtualTableExample />
          <VirtualFillTableExample />
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection
        title="ZBY 扩展能力"
        description="列宽拖拽、当前行高亮、列增强、复制和虚拟 rowSpan。"
      >
        <PlaygroundGrid columns={1}>
          <ColumnResizeExample />
          <ColumnResizeControlledExample />
          <ColumnResizeRtlExample />
          <UncontrolledHighlightExample />
          <ControlledHighlightExample />
          <ColumnEnhancementExample />
          <CopyableConfigExample />
          <ColumnBodyEllipsisExample />
          <ColumnHeaderFilterExample />
          <VirtualRowSpanExample />
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection title="AntD 基线能力">
        <PlaygroundGrid columns={1}>
          <BorderedTableExample />
          <SizeExample />
          <EmptyLoadingExample />
          <RowSelectionExample />
          <FixedColumnsExample />
          <SortFilterExample />
          <ExpandableRowsExample />
          <SummaryExample />
          <StickyHeaderExample />
        </PlaygroundGrid>
      </PlaygroundSection>
    </PlaygroundPage>
  )
}
