---
name: publish-packages
description: 发布本仓库的 @zby 包：依据公开 API 兼容性选择 SemVer 版本级别，编写 changeset、升版本、提交并推送云效和 GitHub，再执行 pnpm release。用于发包、版本升级及相关发布操作。
---

# 发布包

只处理本仓库的 `@zby/*` 包发布。`playground` 不参与发布。不要把 `_authToken` 写进仓库或文档。

可发布的包：`@zby/ui`、`@zby/pro`、`@zby/request`、`@zby/intl`、`@zby/hooks`、`@zby/router-core`。

按顺序做完三步。不要跳过升版本。跳过时 `pnpm release` 会再次发布已经存在的版本，制品库会跳过。

## 1. 写 changeset

先看将要发布的改动，按包归类。一个包一份 `.changeset/*.md`。只给这次有代码改动的包写说明。依赖它的包会由 `updateInternalDependencies: "patch"` 跟着升版本，不要为这种跟随升级单独写 changeset。

### 版本级别

对已进入稳定阶段的包（主版本号至少为 1），按 [SemVer](https://semver.org/lang/zh-CN/) 判断。公开 API 包括对业务暴露的属性、类型、导出、回调签名及文档约定的行为。

| 级别 | 判断依据 | 示例（当前版本为 2.0.5） |
| --- | --- | --- |
| `patch` | 向下兼容的问题修复、恢复约定行为的样式或文案修正 | 修复宽度测量、翻译错误 → 2.0.6 |
| `minor` | 向下兼容的新功能、新可选属性，或保留原功能并标记弃用 | 新增布局配置且保留旧 API → 2.1.0 |
| `major` | 不兼容的公开 API 修改，现有合法用法需要迁移 | 删除 visibleCount/showAll、改名且不兼容旧名、改变回调入参 → 3.0.0 |

判断依据是兼容性，不是改动行数、功能规模或是否内部包。纯内部重构本身不构成 `major`；删除一个已公开的属性也可能需要 `major`。修改默认行为时，检查现有合法用法是否仍满足原有契约。

同一个包的一次发布包含多类变更时，取最高级别：`major > minor > patch`。主版本递增时次版本和修订号归零，次版本递增时修订号归零。每个包独立判断，不因另一个包升主版本就统一升主版本。

`0.x` 是 API 尚未稳定的初始开发阶段，优先沿用该包已有的版本约定；用 `0.3.2 → 0.4.0` 表示破坏性变更是一种常见约定，不是 SemVer 的强制规定。发布 `1.0.0` 表示开始确立稳定的公开 API，应作为明确的稳定化决策。

生成 changeset 前说明每个包的版本级别及理由；破坏性变更在摘要中写明被移除的 API 和迁移方式。

摘要按改动的文件分点，一个文件一条。写清这个文件改了什么。正文不要写 `---`、包名或版本号。

```md
---
"@zby/ui": minor
---

- ActionText.tsx：增加 type="primary"，文案使用主题色
- table/ellipsis.ts：列 ellipsis.rows 大于 1 时表体按行数省略
```

`pnpm changeset` 是交互命令。直接写成上面的文件，效果和执行该命令相同。

## 2. 升版本、提交、推送两个源

执行 `pnpm version-packages`。它会改各包 `package.json` 的版本、写 CHANGELOG，并删掉已消费的 changeset 文件。`commit` 为 `false`，不会自动提交。

然后只提交这些版本文件。提交说明使用：

```text
chore: 发布 @zby/ui@0.3.2 和 @zby/pro@0.3.10
```

版本号用升完之后的实际版本。不要把无关改动放进这次提交。不要强推。

提交成功后，把当前分支推到两个远程：

- `origin`：云效 Codeup，`git@codeup.aliyun.com:62822d91f26531aa1c5573c8/ep-frontend/zby-monorepo.git`
- `github`：`git@github.com:sbf765060334/zby-monorepo.git`

```bash
git push origin HEAD
git push github HEAD
```

任一推送失败就停，不要发布。当前分支不是 `master` 时，先告诉用户再继续。发布配置的 `baseBranch` 是 `master`。

## 3. 发布

保持现有发布命令，不另写发布脚本。

向用户确认即将发布的包和版本。确认后执行：

```bash
pnpm release
```

该命令先 `pnpm build`，再 `changeset publish`。它不升版本，只发布 `package.json` 里的当前版本。不要用磁盘上已有的 `dist` 代替这次构建。
