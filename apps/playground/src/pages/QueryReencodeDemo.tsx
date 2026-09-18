import { Button, Space, Table, Typography } from 'antd'
import { useState } from 'react'
import { createRouterCore } from '@zby/router-core'

import { PlaygroundPage } from '../components/ComponentPlayground'

import type { RouterRoute } from '@zby/router-core'

const demoRoutes: RouterRoute[] = [
  { path: '/search', title: '搜索', element: {} },
]

const CASES = [
  {
    label: '空格写成 %20',
    stringInput: '/search?q=hello%20world',
    objectSearch: 'q=hello%20world',
  },
  {
    label: '逗号分隔 id',
    stringInput: '/search?ids=1,2,3',
    objectSearch: 'ids=1,2,3',
  },
  {
    label: 'JSON 查询',
    stringInput: '/search?filter={"status":"open"}',
    objectSearch: 'filter={"status":"open"}',
  },
  {
    label: '时间里的空格和冒号',
    stringInput: '/search?from=2024-01-01 00:00:00',
    objectSearch: 'from=2024-01-01 00:00:00',
  },
] as const

interface CaseResult {
  key: string
  label: string
  written: string
  stringSent: string
  objectSent: string
  changed: string
}

function lastNavigateTarget(calls: unknown[]) {
  const last = calls[calls.length - 1]
  return typeof last === 'string' ? last : JSON.stringify(last)
}

function runCase(item: (typeof CASES)[number]): CaseResult {
  const stringCalls: unknown[] = []
  const stringRouter = createRouterCore({ routes: demoRoutes, storageAdapter: false })
  stringRouter.bindHost({
    navigate: (target) => {
      stringCalls.push(target)
    },
  })
  stringRouter.syncLocation({ pathname: '/search', search: '', hash: '' })
  stringRouter.jumpTo(item.stringInput)

  const objectCalls: unknown[] = []
  const objectRouter = createRouterCore({ routes: demoRoutes, storageAdapter: false })
  objectRouter.bindHost({
    navigate: (target) => {
      objectCalls.push(target)
    },
  })
  objectRouter.syncLocation({ pathname: '/search', search: '', hash: '' })
  objectRouter.jumpTo({
    pathname: '/search',
    searchParams: item.objectSearch,
  })

  const stringSent = lastNavigateTarget(stringCalls)
  const objectSent = lastNavigateTarget(objectCalls)
  return {
    key: item.label,
    label: item.label,
    written: item.stringInput,
    stringSent,
    objectSent,
    changed: stringSent === objectSent ? '没有改' : '被改写了',
  }
}

export default function QueryReencodeDemoPage() {
  const [rows, setRows] = useState<CaseResult[]>([])

  return (
    <PlaygroundPage
      packageName="@zby/router-core"
      title="查询串编码对照"
      description="这是一套独立的迷你 Core，不走顶栏真实地址。字符串 jumpTo 现在按 URL.search 保留查询串，不再经 URLSearchParams 重编码。%20 和逗号应与对象 jumpTo 一致；未编码的空格或 JSON 仍可能被 URL 解析器收成合法写法。"
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          点下面按钮后看表格。%20 和逗号两组应为「没有改」；JSON、时间里的裸空格若仍不同，那是 URL 解析器自己收的，不是 toString 那一刀。
        </Typography.Paragraph>
        <Button type="primary" onClick={() => setRows(CASES.map(runCase))}>
          跑这几组对照
        </Button>
        <Table<CaseResult>
          rowKey="key"
          pagination={false}
          dataSource={rows}
          columns={[
            { title: '场景', dataIndex: 'label', width: 160 },
            { title: '你写的字符串', dataIndex: 'written' },
            { title: 'jumpTo(字符串) 发给宿主', dataIndex: 'stringSent' },
            { title: 'jumpTo(对象) 发给宿主', dataIndex: 'objectSent' },
            { title: '字符串这条', dataIndex: 'changed', width: 120 },
          ]}
        />
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          字符串形式不再把 hello%20world 改成 hello+world，也不会把 ids=1,2,3 的逗号编码掉。对象 jumpTo 仍然只做拼接。
        </Typography.Paragraph>
      </Space>
    </PlaygroundPage>
  )
}
