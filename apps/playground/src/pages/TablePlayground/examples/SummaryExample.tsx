import { Table } from '@zby/ui'

import { PlaygroundCase } from '../../../components/ComponentPlayground'
import { contentColumns } from '../columns'
import { normalData } from '../data'
import type { OrderRecord } from '../data'

const rows = normalData.slice(0, 6)
const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0)

export default function SummaryExample() {
  return (
    <PlaygroundCase
      title="汇总行"
      description="summary 固定在表体底部，金额列右对齐汇总。"
    >
      <Table<OrderRecord>
        rowKey="id"
        size="small"
        columns={contentColumns.slice(0, 5)}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 730, y: 320 }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={4}>
                合计
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                ¥ {totalAmount.toLocaleString('zh-CN')}
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </PlaygroundCase>
  )
}
