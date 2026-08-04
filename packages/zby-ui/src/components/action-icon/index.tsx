/**
 * 文件职责：作为 ActionIcon 目录的统一公开入口。
 *
 * 使用方只需要从组件目录导入，不必知道实现文件放在哪里；这里同时转发组件本身和
 * 对外可用的 Props、semantic 类型，内部的样式生成细节则不会暴露出去。
 */
import ActionIcon from './ActionIcon'

// `export type` 只在 TypeScript 类型检查阶段存在，打包后的 JavaScript 不会增加运行时代码。
export type {
  ActionIconClassNamesType,
  ActionIconProps,
  ActionIconSemanticClassNames,
  ActionIconSemanticName,
  ActionIconSemanticStyles,
  ActionIconStylesType,
} from './ActionIcon'

// 默认导出真实组件，保持 `import ActionIcon from '...'` 的常见使用方式。
export default ActionIcon
