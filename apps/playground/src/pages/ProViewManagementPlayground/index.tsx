import {
  PlaygroundGrid,
  PlaygroundPage,
  PlaygroundSection,
} from '../../components/ComponentPlayground'
import ControlledStateExample from './examples/ControlledStateExample'
import OrderViewsExample from './examples/OrderViewsExample'

export default function ProViewManagementPlayground() {
  return (
    <PlaygroundPage
      packageName="@zby/pro"
      title="ProViewManagement"
      description="可持久化的视图切换、创建、保存、重置、管理与排序。"
    >
      <PlaygroundSection title="完整交互">
        <PlaygroundGrid columns={1}>
          <OrderViewsExample />
          <ControlledStateExample />
        </PlaygroundGrid>
      </PlaygroundSection>
    </PlaygroundPage>
  )
}
