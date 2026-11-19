---
"@zby/pro": major
---

- components/pro-table/interface.ts：将 ProTableActions 的 layout 收窄为 maxRows、maxColumns，移除 direction 和 layout.visibleCount，新增顶层 maxVisibleCount；同时配置时以 layout 为准，不再支持 'all'。
- components/pro-table/table-actions/layout.ts：统一文字阈值、末尾逐项收纳及恢复流程；网格在行列上限内减少列数，普通横向布局保留短文案优先的宽度分配。
- components/pro-table/table-actions/ProTableActions.tsx：默认入口统一为本地化的“更多”和向下图标，文字至少保留 2em，极窄时省略或裁剪更多入口，避免撑出操作列；保留权限过滤、Tooltip 和异步确认行为。
- components/pro-table/table-actions/__tests__：覆盖配置优先级、逐项收纳、单列排列、动态文案、极窄入口和宽度恢复，共 73 项测试通过。
- components/pro-table/table-actions/README.md：更新新 API、宽度约束约定及迁移说明；Playground 为操作入口设置 width="100%"。
- docs/adr/0002-pro-table-actions-simplified-layout.md：记录收窄配置及统一收纳策略，替代 ADR-0001。
