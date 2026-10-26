# @zby/router-core

## 0.2.0

### Minor Changes

- tabState.ts：新页签插到当前活动页签右侧；活动页签已固定时，未固定的新页签放到固定组之后
- tabs.ts：只在第一次创建页签时按活动页签插入，已有页签再进入不挪位
- `__tests__/core.test.ts`：覆盖普通页签紧挨插入，以及固定组不拆开
- index.zh-CN.md：说明页签数组顺序和插入规则
- index.en-US.md：说明页签数组顺序和插入规则

## 0.1.1

### Patch Changes

- 新增 usePageParams、usePageLocation、usePageSearchParams，用于读取当前页签自己的路径参数、地址和查询串。KeepAlive 下不要再使用 React Router 的 useParams、useLocation、useSearchParams。
