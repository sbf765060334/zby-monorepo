# Router Core 开发约定

- 新增或修改的公开类型、配置项、状态字段和 API 必须提供清晰的中文 JSDoc，说明用途、参数语义、副作用和生命周期边界。
- Registry、导航、页签、KeepAlive、URL Cache、关闭事务和持久化等内部复杂逻辑必须添加中文注释，重点解释设计原因、状态不变量、并发处理与容易误解的分支。
- 注释应解释“为什么这样处理”，不要逐行复述显而易见的赋值、条件或循环。
- 修改实现时同步维护相关注释；过期注释视为缺陷。
- `router-core` 保持纯 TypeScript，不在 core 根入口引入 React、React Router、antd 或 ProLayout UI 依赖。
