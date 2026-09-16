import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = path.resolve('c:/Users/Lenovo/Desktop/demo/zby-monorepo')
const tmp = path.join(root, '.tmp-table-upstream')
const destTable = path.join(root, 'packages/zby-ui/src/components/table')
const destRc = path.join(destTable, 'RcTableInner')

const antd664 = path.join(tmp, 'antd-6.6.4/components/table')
const rc1111 = path.join(tmp, 'rc-table-1.11.1/src')
const rc1104 = path.join(tmp, 'rc-table-1.10.4/src')
const zbyOld = path.join(tmp, 'zby-old-fork')
const zbyOldRc = path.join(zbyOld, 'RcTableInner')

const ANTD_ROOT_PKGS = new Set([
  '_util',
  'config-provider',
  'grid',
  'locale',
  'pagination',
  'spin',
  'theme',
  'tooltip',
  'button',
  'checkbox',
  'dropdown',
  'empty',
  'menu',
  'radio',
  'tree',
  'style',
  'input',
])

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

function rewriteAntdImports(content, fileRel) {
  const dir = path.posix.dirname(fileRel.replaceAll('\\', '/'))
  const depth = dir === '.' ? 0 : dir.split('/').filter(Boolean).length
  const rcPath = `${depth === 0 ? './' : '../'.repeat(depth)}RcTableInner`

  content = content.replaceAll(`from '@rc-component/table'`, `from '${rcPath}'`)

  content = content.replace(/from ['"]((?:\.\.\/)+)([^'"]+)['"]/g, (match, _dots, rest) => {
    const firstSeg = rest.split('/')[0]
    if (ANTD_ROOT_PKGS.has(firstSeg)) {
      return `from 'antd/es/${rest}'`
    }
    return match
  })

  return content
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const file of walk(src)) {
    const rel = path.relative(src, file)
    const to = path.join(dest, rel)
    fs.mkdirSync(path.dirname(to), { recursive: true })
    fs.copyFileSync(file, to)
  }
}

function copyAntdImplementation() {
  const skipDirs = new Set(['demo', '__tests__'])
  const skipFiles = new Set(['index.en-US.md', 'index.zh-CN.md', 'index.md'])

  for (const file of walk(antd664)) {
    const rel = path.relative(antd664, file)
    const parts = rel.split(path.sep)
    if (skipDirs.has(parts[0])) continue
    if (skipFiles.has(parts[parts.length - 1])) continue

    const to = path.join(destTable, rel)
    fs.mkdirSync(path.dirname(to), { recursive: true })

    if (/\.(ts|tsx)$/.test(file)) {
      const fileRel = rel.replaceAll('\\', '/')
      const rewritten = rewriteAntdImports(fs.readFileSync(file, 'utf8'), fileRel)
      fs.writeFileSync(to, rewritten)
    } else {
      fs.copyFileSync(file, to)
    }
  }
}

function restoreZbyOnlyFiles() {
  const keep = [
    'hooks/useColumnEnhance.tsx',
    'hooks/useRowHighlight.ts',
    'hooks/useTableFillLayout.ts',
    'demo/features.tsx',
    '__tests__/index.test.tsx',
    'index.en-US.md',
    'index.zh-CN.md',
    'UPSTREAM.md',
    'RC_TABLE_FORK.md',
    'RC_TABLE_LICENSE.md',
    'env.d.ts',
    'rc-table.tsconfig.json',
  ]
  for (const rel of keep) {
    const from = path.join(zbyOld, rel)
    const to = path.join(destTable, rel)
    fs.mkdirSync(path.dirname(to), { recursive: true })
    fs.copyFileSync(from, to)
  }
}

function mergeRcTable() {
  copyDir(rc1111, destRc)
  const zbyOnly = 'hooks/useColumnResize.tsx'
  fs.copyFileSync(path.join(zbyOldRc, zbyOnly), path.join(destRc, zbyOnly))

  const mergeTargets = [
    'Body/BodyRow.tsx',
    'Cell/index.tsx',
    'FixedHolder/index.tsx',
    'Table.tsx',
    'VirtualTable/VirtualCell.tsx',
    'VirtualTable/index.tsx',
    'context/TableContext.tsx',
    'hooks/useColumns/index.tsx',
    'index.ts',
    'interface.ts',
  ]

  const conflicts = []
  for (const rel of mergeTargets) {
    const current = path.join(destRc, rel)
    const base = path.join(rc1104, rel)
    const other = path.join(zbyOldRc, rel)
    try {
      execFileSync('git', ['merge-file', '--diff3', current, base, other], { stdio: 'pipe' })
    } catch (error) {
      conflicts.push({ rel, status: error.status })
    }
  }
  return conflicts
}

copyAntdImplementation()
const conflicts = mergeRcTable()
restoreZbyOnlyFiles()

console.log(JSON.stringify({ rcConflicts: conflicts }, null, 2))
