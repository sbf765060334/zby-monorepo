---
"@zby/ui": minor
---

- table/getTableScrollX.ts：新增普通列表 scroll.x 计算，未写宽度时使用默认宽度
- table/index.tsx：导出 getTableScrollX
- src/index.ts：从包入口导出 getTableScrollX
- table/index.zh-CN.md：说明 getTableScrollX 只给普通列表使用
- table/index.en-US.md：说明 getTableScrollX 只给普通列表使用
- table/__tests__/getTableScrollX.test.ts：覆盖列宽累加、默认宽度和占位列
