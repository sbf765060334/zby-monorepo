import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import {
  collectActiveSearchTagItems,
  createBooleanTagTextResolver,
  createCascaderTagTextResolver,
  createDateRangeTagTextResolver,
  createPrimitiveTagTextResolver,
  createSelectTagTextResolver,
  createTimeRangeTagTextResolver,
  createTimeTagTextResolver,
  createTreeSelectTagTextResolver,
  hasSearchTagText,
  resolveSearchTagText,
} from '..'
import type { ProTableFilter } from '../../interface'

type Query = {
  status?: string
  labels?: string[]
  region?: string[]
  createdAt?: [string, string]
}

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') {
    return ''
  }

  if (Array.isArray(node)) {
    return node.map(textOf).join('')
  }

  return String(node)
}

function field(
  key: keyof Query,
  label: string,
  extra?: Partial<ProTableFilter<Query>>,
): ProTableFilter<Query> {
  return {
    key,
    label,
    render: () => null,
    ...extra,
  } as ProTableFilter<Query>
}

describe('search tags', () => {
  it('collects tags from the draft query and uses close when defaultQuery has no value', () => {
    const tags = collectActiveSearchTagItems<Query>(
      [field('status', '状态')],
      { status: 'open' },
      {},
    )

    expect(tags).toEqual([
      {
        key: 'status',
        label: '状态',
        text: 'open',
        action: 'remove',
        nextValue: undefined,
      },
    ])
  })

  it('uses reset when defaultQuery has a value and hides the action at the default', () => {
    const filters = [field('status', '状态')]

    expect(collectActiveSearchTagItems(filters, { status: 'open' }, { status: 'all' })[0]).toMatchObject({
      action: 'reset',
      nextValue: 'all',
    })
    expect(collectActiveSearchTagItems(filters, { status: 'all' }, { status: 'all' })[0]).toMatchObject({
      action: null,
    })
  })

  it('hides tags when tagVisible returns false', () => {
    expect(
      collectActiveSearchTagItems(
        [field('status', '状态', { tagVisible: (value) => value !== 'all' })],
        { status: 'all' },
        { status: 'all' },
      ),
    ).toEqual([])
  })

  it('formats select labels and collapses extra options with +n', () => {
    const options = [
      { label: '待处理', value: 'pending' },
      { label: '运输中', value: 'shipping' },
      { label: '已完成', value: 'done' },
      { label: '已取消', value: 'canceled' },
      { label: '草稿', value: 'draft' },
    ]
    const formatter = createSelectTagTextResolver({ options })

    expect(textOf(formatter('pending', {}))).toBe('待处理')
    expect(textOf(formatter(['pending', 'shipping', 'done'], {}))).toBe('待处理、运输中、已完成')
    expect(textOf(formatter(['pending', 'shipping', 'done', 'canceled', 'draft'], {}))).toBe(
      '待处理、运输中、已完成 +2',
    )
    expect(
      hasSearchTagText(
        resolveSearchTagText(field('status', '状态', { tagTextFormatter: formatter }), 'pending', {}),
      ),
    ).toBe(true)
  })

  it('formats cascader paths and collapses extra selections with +n', () => {
    const formatter = createCascaderTagTextResolver({
      options: [
        {
          label: '华东',
          value: 'east',
          children: [
            { label: '上海', value: 'sh' },
            { label: '杭州', value: 'hz' },
          ],
        },
        {
          label: '华北',
          value: 'north',
          children: [
            { label: '北京', value: 'bj' },
            { label: '天津', value: 'tj' },
          ],
        },
        {
          label: '华南',
          value: 'south',
          children: [{ label: '广州', value: 'gz' }],
        },
      ],
    })

    expect(textOf(formatter(['east', 'sh'], {}))).toBe('华东 / 上海')
    expect(
      textOf(
        formatter(
          [
            ['east', 'sh'],
            ['east', 'hz'],
            ['north', 'bj'],
            ['north', 'tj'],
            ['south', 'gz'],
          ],
          {},
        ),
      ),
    ).toBe('华东 / 上海、华东 / 杭州、华北 / 北京 +2')
  })

  it('formats date ranges as start ~ end', () => {
    const formatter = createDateRangeTagTextResolver({ format: 'YYYY-MM-DD' })
    expect(textOf(formatter(['2026-08-01', '2026-08-10'], {}))).toBe('2026-08-01 ~ 2026-08-10')
  })

  it('formats primitive, treeSelect, time range and boolean values', () => {
    expect(textOf(createPrimitiveTagTextResolver()(['alpha', '', 'beta'], {}))).toBe('alpha、beta')
    expect(textOf(createPrimitiveTagTextResolver()(undefined, {}))).toBe('')

    const treeSelect = createTreeSelectTagTextResolver({
      options: [
        {
          title: '审批节点',
          value: 'approval',
          children: [{ title: '财务复核', value: 'finance-review' }],
        },
      ],
    })
    expect(textOf(treeSelect([{ value: 'finance-review' }], {}))).toBe('财务复核')

    const timeLike = { format: (pattern: string) => `${pattern}:09:00` }
    expect(textOf(createTimeTagTextResolver({ format: 'HH:mm' })(timeLike, {}))).toBe('HH:mm:09:00')
    expect(
      textOf(
        createTimeRangeTagTextResolver({ format: 'HH:mm' })(
          [timeLike, { format: (pattern: string) => `${pattern}:18:00` }],
          {},
        ),
      ),
    ).toBe('HH:mm:09:00 ~ HH:mm:18:00')

    expect(textOf(createBooleanTagTextResolver({ trueText: '启用', falseText: '停用' })(false, {}))).toBe(
      '停用',
    )
    expect(textOf(createBooleanTagTextResolver()(true, {}))).toBe('是')
  })

  it('falls back to String(value) / array join when tagTextFormatter is omitted', () => {
    expect(textOf(resolveSearchTagText(field('status', '状态'), 'pending', { status: 'pending' }))).toBe(
      'pending',
    )
    expect(
      textOf(resolveSearchTagText(field('labels', '标签'), ['east', 'urgent', 'bonded'], {})),
    ).toBe('east / urgent / bonded')
    expect(textOf(resolveSearchTagText(field('status', '状态'), '', {}))).toBe('')
  })
})
