import { Tabs } from 'antd'

import {
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
import type { CSSProperties, ReactNode } from 'react'

const deferredExampleStyle: CSSProperties = {
  minWidth: 0,
  contentVisibility: 'auto',
  containIntrinsicSize: 'auto 520px',
}

export default function TablePlayground() {
  return (
    <PlaygroundPage
      title="Table"
      description="按独立实例展示 AntD 6.6.4 基线能力与 ZBY Table 扩展；每个实例自行管理状态，互不触发整页更新。"
    >
      <PlaygroundSection
        title="渲染与布局"
        description="对比普通、Fill、虚拟和虚拟 Fill 四种核心模式。"
      >
        <ExampleTabs
          items={[
            { key: 'basic', label: '普通渲染', children: <BasicTableExample /> },
            { key: 'fill', label: '普通 Fill', children: <FillTableExample /> },
            { key: 'virtual', label: '虚拟渲染', children: <VirtualTableExample /> },
            { key: 'virtual-fill', label: '虚拟 Fill', children: <VirtualFillTableExample /> },
          ]}
        />
      </PlaygroundSection>

      <PlaygroundSection
        title="ZBY 扩展能力"
        description="列宽拖拽、当前行高亮、列增强和虚拟 rowSpan 均为局部独立示例。"
      >
        <ExampleTabs
          items={[
            { key: 'resize', label: '列宽拖拽', children: <ColumnResizeExample /> },
            {
              key: 'highlight-uncontrolled',
              label: '非受控高亮',
              children: <UncontrolledHighlightExample />,
            },
            {
              key: 'highlight-controlled',
              label: '受控高亮',
              children: <ControlledHighlightExample />,
            },
            { key: 'column', label: '列增强', children: <ColumnEnhancementExample /> },
            { key: 'row-span', label: '虚拟 rowSpan', children: <VirtualRowSpanExample /> },
          ]}
        />
      </PlaygroundSection>

      <PlaygroundSection
        title="AntD 基线能力"
        description="以下实例继续使用 AntD 6.6.4 的原生语义。"
      >
        <ExampleTabs
          items={[
            { key: 'bordered', label: '边框', children: <BorderedTableExample /> },
            { key: 'selection', label: '行选择', children: <RowSelectionExample /> },
            { key: 'fixed', label: '固定列', children: <FixedColumnsExample /> },
            { key: 'sort-filter', label: '排序筛选', children: <SortFilterExample /> },
            { key: 'expandable', label: '展开行', children: <ExpandableRowsExample /> },
          ]}
        />
      </PlaygroundSection>
    </PlaygroundPage>
  )
}

interface ExampleTabItem {
  key: string
  label: ReactNode
  children: ReactNode
}

function ExampleTabs(props: { items: ExampleTabItem[] }) {
  return (
    <Tabs
      destroyOnHidden
      items={props.items.map(({ children, key, label }) => ({
        key,
        label,
        children: <div style={deferredExampleStyle}>{children}</div>,
      }))}
    />
  )
}
