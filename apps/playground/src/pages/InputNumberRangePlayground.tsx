import {
  CloseSquareFilled,
  DollarOutlined,
  PercentageOutlined,
} from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { InputNumberRange, type InputNumberRangeValue } from '@zby/ui'
import {
  App,
  Button,
  ConfigProvider,
  Form,
  Segmented,
  Space,
  Switch,
  Tag,
  Typography,
  theme,
} from 'antd'
import * as React from 'react'
import {
  PlaygroundCase,
  PlaygroundControl,
  PlaygroundGrid,
  PlaygroundPage,
  PlaygroundSection,
  PlaygroundStatus,
} from '../components/ComponentPlayground'

const { Text } = Typography

type RangeStatus = 'default' | 'warning' | 'error'
type RangeValue = InputNumberRangeValue<number>

export default function InputNumberRangePlayground() {
  const intl = useIntl()
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const [rangeValue, setRangeValue] = React.useState<RangeValue>([10, 30])
  const [formStatus, setFormStatus] = React.useState<RangeStatus>('default')
  const [allowClear, setAllowClear] = React.useState(true)
  const [allowEmpty, setAllowEmpty] = React.useState(true)
  const [order, setOrder] = React.useState(true)
  const [showAutoFocus, setShowAutoFocus] = React.useState(false)
  const [lastEvent, setLastEvent] = React.useState('等待交互')

  const status = formStatus === 'default' ? undefined : formStatus
  const startPlaceholder = intl.getMessage(
    'zby.ui.inputNumberRange.startPlaceholder',
    '最小值',
  )
  const endPlaceholder = intl.getMessage(
    'zby.ui.inputNumberRange.endPlaceholder',
    '最大值',
  )

  const reportEvent = (event: string) => {
    setLastEvent(event)
    void message.success(event)
  }

  return (
    <PlaygroundPage
      title="InputNumberRange"
      description="数字范围的草稿提交、排序、空边界、高精度、分侧属性和外观状态完整预览。"
    >
      <PlaygroundStatus>{lastEvent}</PlaygroundStatus>

      <PlaygroundSection
        title="交互实验台"
        description="输入过程保存在草稿中，离开整个范围、按 Enter 或点击清空时才提交。"
      >
        <PlaygroundGrid minItemWidth={320}>
          <PlaygroundCase title="受控范围">
            <PlaygroundControl label="Form.Item status">
              <Segmented<RangeStatus>
                block
                value={formStatus}
                options={[
                  { label: 'Default', value: 'default' },
                  { label: 'Warning', value: 'warning' },
                  { label: 'Error', value: 'error' },
                ]}
                onChange={setFormStatus}
              />
            </PlaygroundControl>
            <Space wrap>
              <Switch checked={allowClear} onChange={setAllowClear} checkedChildren="清除" />
              <Switch checked={allowEmpty} onChange={setAllowEmpty} checkedChildren="空值" />
              <Switch checked={order} onChange={setOrder} checkedChildren="排序" />
            </Space>
            <Form layout="vertical" style={{ margin: 0 }}>
              <Form.Item
                label="价格范围"
                validateStatus={status}
                hasFeedback={!!status}
                help={status ? `Form status: ${status}` : undefined}
                style={{ margin: 0 }}
              >
                <InputNumberRange
                  value={rangeValue}
                  onChange={(nextValue) => {
                    setRangeValue(nextValue as RangeValue)
                    setLastEvent(`受控范围已提交：${JSON.stringify(nextValue)}`)
                  }}
                  min={0}
                  max={1000}
                  step={5}
                  precision={0}
                  allowClear={allowClear}
                  allowEmpty={allowEmpty}
                  order={order}
                  prefix={<DollarOutlined />}
                  suffix="RMB"
                  style={{ width: '100%' }}
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
          </PlaygroundCase>

          <PlaygroundCase title="实时状态">
            <div style={{ display: 'grid', gap: 8 }}>
              <Text type="secondary">国际化 placeholder</Text>
              <Text code>
                {startPlaceholder} / {endPlaceholder}
              </Text>
              <Text type="secondary">controlled value</Text>
              <Text code>{JSON.stringify(rangeValue)}</Text>
              <Text type="secondary">提交配置</Text>
              <Space wrap>
                <Tag color={order ? 'blue' : 'default'}>order={String(order)}</Tag>
                <Tag color={allowEmpty ? 'green' : 'default'}>
                  allowEmpty={String(allowEmpty)}
                </Tag>
                <Tag color={allowClear ? 'purple' : 'default'}>
                  allowClear={String(allowClear)}
                </Tag>
              </Space>
            </div>
          </PlaygroundCase>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection
        title="值模式与提交规则"
        description="覆盖受控/非受控、自动排序、分侧空边界和自定义清空图标。"
      >
        <PlaygroundGrid>
          <PlaygroundCase
            title="非受控 + 自动排序"
            description="输入 90 / 10 后离开组件，最终提交为 10 / 90。"
          >
            <InputNumberRange
              defaultValue={[90, 10]}
              allowClear
              onChange={(value) => reportEvent(`自动排序提交：${JSON.stringify(value)}`)}
              style={{ width: '100%' }}
            />
          </PlaygroundCase>

          <PlaygroundCase
            title="order=false"
            description="保持业务输入顺序，不自动交换开始值和结束值。"
          >
            <InputNumberRange
              defaultValue={[90, 10]}
              order={false}
              allowClear
              onChange={(value) => reportEvent(`原序提交：${JSON.stringify(value)}`)}
              style={{ width: '100%' }}
            />
          </PlaygroundCase>

          <PlaygroundCase
            title="allowEmpty=[false, true]"
            description="开始值必填，结束值允许为空。"
          >
            <InputNumberRange
              defaultValue={[10, null]}
              allowEmpty={[false, true]}
              onChange={(value) => reportEvent(`单侧空值提交：${JSON.stringify(value)}`)}
              style={{ width: '100%' }}
            />
          </PlaygroundCase>

          <PlaygroundCase title="value={undefined}" description="显式 undefined 仍按非受控模式工作。">
            <InputNumberRange
              value={undefined}
              defaultValue={[5, 15]}
              allowClear
              style={{ width: '100%' }}
            />
          </PlaygroundCase>

          <PlaygroundCase title="自定义 clearIcon">
            <InputNumberRange
              defaultValue={[20, 40]}
              allowClear={{ clearIcon: <CloseSquareFilled /> }}
              onChange={(value) => reportEvent(`自定义清空：${JSON.stringify(value)}`)}
              style={{ width: '100%' }}
            />
          </PlaygroundCase>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection
        title="尺寸、变体与状态"
        description="视觉状态继承 antd InputNumber 和 ConfigProvider 语义。"
      >
        <PlaygroundGrid>
          <PlaygroundCase title="small / middle / large">
            <Space orientation="vertical" style={{ width: '100%' }}>
              <InputNumberRange size="small" defaultValue={[1, 9]} style={{ width: '100%' }} />
              <InputNumberRange defaultValue={[1, 9]} style={{ width: '100%' }} />
              <InputNumberRange size="large" defaultValue={[1, 9]} style={{ width: '100%' }} />
            </Space>
          </PlaygroundCase>

          <PlaygroundCase title="全部 variant">
            <Space orientation="vertical" style={{ width: '100%' }}>
              {(['outlined', 'filled', 'borderless', 'underlined'] as const).map(
                (itemVariant) => (
                  <InputNumberRange
                    key={itemVariant}
                    variant={itemVariant}
                    defaultValue={[2, 8]}
                    prefix={itemVariant}
                    style={{ width: '100%' }}
                  />
                ),
              )}
            </Space>
          </PlaygroundCase>

          <PlaygroundCase title="disabled / readOnly">
            <Space orientation="vertical" style={{ width: '100%' }}>
              <InputNumberRange
                defaultValue={[100, 200]}
                disabled
                allowClear
                suffix="pcs"
                style={{ width: '100%' }}
              />
              <InputNumberRange
                defaultValue={[100, 200]}
                readOnly
                allowClear
                suffix="只读"
                style={{ width: '100%' }}
              />
            </Space>
          </PlaygroundCase>

          <PlaygroundCase title="error / warning">
            <Space orientation="vertical" style={{ width: '100%' }}>
              <InputNumberRange status="error" defaultValue={[3, 7]} style={{ width: '100%' }} />
              <InputNumberRange
                status="warning"
                defaultValue={[3, 7]}
                style={{ width: '100%' }}
              />
            </Space>
          </PlaygroundCase>

          <PlaygroundCase title="ConfigProvider 继承">
            <ConfigProvider componentSize="large" componentDisabled>
              <InputNumberRange defaultValue={[8, 18]} style={{ width: '100%' }} />
            </ConfigProvider>
            <Text type="secondary">继承 large 与 disabled。</Text>
          </PlaygroundCase>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection
        title="数值能力"
        description="覆盖 min/max、step、precision、formatter/parser、stringMode、键盘和滚轮。"
      >
        <PlaygroundGrid>
          <PlaygroundCase title="金额格式化">
            <InputNumberRange
              defaultValue={[1000, 5000]}
              min={0}
              step={100}
              formatter={(value) =>
                value == null ? '' : `¥ ${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
              }
              parser={(value) => Number(value?.replace(/¥\s?|,/g, '') ?? 0)}
              onChange={(value) => reportEvent(`金额提交：${JSON.stringify(value)}`)}
              style={{ width: '100%' }}
            />
          </PlaygroundCase>

          <PlaygroundCase
            title="stringMode 高精度"
            description="排序过程不转换为 Number，避免大整数和高精度小数丢失。"
          >
            <InputNumberRange
              stringMode
              defaultValue={['9007199254740993.01', '9007199254740999.99']}
              step="0.01"
              precision={2}
              onChange={(value) => reportEvent(`高精度提交：${JSON.stringify(value)}`)}
              style={{ width: '100%' }}
            />
          </PlaygroundCase>

          <PlaygroundCase title="step / precision / keyboard / wheel">
            <InputNumberRange
              defaultValue={[0.25, 0.75]}
              min={0}
              max={1}
              step={0.05}
              precision={2}
              keyboard
              changeOnWheel
              suffix={<PercentageOutlined />}
              style={{ width: '100%' }}
            />
          </PlaygroundCase>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection
        title="分侧属性、事件与前缀"
        description="验证 id、placeholder、prefix/suffix、原生字段属性、回调顺序和自定义前缀。"
      >
        <PlaygroundGrid>
          <PlaygroundCase title="整体与分侧装饰">
            <InputNumberRange
              id="price-range"
              placeholder={['最低价格', '最高价格']}
              prefix={<DollarOutlined />}
              separator="至"
              suffix="CNY"
              startProps={{ prefix: '起', suffix: '元' }}
              endProps={{ prefix: '止', suffix: '元' }}
              style={{ width: '100%' }}
            />
            <Text code>price-range-start / price-range-end</Text>
          </PlaygroundCase>

          <PlaygroundCase title="startProps / endProps">
            <InputNumberRange
              id={{ start: 'custom-start', end: 'custom-end' }}
              startProps={{
                name: 'minimum',
                autoComplete: 'off',
                inputMode: 'decimal',
                pattern: '[0-9.]*',
                'aria-label': '业务最小值',
                'data-side': 'start',
                onFocus: () => setLastEvent('startProps.onFocus'),
                onChange: (value) => setLastEvent(`startProps.onChange：${value}`),
                onPressEnter: () => setLastEvent('startProps.onPressEnter'),
              }}
              endProps={{
                name: 'maximum',
                tabIndex: 2,
                'aria-label': '业务最大值',
                'data-side': 'end',
                onInput: (value) => setLastEvent(`endProps.onInput：${value}`),
                onBlur: () => setLastEvent('endProps.onBlur'),
              }}
              onFocus={(_, info) => setLastEvent(`组件 onFocus：${info.range}`)}
              onBlur={(_, info) => setLastEvent(`组件 onBlur：${info.range}`)}
              onChange={(value) => reportEvent(`范围提交：${JSON.stringify(value)}`)}
              style={{ width: '100%' }}
            />
          </PlaygroundCase>

          <PlaygroundCase title="autoFocus">
            <Switch
              checked={showAutoFocus}
              onChange={setShowAutoFocus}
              checkedChildren="已挂载"
              unCheckedChildren="点击挂载"
            />
            {showAutoFocus ? (
              <InputNumberRange autoFocus defaultValue={[1, 2]} style={{ width: '100%' }} />
            ) : (
              <Text type="secondary">开启后挂载组件并自动聚焦 start。</Text>
            )}
          </PlaygroundCase>

          <PlaygroundCase title="className / rootClassName / prefixCls">
            <InputNumberRange
              prefixCls="preview-input-number-range"
              className="input-number-range-class"
              rootClassName="input-number-range-root-class"
              defaultValue={[6, 12]}
              style={{ width: '100%', borderColor: token.colorPrimary }}
            />
            <Text code>preview-input-number-range</Text>
          </PlaygroundCase>
        </PlaygroundGrid>
      </PlaygroundSection>
    </PlaygroundPage>
  )
}
