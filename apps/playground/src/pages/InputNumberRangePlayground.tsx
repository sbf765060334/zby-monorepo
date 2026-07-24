import {
  Button,
  Divider,
  Form,
  InputNumber,
  Segmented,
  Space,
  Switch,
  Typography,
  theme,
} from 'antd'
import { useIntl } from '@zby/intl'
import { InputNumberRange } from '@zby/ui'
import React from 'react'

const { Text, Title } = Typography

type RangeStatus = 'default' | 'warning' | 'error'
type RangeValue = [number | string | null, number | string | null]

function ControlField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <Text type="secondary">{label}</Text>
      {children}
    </div>
  )
}

export default function InputNumberRangePlayground() {
  const intl = useIntl()
  const { token } = theme.useToken()
  const [rangeValue, setRangeValue] = React.useState<RangeValue>([10, 30])
  const [formStatus, setFormStatus] = React.useState<RangeStatus>('default')
  const [allowClear, setAllowClear] = React.useState(true)
  const [allowEmpty, setAllowEmpty] = React.useState(true)
  const [order, setOrder] = React.useState(true)

  const status = formStatus === 'default' ? undefined : formStatus
  const startPlaceholder = intl.getMessage('zby.ui.inputNumberRange.startPlaceholder', '最小值')
  const endPlaceholder = intl.getMessage('zby.ui.inputNumberRange.endPlaceholder', '最大值')

  const sectionStyle: React.CSSProperties = {
    display: 'grid',
    gap: 16,
    paddingBlockStart: 20,
    borderBlockStart: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
  }
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
  }
  const caseStyle: React.CSSProperties = {
    display: 'grid',
    gap: 8,
    minWidth: 0,
    padding: 12,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: 8,
    background: token.colorBgContainer,
  }

  const renderCase = (title: string, node: React.ReactNode) => (
    <div style={caseStyle}>
      <Text strong>{title}</Text>
      {node}
    </div>
  )

  return (
    <Space orientation="vertical" size={24} style={{ width: '100%' }}>
      <header>
        <Title level={3} style={{ margin: 0 }}>
          InputNumberRange
        </Title>
        <Text type="secondary">@zby/ui component playground</Text>
      </header>

      <section style={sectionStyle}>
        <Title level={5} style={{ margin: 0 }}>
          核心预览
        </Title>
        <div style={gridStyle}>
          <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
            <ControlField label="Form.Item status">
              <Segmented
                value={formStatus}
                options={[
                  { label: 'Default', value: 'default' },
                  { label: 'Warning', value: 'warning' },
                  { label: 'Error', value: 'error' },
                ]}
                onChange={(value) => setFormStatus(value as RangeStatus)}
              />
            </ControlField>

            <Space wrap>
              <Switch checked={allowClear} onChange={setAllowClear} checkedChildren="清除" />
              <Switch checked={allowEmpty} onChange={setAllowEmpty} checkedChildren="空值" />
              <Switch checked={order} onChange={setOrder} checkedChildren="排序" />
            </Space>

            <Form layout="vertical" style={{ margin: 0 }}>
              <Form.Item
                label="受控范围"
                validateStatus={status}
                hasFeedback={!!status}
                help={status ? `Form status: ${status}` : undefined}
                style={{ margin: 0 }}
              >
                <InputNumberRange
                  value={rangeValue}
                  onChange={(nextValue) => setRangeValue(nextValue)}
                  min={0}
                  max={1000}
                  step={5}
                  precision={0}
                  allowClear={allowClear}
                  allowEmpty={allowEmpty}
                  order={order}
                  suffix="RMB"
                  style={{ width: '100%', maxWidth: 360 }}
                />
              </Form.Item>
            </Form>

            <Space wrap>
              <Button size="small" onClick={() => setRangeValue([10, 30])}>
                10 / 30
              </Button>
              <Button size="small" onClick={() => setRangeValue([60, 20])}>
                60 / 20
              </Button>
              <Button size="small" onClick={() => setRangeValue([null, null])}>
                置空
              </Button>
            </Space>
          </div>

          <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
            <Text type="secondary">placeholder</Text>
            <Text code>
              {startPlaceholder} / {endPlaceholder}
            </Text>
            <Divider style={{ margin: 0 }} />
            <Text type="secondary">controlled value</Text>
            <Text code>{JSON.stringify(rangeValue)}</Text>
            <Divider style={{ margin: 0 }} />
            <Text type="secondary">zby-pro intl smoke</Text>
            <Text>{intl.getMessage('zby.pro.layout.title', '控制台')}</Text>
          </div>
        </div>
      </section>

      <section style={sectionStyle}>
        <Title level={5} style={{ margin: 0 }}>
          状态矩阵
        </Title>
        <div style={gridStyle}>
          {renderCase(
            '默认上下文',
            <InputNumberRange
              defaultValue={[1, 9]}
              allowClear
              suffix="kg"
              style={{ width: '100%' }}
            />,
          )}
          {renderCase(
            'value={undefined} 非受控',
            <InputNumberRange
              value={undefined}
              defaultValue={[5, 15]}
              allowClear
              style={{ width: '100%' }}
            />,
          )}
          {renderCase(
            '整体禁用',
            <InputNumberRange
              defaultValue={[100, 200]}
              disabled
              allowClear
              suffix="pcs"
              style={{ width: '100%' }}
            />,
          )}
          {renderCase(
            '显式 error 状态',
            <InputNumberRange
              defaultValue={[3, 7]}
              status="error"
              allowClear
              style={{ width: '100%' }}
            />,
          )}
          {renderCase(
            '大尺寸 + filled',
            <InputNumberRange
              defaultValue={[8, 18]}
              size="large"
              variant="filled"
              allowClear
              style={{ width: '100%' }}
            />,
          )}
          {renderCase(
            '自定义分隔符',
            <InputNumberRange
              defaultValue={[2, 8]}
              separator="to"
              allowClear
              style={{ width: '100%' }}
            />,
          )}
          {renderCase('inputNumber', <InputNumber style={{ width: '100%' }} />)}
        </div>
      </section>
    </Space>
  )
}
