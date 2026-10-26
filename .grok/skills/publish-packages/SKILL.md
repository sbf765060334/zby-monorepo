---
name: publish-packages
description: 按仓库发布流程给 @zby 包写 changeset、升版本、提交并推送到云效和 GitHub，再执行 pnpm release。用户说发布、升版本、changeset、version-packages、推送两个源或发布包时使用。
---

# 发布包

只处理本仓库的 `@zby/*` 包发布。`playground` 不参与发布。不要把 `_authToken` 写进仓库或文档。

可发布的包：`@zby/ui`、`@zby/pro`、`@zby/request`、`@zby/intl`、`@zby/hooks`、`@zby/router-core`。

按顺序做完三步。不要跳过升版本。跳过时 `pnpm release` 会再次发布已经存在的版本，制品库会跳过。

## 1. 写 changeset

先看将要发布的改动，按包归类。一个包一份 `.changeset/*.md`。只给这次有代码改动的包写说明。依赖它的包会由 `updateInternalDependencies: "patch"` 跟着升版本，不要为这种跟随升级单独写 changeset。

版本级别：

- 小更新、修复、样式或文案调整：`patch`
- 功能变更：`minor`
- 破坏性更新：`major`

摘要按改动的文件分点，一个文件一条。写清这个文件改了什么。正文不要写 `---`、包名或版本号。

```md
---
"@zby/ui": patch
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
