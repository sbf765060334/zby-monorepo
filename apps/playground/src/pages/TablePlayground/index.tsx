import {
  PlaygroundGrid,
  PlaygroundPage,
  PlaygroundSection,
} from '../../components/ComponentPlayground'
import BasicTableExample from './examples/BasicTableExample'
import BorderedTableExample from './examples/BorderedTableExample'
import ColumnEnhancementExample from './examples/ColumnEnhancementExample'
import ColumnResizeExample from './examples/ColumnResizeExample'
import ControlledHighlightExample from './examples/ControlledHighlightExample'
import ExpandableRowsExample from './examples/ExpandableRowsExample'
import FillTableExample from './examples/FillTableExample'
import FixedColumnsExample from './examples/FixedColumnsExample'
import RowSelectionExample from './examples/RowSelectionExample'
import SortFilterExample from './examples/SortFilterExample'
import UncontrolledHighlightExample from './examples/UncontrolledHighlightExample'
import VirtualFillTableExample from './examples/VirtualFillTableExample'
import VirtualRowSpanExample from './examples/VirtualRowSpanExample'
import VirtualTableExample from './examples/VirtualTableExample'

export default function TablePlayground() {
  return (
    <PlaygroundPage
      title="Table"
      description="按独立实例展示 AntD 6.5.3 基线能力与 ZBY Table 扩展；每个实例自行管理状态，互不触发整页更新。"
    >
      <PlaygroundSection
        title="渲染与布局"
        description="对比普通、Fill、虚拟和虚拟 Fill 四种核心模式。"
      >
        <PlaygroundGrid minItemWidth={520}>
          <BasicTableExample />
          <FillTableExample />
          <VirtualTableExample />
          <VirtualFillTableExample />
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection
        title="ZBY 扩展能力"
        description="列宽拖拽、当前行高亮、列增强和虚拟 rowSpan 均为局部独立示例。"
      >
        <PlaygroundGrid minItemWidth={520}>
          <ColumnResizeExample />
          <UncontrolledHighlightExample />
          <ControlledHighlightExample />
          <ColumnEnhancementExample />
          <VirtualRowSpanExample />
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection
        title="AntD 基线能力"
        description="以下实例继续使用 AntD 6.5.3 的原生语义。"
      >
        <PlaygroundGrid minItemWidth={520}>
          <BorderedTableExample />
          <RowSelectionExample />
          <FixedColumnsExample />
          <SortFilterExample />
          <ExpandableRowsExample />
        </PlaygroundGrid>
      </PlaygroundSection>
    </PlaygroundPage>
  )
}
