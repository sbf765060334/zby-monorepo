<!-- 文件职责：说明 @zby/* 如何打包，以及如何发布到公司云效 NPM 制品库。 -->

# 发布到内部制品库

[返回包说明](./index.zh-CN.md)

`packages` 下的 `@zby/*` 是 npm 作用域包，发布目标是当前代码库所属组织的云效 NPM 制品库，不是通用包、Docker 或 Maven。

制品库地址：

```text
https://packages.aliyun.com/62822d91f26531aa1c5573c8/npm/npm-registry/
```

组织 ID `62822d91f26531aa1c5573c8` 与远程仓库 `codeup.aliyun.com:62822d91f26531aa1c5573c8/ep-frontend/zby-monorepo` 一致。仓库 ID 是 `npm-registry`。

这些包只发给公司内部制品库，不发到公网 npm。

## 发布哪些包

根包 `zby-monorepo` 和 `apps/playground` 都是 `"private": true`。Changesets 也忽略了 `playground`。这两个不要发。

要发布的是下面 6 个包。编写本文时，制品库里还没有它们（`npm view` 返回 404），版本都是 `0.1.0`。

| 包 | 内部依赖 | 业务侧 |
| --- | --- | --- |
| `@zby/hooks` | 无 | 可单独安装 |
| `@zby/intl` | 无 | 一般随 `@zby/ui` 安装 |
| `@zby/request` | 无 | 请求层单独安装 |
| `@zby/router-core` | 无 | 随 `@zby/pro` 发布。业务不要单独把它当路由库使用 |
| `@zby/ui` | `@zby/intl` | 基础组件 |
| `@zby/pro` | `@zby/hooks`、`@zby/intl`、`@zby/router-core`、`@zby/ui` | 中后台业务组件 |

`@zby/pro`、`@zby/ui` 对内部包的依赖写的是 `workspace:*`。发布必须走 pnpm。pnpm 会在发包时把 `workspace:*` 改写成当前具体版本。在子包目录里直接执行 `npm publish`，`workspace:*` 会原样进制品库，业务项目会安装失败。

## 打包产物

每个包的 `build` 都是 `tsdown`，同时产出：

- ESM：`dist/**/*.mjs`
- CJS：`dist/**/*.cjs`
- 类型声明：`dist/**/*.d.mts`、`dist/**/*.d.cts`

在仓库根目录构建全部内部包：

```bash
pnpm build
```

这条命令等价于 `pnpm -r --filter "@zby/*" build`，pnpm 会按依赖顺序构建。

`package.json` 的 `files` 只包含 `dist`。`@zby/request` 和 `@zby/router-core` 另外带上各自的 `src/index.en-US.md`、`src/index.zh-CN.md`。源码、测试和 `tsconfig` 不会进 tarball。`dist` 已写入 `.gitignore`，发布前必须先构建，不能把仓库里的源码目录当成已打好的包。

React、`react-dom`、`antd`、`react-router-dom`、`@ant-design/cssinjs`，以及内部的 `@zby/*`，构建时都保持 external，由使用方安装。组件样式走 antd 的 css-in-js，包内没有单独的 CSS 产物。`@zby/pro` 会继续引用 `nprogress/nprogress.css`，`nprogress` 已经写在它的 `dependencies` 里。

业务项目安装界面包时，还要自己安装 peer：

- `react`、`react-dom` `>=18`
- `antd` `^6.6.4`
- `@ant-design/cssinjs` `>=1`
- 使用 `@zby/pro` 布局时再加 `react-router-dom` `>=6`
- 使用 `@zby/request/react-query` 时再加 `@tanstack/react-query` `^5.90.0`（可选 peer）

## 版本和发布命令

版本由 Changesets 管理，配置在仓库根目录 `.changeset/config.json`：

- `access` 为 `restricted`
- `baseBranch` 为 `master`，与当前主分支一致
- `ignore` 包含 `playground`
- `updateInternalDependencies` 为 `patch`：某个内部包升级时，依赖它的包会跟着打 patch

根目录 `package.json` 已有脚本：

```bash
pnpm changeset
pnpm version-packages
pnpm release
```

含义：

1. `pnpm changeset`：记录这次改了哪些包，以及是 major、minor 还是 patch。
2. `pnpm version-packages`：按记录修改各包 `package.json` 的版本，并写 CHANGELOG。这条命令不会自动提交，配置里 `commit` 为 `false`。
3. `pnpm release`：先执行 `pnpm build`，再执行 `changeset publish`。已存在于制品库的版本会被跳过，包按依赖顺序发布。

第一次发布时，如果制品库里还没有这些版本，在干净的 `master` 上直接执行：

```bash
pnpm release
```

这会先重新构建，再把 6 个包当前的 `0.1.0` 推上去。此时版本号已经写在各包的 `package.json` 里，所以不用先做 changeset。

之后每次发布按顺序执行三条命令：

```bash
pnpm changeset
pnpm version-packages
pnpm release
```

`pnpm changeset` 只在 `.changeset/` 里生成一份变更说明，不改版本号。`pnpm version-packages` 读这些说明，改各包 `package.json` 的版本并写 CHANGELOG。`pnpm release` 不升版本，只构建并发布 `package.json` 里当前的版本。跳过中间这条命令时，发布的仍是上次已经发布过的版本，制品库会跳过。`version-packages` 之后先提交版本号和 CHANGELOG，再执行 `pnpm release`。

发布前可以用下面的命令确认某个包是否已经存在：

```bash
npm view @zby/ui version --registry https://packages.aliyun.com/62822d91f26531aa1c5573c8/npm/npm-registry/
```

`404` 表示这个包还没发过。

## 发布前的 registry 配置

仓库根目录 `.npmrc` 已指定 `@zby` 作用域的制品库：

```text
@zby:registry=https://packages.aliyun.com/62822d91f26531aa1c5573c8/npm/npm-registry/
```

这行只决定 `@zby/*` 的发布和安装地址。公共依赖仍走执行机器自己的默认 registry。本仓库里的 `@zby/*` 是 `workspace:*`，日常 `pnpm install` 使用本地包。

访问这个库的令牌是 `_authToken`，也就是密钥。它留在用户目录的 `.npmrc`，或由云效流水线注入。不要把 `_authToken` 写进仓库 `.npmrc`。项目级配置会盖住用户级同名配置，写进仓库后，本机没有对应环境变量时，现有的令牌会失效。

推送账号需要该制品库的写入权限。

再给 6 个可发布包的 `package.json` 加上同样的 `publishConfig.registry`。目前只有 `@zby/router-core` 写了 `publishConfig`，而且只有 `access`。

`access: "restricted"` 是 npmjs 私有包的语义。云效这个库本身只在组织内可用。如果发布时报 access 不支持，把 `.changeset/config.json` 的 `access` 改成 `public`。包仍然只存在于这个制品库。

## 业务项目如何安装

业务项目的 `.npmrc` 指向同一个制品库，并配置本机或 CI 的 token。然后按需安装：

```bash
pnpm add @zby/ui @zby/pro
pnpm add antd@^6.6.4 react react-dom react-router-dom @ant-design/cssinjs
```

只用请求层时安装 `@zby/request`。要用 `@zby/request/react-query`，再安装 `@tanstack/react-query`。

peer 不会自动从公网替业务项目装好。本仓库开启了 `auto-install-peers`，业务项目如果没有同样的设置，需要自己安装上一节列出的 peer。

## 注意事项

- 用 `pnpm release` 发布。它会先构建再发布。不要把磁盘上已有的 `dist` 直接发出去。`@zby/ui` 的导出入口是 `locale/zh_CN` 和 `locale/en_US`，旧的本地 `dist` 可能仍是 `locales/`，和 `package.json`、`tsdown.config.ts` 不一致。
- `@zby/ui` 的 `prepare` 会在打包前执行 `tsc -b src/components/table/rc-table.tsconfig.json`。这一步失败会中断该包的发布。生成目录 `.rc-table-types` 已 gitignore，不会进包。
- `@zby/router-core` 必须和 `@zby/pro` 一起发布，因为它是 pro 的运行时依赖。业务应用不要单独依赖它来做通用路由。
- 6 个包的版本各自独立，`.changeset/config.json` 的 `fixed` 和 `linked` 都是空的。改了 `@zby/ui` 不会自动升 `@zby/pro`，除非有 changeset，或依赖升级触发 `updateInternalDependencies: "patch"`。
- 仓库里目前没有云效流水线配置。`@zby` 的制品库地址已写在仓库 `.npmrc`，发布仍依赖执行机器上的 `_authToken`。
- 不要把 `_authToken` 写进仓库 `.npmrc` 或文档。
