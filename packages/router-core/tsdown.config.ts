/**
 * 文件职责：声明 router-core 的构建入口、模块格式、类型产物和外部依赖策略。
 *
 * 构建时会分别生成根入口和 React 入口的 ESM/CJS 文件与声明文件；React / React Router
 * 由最终应用提供，因此这里明确不把它们打进包内。
 */
import { defineConfig } from 'tsdown'

/** 把静态配置交给 tsdown；这里不包含任何运行时路由逻辑。 */
export default defineConfig({
  // 两个 key 对应 package.json exports 中的两个公共入口。
  entry: {
    index: './src/index.ts',
    'react/index': './src/react/index.ts',
  },
  // 同时服务现代 ESM 工程和仍使用 CommonJS 的工程。
  format: ['esm', 'cjs'],
  // 生成 TypeScript 声明和 sourcemap，并在每次构建前清理旧产物。
  dts: true,
  sourcemap: true,
  clean: true,
  deps: {
    // React/React Router 是 peerDependencies，应由宿主应用保持单例。
    neverBundle: ['react', 'react-router-dom'],
  },
})
