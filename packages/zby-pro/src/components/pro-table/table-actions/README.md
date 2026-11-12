# ProTableActions

默认所有操作收入更多菜单。配置 `layout.visibleCount` 指定外露操作数量，配置为 `'all'` 则全部展示；旧的顶层 `visibleCount` 和 `showAll` 已移除。

```tsx
<ProTableActions actions={actions} />
<ProTableActions actions={actions} width="100%" layout={{ visibleCount: 2 }} />
<ProTableActions actions={actions} layout={{ visibleCount: 'all', direction: 'vertical' }} />
<ProTableActions
  actions={actions}
  width={160}
  layout={{ rows: 3, columns: 2, direction: 'vertical' }}
/>
```

`layout` 的数量模式和网格模式互斥。方向默认为 `horizontal`，网格中 `vertical` 表示先填满第一列再填第二列。行列数表示容量上限；超过容量时最后一个位置作为更多入口，恰好放满时不预留入口。隐藏操作先过滤，再计算数量。

普通横向模式没有整体宽度约束时按自然宽度排列。有约束时优先保留更多入口与间距，短按钮只占自然宽度，剩余空间反复均分给长按钮，长文案单行省略。不会因一般的宽度压缩改变外露数量。

网格指定 `width` 时，每列宽度为 `(内容区宽度 - 列间距 × (列数 - 1)) / 列数`，内容区不包含根节点的边框和左右 padding；未指定时，每列按本列外露内容的最大自然宽度排列。未占用的配置列不补空按钮。无需配置单独的按钮列宽。

网格及普通纵向模式中，槽位保留列宽，按钮默认按文字与图标的自然宽度收缩，最长不超过槽位，长文案仍单行省略。短按钮右侧的槽位留白不触发该按钮、Tooltip 或 Popconfirm。业务显式设置操作项的 `style.width` 或 `block` 时，可主动扩大按钮区域。

整体 `width` 接受像素数值或 CSS 长度，优先于 `style.width`。百分比宽度需要父容器具有确定的宽度；表格中建议同时指定操作列宽。`style.width` 也可以提供整体宽度约束。普通纵向模式按指定整体宽度约束按钮文案。

普通横向模式空间不足以保留入口和间距，或网格列宽不足以放下更多入口时，全部操作收进更多菜单。极窄容器下入口仍保持完整宽度。增加容器宽度后会恢复正常布局。

未传 `layout` 或数量模式的 `visibleCount` 为 0 时，更多入口默认使用省略号图标；`visibleCount` 大于 0、为 `'all'` 或使用网格模式时，入口默认使用本地化的“更多”文案和右侧向下箭头。没有溢出操作时不显示入口，极窄收起时保持配置模式对应的入口外观。

`moreText` 接受 ReactNode 并替换默认文字，`moreButtonProps.icon` 可配置图标，传 `null` 可移除默认图标，`moreButtonProps.iconPlacement` 可调整图标位置。完全自定义入口内容时可组合 `moreText={<CustomContent />}` 与 `moreButtonProps={{ icon: null }}`。省略号模式传入自定义文字后不再自动附加省略号。默认入口沿用本地化的无障碍名称。

受约束的按钮从 label 提取文本作为原生 title，复杂内容可通过操作项的 `title` 显式指定，业务说明仍可使用 `tooltip`。颜色沿用 Ant Design 主题，行间距及普通按钮间距使用 `marginXXS`，网格列间距使用 `marginXS`。

## 原生 Popconfirm 的异步确认示例

下面使用 Ant Design 原生 Popconfirm 演示：点击“删除”打开确认框，再点击“确定”，确认按钮自动进入 loading；模拟请求两秒后成功，确认框自动关闭。旋转图标出现在确认框的“确定”按钮上，外面的“删除”按钮不会自动进入 loading。

```tsx
import { Button, Popconfirm } from 'antd'

export function AsyncConfirmDemo() {
  return (
    <Popconfirm
      title="确定删除吗？"
      okText="确定"
      cancelText="取消"
      onConfirm={() => new Promise<void>((resolve) => {
        setTimeout(resolve, 2000) // 模拟异步删除请求；实际业务返回接口调用的 Promise。
      })}
    >
      <Button danger>删除</Button>
    </Popconfirm>
  )
}
```

关键是让 `onConfirm` 返回请求的 Promise，组件才能等待并自动管理 loading；使用 `void request()` 会丢弃返回值，无法触发这套行为。ProTableActions 会将 `popconfirm.onConfirm` 的返回值原样交给 Popconfirm；未配置专用确认回调时，也会透传操作项 `onClick` 的返回值。请求成功后自动关闭，失败后结束 loading 并保留确认框，错误提示由业务处理。

```tsx
<ProTableActions
  record={record}
  actions={[{
    key: 'delete',
    label: '删除',
    popconfirm: {
      title: '确定删除吗？',
      onConfirm: ({ record }) => deleteOrder(record!.id),
    },
  }]}
/>
```

宽度测量会扣除根节点实际的左右 padding；按钮文案自行更新时也会重新分配宽度。
