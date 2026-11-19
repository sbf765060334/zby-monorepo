# ProTableActions

默认所有操作收入更多菜单，入口统一显示本地化的“更多”和向下图标。顶层 `maxVisibleCount` 指定外露操作数量上限；`layout` 只包含 `maxRows`、`maxColumns`，配置后优先于 `maxVisibleCount`。

```tsx
<ProTableActions actions={actions} />
<ProTableActions actions={actions} width="100%" maxVisibleCount={2} />
<ProTableActions actions={actions} layout={{ maxRows: actions.length, maxColumns: 1 }} />
<ProTableActions
  actions={actions}
  width={160}
  layout={{ maxRows: 3, maxColumns: 2 }}
/>
```

`layout` 表示最多行数、最多列数，始终按行填充。`maxColumns: 1` 表示纵向排列。容量包含溢出时的更多入口：例如 2 行 3 列可以展示 6 个操作，7 个操作时展示前 5 个加更多。隐藏操作先过滤，再计算数量。行列数向下取整且至少为 1，非法数值按 1 处理。

未传 `layout` 时，`maxVisibleCount` 未传或为 0 表示全部收纳；正数表示业务操作的外露数量上限，不包含更多入口。数值向下取整，负数、NaN、Infinity 按 0 处理。需要尽可能全部展示时传 `maxVisibleCount={actions.length}`，不再支持 `'all'`。

普通横向模式没有整体宽度约束时按自然宽度排列。有约束且存在溢出操作时，优先保留更多入口与间距，短按钮只占自然宽度，剩余空间反复均分给长按钮，长文案单行省略。没有溢出操作时不预留入口宽度。

网格指定 `width` 时，每列宽度为 `(内容区宽度 - 列间距 × (实际列数 - 1)) / 实际列数`，内容区不包含根节点的边框和左右 padding；未指定时，各列按本列内容的最大自然宽度排列。未占用的位置不补空按钮。

两种模式共用文字阈值和收纳流程：长文案至少保留 `3em` 的文字空间（包含省略号），字号 14px 时为 42px，图标、间距、padding、边框另计；天然短于阈值的文案只需完整显示。任何外露按钮不满足条件时，从末尾收纳一个操作并重新分配，直到满足或全部收纳。操作和菜单始终保持原顺序。网格开始收纳后，允许减少实际列数，并在行数上限内重新按行填充。例如 2 行 3 列可依次退化为 2 行 2 列、2 行 1 列及全部收纳。容器变宽或文案变短后从原始配置上限重新计算。

网格（包括单列纵向排列）中，槽位保留列宽，按钮默认按文字与图标的自然宽度收缩，最长不超过槽位。短按钮右侧的槽位留白不触发该按钮、Tooltip 或 Popconfirm。业务显式设置操作项的 `style.width` 或 `block` 时，可主动扩大按钮区域，仍受槽位最大宽度限制。

整体 `width` 接受像素数值或 CSS 长度，优先于 `style.width`。只有显式提供这两个属性之一才启用宽度约束；组件不读取表格列宽。跟随操作列宽时，给列设置确定宽度并传 `width="100%"`。仅设置 `maxWidth` 不启用测量。

更多入口优先完整展示；业务操作全部收纳后，入口最大宽度受内容区约束。入口文字放不下时省略，无法省略的自定义内容裁剪；极窄到连图标也放不下时继续裁剪。更多入口不参与业务文案阈值判断，不会再生成另一层更多入口。

没有溢出操作时不显示更多入口。所有模式（包括默认全部收纳）均使用相同的本地化文案和向下图标。

`moreText` 接受 ReactNode 并替换默认文字，`moreButtonProps.icon` 可配置图标，传 `null` 可移除默认图标，`moreButtonProps.iconPlacement` 可调整图标位置。完全自定义入口内容时可组合 `moreText={<CustomContent />}` 与 `moreButtonProps={{ icon: null }}`。默认入口沿用本地化的无障碍名称；自定义内容可通过 `moreButtonProps.title` 补充完整说明，并通过 `aria-label` 指定名称。

迁移：将 `layout.visibleCount` 改为顶层 `maxVisibleCount`，将 `'all'` 改为 `actions.length`；将 `layout.rows`、`layout.columns` 分别改为 `maxRows`、`maxColumns`。删除 `direction`，原纵向布局改用 `{ maxRows: 容量上限, maxColumns: 1 }`，注意网格容量包含溢出时的更多入口，与旧纵向数量规则不完全等价。旧的顶层 `visibleCount`、`showAll` 不恢复支持。

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
