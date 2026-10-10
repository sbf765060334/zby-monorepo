import { useIntl } from '@zby/intl'
import {
  Button,
  ColorPicker,
  Drawer,
  InputNumber,
  Slider,
  Switch,
} from 'antd'
import { clsx } from 'clsx'
import { useState } from 'react'

import { ANTD_THEME_SEED, THEME_SEED_PRESET_COLORS } from './constants'
import ThemeSeedConfigDialog from './ThemeSeedConfigDialog'
import ThemeSeedPreview from './ThemeSeedPreview'
import { useThemeSeedStyles } from './style'
import {
  applyThemeSeedConfig,
  deriveThemeSeedConfig,
  parseThemeSeedConfig,
  resetThemeSeedConfigField,
  stringifyThemeSeedConfig,
  syncThemeSeedConfigPatch,
  themeSeedConfigEquals,
} from './themeSeedConfig'
import type { ThemeSeedConfig } from './themeSeedConfig'
import type {
  ProThemeAppearance,
  ProThemeDensity,
  ProThemeSeedPreference,
} from './types'
import {
  countThemeSeedChanges,
  resolveThemeAlgorithm,
  toThemeSeedToken,
} from './useThemeSeedPreference'

/** 抽屉由主题菜单打开。草稿留在组件内，确定后才交给外层持久化。 */
export interface ProThemeSeedProps {
  /** 最近一次确定的种子，用来初始化草稿，并判断这次打开后有没有新改动。 */
  value: ProThemeSeedPreference
  /** 最近一次确定的配置正文。缺省时按已偏离默认值的种子生成。 */
  config?: ThemeSeedConfig
  /** 当前实际明暗外观，预览和文本色、背景色的默认解析都用它。 */
  appearance: ProThemeAppearance
  /** 当前布局密度，预览沿用它，抽屉里不再切换。 */
  density: ProThemeDensity
  /** 抽屉是否打开。关闭再打开会丢弃上一次未确定的草稿。 */
  open: boolean
  /** 与 ProLayout 相同的类名前缀，样式挂在抽屉根节点上。 */
  prefixCls: string
  /** 关闭抽屉并丢弃草稿。 */
  onClose: () => void
  /** 确定后提交草稿和配置正文。 */
  onConfirm: (value: ProThemeSeedPreference, config: ThemeSeedConfig) => void
}

const COLOR_FIELDS = [
  ['colorPrimary', 'colorPrimary', '品牌色'],
  ['colorSuccess', 'colorSuccess', '成功色'],
  ['colorWarning', 'colorWarning', '警戒色'],
  ['colorError', 'colorError', '错误色'],
] as const

const NUMBER_FIELDS = [
  ['fontSize', 'fontSize', '文字', 'size', 12, 20],
  ['sizeStep', 'sizeStep', '尺寸步长', 'size', 2, 8],
  ['sizeUnit', 'sizeUnit', '尺寸变化单位', 'size', 2, 8],
  ['borderRadius', 'borderRadius', '圆角', 'style', 0, 16],
] as const

/** 全局种子编辑器。左侧改草稿，右侧只预览草稿。 */
export default function ProThemeSeed(props: ProThemeSeedProps) {
  const {
    appearance,
    config: configProp,
    density,
    onClose,
    onConfirm,
    open,
    prefixCls,
    value,
  } = props
  const intl = useIntl()
  const hashId = useThemeSeedStyles(prefixCls)
  const root = `${prefixCls}-theme-seed`
  const committedConfig = configProp ?? deriveThemeSeedConfig(value)
  const [draft, setDraft] = useState(value)
  const [config, setConfig] = useState<ThemeSeedConfig>(committedConfig)
  const [configOpen, setConfigOpen] = useState(false)
  // 关闭后组件仍挂着，离开动画才播得完。重新打开时把草稿收回已确定的种子。
  const [trackedOpen, setTrackedOpen] = useState(open)
  if (open !== trackedOpen) {
    setTrackedOpen(open)
    if (open) {
      setDraft(value)
      setConfig(configProp ?? deriveThemeSeedConfig(value))
      setConfigOpen(false)
    }
  }
  // 标题上的处数跟 antd 默认种子比。确定按钮只看这次打开后的草稿和配置有没有变。
  const changes = countThemeSeedChanges(draft, ANTD_THEME_SEED)
  const configChanged = !themeSeedConfigEquals(config, committedConfig)
  const sessionDirty = countThemeSeedChanges(draft, value) > 0 || configChanged
  const resetLabel = intl.getMessage('zby.pro.layout.seed.resetField', '重置')

  const patch = (next: Partial<ProThemeSeedPreference>) => {
    setConfig((current) => syncThemeSeedConfigPatch(current, draft, next))
    setDraft((current) => ({ ...current, ...next }))
  }

  const resetField = (key: keyof ProThemeSeedPreference) => {
    setConfig((current) => resetThemeSeedConfigField(current, draft, key))
    setDraft((current) => ({ ...current, [key]: ANTD_THEME_SEED[key] }))
  }

  return (
    <Drawer
      open={open}
      placement="right"
      size="min(1180px, calc(100vw - 32px))"
      destroyOnHidden
      onClose={onClose}
      classNames={{
        root: clsx(root, hashId),
        section: `${root}-section`,
        header: `${root}-header`,
      }}
      styles={{ body: { display: 'flex', padding: 0, overflow: 'hidden' } }}
      title={(
        <span>
          {intl.getMessage('zby.pro.layout.seed.title', '个性化')}
          <span className={`${root}-count`}>
            {intl.getMessage(
              'zby.pro.layout.seed.changes',
              '共 {{count}} 处修改',
              { count: changes },
            )}
          </span>
        </span>
      )}
      extra={(
        <div className={`${root}-actions`}>
          <Button onClick={() => setConfigOpen(true)}>
            {intl.getMessage('zby.pro.layout.seed.config', '主题配置')}
          </Button>
          <Button onClick={() => {
            setDraft({ ...ANTD_THEME_SEED })
            setConfig({})
          }}
          >
            {intl.getMessage('zby.pro.layout.seed.reset', '恢复默认')}
          </Button>
          <Button
            type="primary"
            disabled={!sessionDirty}
            onClick={() => {
              onConfirm(draft, config)
              onClose()
            }}
          >
            {intl.getMessage('zby.pro.layout.seed.confirm', '确定')}
          </Button>
        </div>
      )}
    >
      <div className={`${root}-body`}>
        <aside className={`${root}-seeds`}>
          <section id={`${root}-color`} className={`${root}-group`}>
            <GroupTitle prefixCls={prefixCls} id="color" label={groupLabel('color')} />
            {COLOR_FIELDS.map(([key, token, label]) => (
              <ColorField
                key={key}
                prefixCls={prefixCls}
                label={intl.getMessage(`zby.pro.layout.seed.${key}`, label)}
                token={token}
                resetLabel={resetLabel}
                color={draft[key]}
                onChange={(color) => patch({ [key]: color })}
                onReset={() => resetField(key)}
              />
            ))}
            <div className={clsx(`${root}-field`, `${root}-field-color`)}>
              <div className={`${root}-field-copy`}>
                <FieldMeta
                  prefixCls={prefixCls}
                  label={intl.getMessage('zby.pro.layout.seed.colorInfo', '信息色')}
                  token="colorInfo"
                  resetLabel={resetLabel}
                  onReset={() => resetField('colorInfo')}
                />
              </div>
              <div className={`${root}-field-control`}>
                <div className={`${root}-field-switch`}>
                  <span>{intl.getMessage('zby.pro.layout.seed.followPrimary', '使用主色')}</span>
                  <Switch
                    checked={draft.colorInfo === null}
                    onChange={(checked) => patch({ colorInfo: checked ? null : draft.colorPrimary })}
                  />
                </div>
                {draft.colorInfo !== null ? (
                  <ColorPicker
                    value={draft.colorInfo}
                    disabledAlpha
                    showText
                    presets={[{
                      label: intl.getMessage('zby.pro.layout.seed.colorInfo', '信息色'),
                      colors: [...THEME_SEED_PRESET_COLORS],
                    }]}
                    onChange={(color) => patch({ colorInfo: toHex(color.toHexString()) })}
                  />
                ) : null}
              </div>
            </div>
            <ColorField
              prefixCls={prefixCls}
              label={intl.getMessage('zby.pro.layout.seed.colorLink', '链接色')}
              token="colorLink"
              resetLabel={resetLabel}
              color={draft.colorLink ?? draft.colorPrimary}
              onChange={(colorLink) => patch({ colorLink })}
              onReset={() => resetField('colorLink')}
            />
            <ColorField
              prefixCls={prefixCls}
              label={intl.getMessage('zby.pro.layout.seed.colorTextBase', '基础文本色')}
              token="colorTextBase"
              resetLabel={resetLabel}
              color={draft.colorTextBase ?? (appearance === 'dark' ? '#ffffff' : '#000000')}
              onChange={(colorTextBase) => patch({ colorTextBase })}
              onReset={() => resetField('colorTextBase')}
            />
            <ColorField
              prefixCls={prefixCls}
              label={intl.getMessage('zby.pro.layout.seed.colorBgBase', '基础背景色')}
              token="colorBgBase"
              resetLabel={resetLabel}
              color={draft.colorBgBase ?? (appearance === 'dark' ? '#000000' : '#ffffff')}
              onChange={(colorBgBase) => patch({ colorBgBase })}
              onReset={() => resetField('colorBgBase')}
            />
          </section>
          <section id={`${root}-size`} className={`${root}-group`}>
            <GroupTitle prefixCls={prefixCls} id="size" label={groupLabel('size')} />
            {NUMBER_FIELDS.filter((field) => field[3] === 'size').map((field) => (
              <NumberField
                key={field[0]}
                prefixCls={prefixCls}
                field={field}
                value={draft[field[0]]}
                resetLabel={resetLabel}
                onChange={(next) => patch({ [field[0]]: next })}
                onReset={() => resetField(field[0])}
              />
            ))}
          </section>
          <section id={`${root}-style`} className={`${root}-group`}>
            <GroupTitle prefixCls={prefixCls} id="style" label={groupLabel('style')} />
            {NUMBER_FIELDS.filter((field) => field[3] === 'style').map((field) => (
              <NumberField
                key={field[0]}
                prefixCls={prefixCls}
                field={field}
                value={draft[field[0]]}
                resetLabel={resetLabel}
                onChange={(next) => patch({ [field[0]]: next })}
                onReset={() => resetField(field[0])}
              />
            ))}
            <div className={clsx(`${root}-field`, `${root}-field-color`)}>
              <div className={`${root}-field-copy`}>
                <FieldMeta
                  prefixCls={prefixCls}
                  label={intl.getMessage('zby.pro.layout.seed.wireframe', '线框化')}
                  token="wireframe"
                  resetLabel={resetLabel}
                  onReset={() => resetField('wireframe')}
                />
              </div>
              <div className={`${root}-field-control`}>
                <Switch
                  checked={draft.wireframe}
                  onChange={(wireframe) => patch({ wireframe })}
                />
              </div>
            </div>
          </section>
        </aside>
        <ThemeSeedPreview
          prefixCls={prefixCls}
          token={toThemeSeedToken(draft, appearance)}
          algorithm={resolveThemeAlgorithm(appearance, density)}
        />
      </div>
      <ThemeSeedConfigDialog
        open={configOpen}
        prefixCls={prefixCls}
        hashId={hashId}
        text={stringifyThemeSeedConfig(config)}
        onCancel={() => setConfigOpen(false)}
        onConfirm={(text) => {
          const parsed = parseThemeSeedConfig(text)
          if (!parsed)
            return false
          setConfig(parsed)
          setDraft((current) => applyThemeSeedConfig(parsed, current))
          setConfigOpen(false)
          return true
        }}
      />
    </Drawer>
  )
}

function groupLabel(group: 'color' | 'size' | 'style') {
  if (group === 'color')
    return '颜色'
  if (group === 'size')
    return '尺寸'
  return '风格'
}

function GroupTitle(props: { prefixCls: string, id: string, label: string }) {
  const intl = useIntl()
  return (
    <div className={`${props.prefixCls}-theme-seed-group-title`}>
      {intl.getMessage(`zby.pro.layout.seed.${props.id}`, props.label)}
    </div>
  )
}

function FieldMeta(props: {
  prefixCls: string
  label: string
  token: string
  resetLabel: string
  onReset: () => void
}) {
  const root = `${props.prefixCls}-theme-seed`
  return (
    <>
      <div className={`${root}-field-name`}>{props.label}</div>
      <div className={`${root}-field-meta`}>
        <span>{props.token}</span>
        <button type="button" className={`${root}-reset`} onClick={props.onReset}>
          {props.resetLabel}
        </button>
      </div>
    </>
  )
}

function ColorField(props: {
  prefixCls: string
  label: string
  token: string
  resetLabel: string
  color: string
  hideMeta?: boolean
  onChange: (color: string) => void
  onReset: () => void
}) {
  const root = `${props.prefixCls}-theme-seed`
  return (
    <div className={clsx(`${root}-field`, `${root}-field-color`)}>
      {props.hideMeta ? null : (
        <div className={`${root}-field-copy`}>
          <FieldMeta
            prefixCls={props.prefixCls}
            label={props.label}
            token={props.token}
            resetLabel={props.resetLabel}
            onReset={props.onReset}
          />
        </div>
      )}
      <div className={`${root}-field-control`}>
        <ColorPicker
          value={props.color}
          disabledAlpha
          showText
          presets={[{ label: props.label, colors: [...THEME_SEED_PRESET_COLORS] }]}
          onChange={(color) => props.onChange(toHex(color.toHexString()))}
        />
      </div>
    </div>
  )
}

function NumberField(props: {
  prefixCls: string
  field: typeof NUMBER_FIELDS[number]
  value: number
  resetLabel: string
  onChange: (value: number) => void
  onReset: () => void
}) {
  const intl = useIntl()
  const [key, token, label, , min, max] = props.field
  const root = `${props.prefixCls}-theme-seed`
  const text = intl.getMessage(`zby.pro.layout.seed.${key}`, label)

  return (
    <div className={`${root}-field`}>
      <FieldMeta
        prefixCls={props.prefixCls}
        label={text}
        token={token}
        resetLabel={props.resetLabel}
        onReset={props.onReset}
      />
      <div className={`${root}-number`}>
        <Slider
          className={`${root}-slider`}
          min={min}
          max={max}
          value={props.value}
          ariaLabelForHandle={text}
          onChange={props.onChange}
        />
        <InputNumber
          min={min}
          max={max}
          value={props.value}
          aria-label={text}
          onChange={(next) => commitInteger(next, min, max, props.onChange)}
        />
      </div>
    </div>
  )
}

function toHex(value: string) {
  const normalized = value.trim().toLowerCase()
  return /^#[0-9a-f]{8}$/.test(normalized) ? normalized.slice(0, 7) : normalized
}

function commitInteger(
  value: number | string | null,
  min: number,
  max: number,
  apply: (value: number) => void,
) {
  const numeric = typeof value === 'string' ? Number(value) : value
  if (typeof numeric === 'number' && Number.isInteger(numeric) && numeric >= min && numeric <= max)
    apply(numeric)
}
