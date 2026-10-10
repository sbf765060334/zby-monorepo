import { useIntl } from '@zby/intl'
import {
  Alert,
  Button,
  Card,
  ConfigProvider,
  Input,
  Pagination,
  Radio,
  Segmented,
  theme as antdTheme,
  Typography,
} from 'antd'
import type { ThemeConfig } from 'antd'
import type { MutableRefObject, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { MinusOutlined, PlusOutlined } from '@ant-design/icons'

import ProLayoutContentContainer from '../content-container'
import type { ProTableFilter } from '../../pro-table/interface'
import ProTable from '../../pro-table/ProTable'
import { deriveSiderPalette } from './siderPalette'

const MIN_ZOOM = 50
const MAX_ZOOM = 150
const ZOOM_STEP = 10

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

/** 右侧预览只消费草稿 token，不写外层主题。 */
export default function ThemeSeedPreview(props: {
  prefixCls: string
  token: ThemeConfig['token']
  algorithm: ThemeConfig['algorithm']
}) {
  const intl = useIntl()
  const root = `${props.prefixCls}-theme-seed`
  const [mode, setMode] = useState<'page' | 'overview'>('page')
  const stageRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef({ x: 0, y: 0, zoom: 100 })
  const labelRef = useRef<(zoom: number) => void>(() => {})
  const frameRef = useRef(0)
  const controllerRef = useRef({
    step(_delta: number) {},
    reset() {},
  })

  useEffect(() => {
    const stage = stageRef.current
    const sheet = sheetRef.current
    if (!stage || !sheet)
      return undefined

    const pageSelector = `.${root}-page`
    const interactiveSelector = 'button, a, input, textarea, select, label'
    const panningClass = `${root}-stage-panning`

    const applyTransform = () => {
      const { x, y, zoom } = viewRef.current
      sheet.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${zoom / 100})`
    }

    const scheduleTransform = () => {
      if (frameRef.current)
        return
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = 0
        applyTransform()
      })
    }

    const zoomAt = (clientX: number, clientY: number, nextZoom: number) => {
      const view = viewRef.current
      const zoom = clampZoom(nextZoom)
      if (zoom === view.zoom)
        return
      const rect = stage.getBoundingClientRect()
      const pointerX = clientX - rect.left
      const pointerY = clientY - rect.top
      const scale = view.zoom / 100
      const nextScale = zoom / 100
      const contentX = (pointerX - view.x) / scale
      const contentY = (pointerY - view.y) / scale
      view.x = pointerX - contentX * nextScale
      view.y = pointerY - contentY * nextScale
      view.zoom = zoom
      applyTransform()
      labelRef.current(zoom)
    }

    const drag = { pointerId: -1, x: 0, y: 0, originX: 0, originY: 0 }
    let dragging = false

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0)
        return
      const target = event.target as HTMLElement | null
      if (!target?.closest(pageSelector) || target.closest(interactiveSelector))
        return
      dragging = true
      drag.pointerId = event.pointerId
      drag.x = event.clientX
      drag.y = event.clientY
      drag.originX = viewRef.current.x
      drag.originY = viewRef.current.y
      stage.setPointerCapture(event.pointerId)
      stage.classList.add(panningClass)
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging || drag.pointerId !== event.pointerId || event.buttons !== 1)
        return
      viewRef.current.x = drag.originX + event.clientX - drag.x
      viewRef.current.y = drag.originY + event.clientY - drag.y
      scheduleTransform()
    }

    const endDrag = (event: PointerEvent) => {
      if (!dragging || drag.pointerId !== event.pointerId)
        return
      dragging = false
      stage.classList.remove(panningClass)
      applyTransform()
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      zoomAt(event.clientX, event.clientY, viewRef.current.zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP))
    }

    applyTransform()
    stage.addEventListener('pointerdown', onPointerDown)
    stage.addEventListener('pointermove', onPointerMove)
    stage.addEventListener('pointerup', endDrag)
    stage.addEventListener('pointercancel', endDrag)
    stage.addEventListener('wheel', onWheel, { passive: false })
    const controller = {
      step(delta: number) {
        const rect = stage.getBoundingClientRect()
        zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, viewRef.current.zoom + delta)
      },
      reset() {
        viewRef.current = { x: 0, y: 0, zoom: 100 }
        applyTransform()
        labelRef.current(100)
      },
    }
    controllerRef.current = controller

    return () => {
      if (frameRef.current)
        cancelAnimationFrame(frameRef.current)
      stage.removeEventListener('pointerdown', onPointerDown)
      stage.removeEventListener('pointermove', onPointerMove)
      stage.removeEventListener('pointerup', endDrag)
      stage.removeEventListener('pointercancel', endDrag)
      stage.removeEventListener('wheel', onWheel)
    }
  }, [root])

  return (
    <section className={`${root}-preview`}>
      <div
        ref={stageRef}
        className={`${root}-stage`}
      >
        <div className={`${root}-stage-switch`}>
          <Segmented
            value={mode}
            onChange={(value) => setMode(value as 'page' | 'overview')}
            options={[
              {
                label: intl.getMessage('zby.pro.layout.seed.previewPage', '页面示例'),
                value: 'page',
              },
              {
                label: intl.getMessage('zby.pro.layout.seed.previewOverview', '风格概览'),
                value: 'overview',
              },
            ]}
          />
        </div>
        <ConfigProvider
          theme={{
            algorithm: props.algorithm,
            token: props.token,
            cssVar: { key: 'zby-theme-seed-preview' },
          }}
        >
          <div ref={sheetRef} className={`${root}-sheet`}>
            {mode === 'page' ? <PageSample prefixCls={props.prefixCls} /> : <StyleOverview prefixCls={props.prefixCls} />}
          </div>
        </ConfigProvider>
        <ZoomControls
          root={root}
          labelRef={labelRef}
          zoomOutLabel={intl.getMessage('zby.pro.layout.seed.zoomOut', '缩小')}
          zoomInLabel={intl.getMessage('zby.pro.layout.seed.zoomIn', '放大')}
          resetLabel={intl.getMessage('zby.pro.layout.seed.zoomReset', '恢复 100%')}
          onStep={(delta) => controllerRef.current.step(delta)}
          onReset={() => controllerRef.current.reset()}
        />
      </div>
    </section>
  )
}

function ZoomControls({
  root,
  labelRef,
  zoomOutLabel,
  zoomInLabel,
  resetLabel,
  onStep,
  onReset,
}: {
  root: string
  labelRef: MutableRefObject<(zoom: number) => void>
  zoomOutLabel: string
  zoomInLabel: string
  resetLabel: string
  onStep: (delta: number) => void
  onReset: () => void
}) {
  const [zoom, setZoom] = useState(100)
  labelRef.current = setZoom

  return (
    <div className={`${root}-zoom`}>
      <Button
        aria-label={zoomOutLabel}
        icon={<MinusOutlined />}
        onClick={() => onStep(-ZOOM_STEP)}
      />
      <Button aria-label={resetLabel} onClick={onReset}>
        {`${zoom}%`}
      </Button>
      <Button
        aria-label={zoomInLabel}
        icon={<PlusOutlined />}
        onClick={() => onStep(ZOOM_STEP)}
      />
    </div>
  )
}

interface PreviewRow {
  id: string
  name: string
  owner: string
  status: string
}

type PreviewQuery = {
  name?: string
}

function PageSample(props: { prefixCls: string }) {
  const intl = useIntl()
  const { token } = antdTheme.useToken()
  const root = `${props.prefixCls}-theme-seed`
  const text = (id: string, fallback: string) => intl.getMessage(`zby.pro.layout.seed.${id}`, fallback)
  const rows = useMemo<PreviewRow[]>(() => [
    { id: '1', name: text('rowNorth', '华北'), owner: 'Lin', status: text('statusDone', '已完成') },
    { id: '2', name: text('rowEast', '华东'), owner: 'Wang', status: text('statusPending', '进行中') },
    { id: '3', name: text('rowSouth', '华南'), owner: 'Chen', status: text('statusDone', '已完成') },
    { id: '4', name: text('rowSouthwest', '西南'), owner: 'Zhao', status: text('statusPending', '进行中') },
  ], [intl])
  const queryRequest = useCallback(async (params: PreviewQuery) => {
    const keyword = typeof params.name === 'string' ? params.name.trim().toLowerCase() : ''
    const data = keyword
      ? rows.filter((row) => row.name.toLowerCase().includes(keyword) || row.owner.toLowerCase().includes(keyword))
      : rows
    return { data, total: data.length }
  }, [rows])
  const columns = useMemo(() => [
    { title: text('columnName', '名称'), dataIndex: 'name' },
    { title: text('columnOwner', '负责人'), dataIndex: 'owner' },
    { title: text('columnStatus', '状态'), dataIndex: 'status' },
  ], [intl])
  const filters = useMemo<ProTableFilter<PreviewQuery>[]>(() => [
    {
      key: 'name',
      label: text('filterName', '名称'),
      render: ({ value, setValue }) => (
        <Input
          allowClear
          placeholder={text('filterName', '名称')}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => {
            setValue(event.target.value || undefined)
          }}
        />
      ),
    },
  ], [intl])
  const controllerConfig = useMemo(() => ({
    rowKey: 'id',
    queryRequest,
    pagination: { defaultPageSize: 10 },
  }), [queryRequest])

  const chromeStart = token.controlHeight + token.paddingSM
  const chromeEnd = token.controlHeight + token.padding

  return (
    <div
      className={`${root}-page`}
      style={{
        display: 'flex',
        boxSizing: 'border-box',
        height: `calc(100% - ${chromeStart + chromeEnd}px)`,
        marginBlockStart: chromeStart,
        marginBlockEnd: chromeEnd,
        minHeight: 0,
        padding: 0,
        background: token.colorBgLayout,
      }}
    >
      <PreviewSider
        items={[
          text('previewTitle', '概览'),
          text('menuOrders', '订单'),
          text('menuUsers', '用户'),
        ]}
      />
      <div style={{
        display: 'flex',
        boxSizing: 'border-box',
        height: '100%',
        minWidth: 0,
        minHeight: 0,
        flex: '1 1 auto',
        flexDirection: 'column',
      }}
      >
        <ProLayoutContentContainer mode="fill" style={{ flex: 1, minHeight: 0 }}>
          <ProTable<PreviewRow, PreviewQuery>
            columnResize={false}
            columns={columns}
            controllerConfig={controllerConfig}
            filters={filters}
            heightMode="fill"
            pagination={{ showSizeChanger: false }}
            style={{ flex: 1, minHeight: 0, height: '100%' }}
          />
        </ProLayoutContentContainer>
      </div>
    </div>
  )
}

function PreviewSider(props: { items: string[] }) {
  const { token } = antdTheme.useToken()
  const palette = deriveSiderPalette(token.colorPrimary)

  return (
    <div style={{
      display: 'flex',
      width: 120,
      flex: '0 0 auto',
      flexDirection: 'column',
      paddingBlock: token.paddingSM,
      background: `linear-gradient(180deg, ${palette.gradientStart} 0%, ${palette.gradientEnd} 100%)`,
      color: palette.text,
    }}
    >
      {props.items.map((item, index) => (
        <div
          key={item}
          style={{
            margin: token.marginXXS,
            paddingBlock: token.paddingXS,
            paddingInline: token.paddingSM,
            borderRadius: token.borderRadiusSM,
            color: index === 0 ? palette.textActive : palette.text,
          }}
        >
          {item}
        </div>
      ))}
      <div style={{ marginBlockStart: 'auto', borderBlockStart: `1px solid ${palette.divider}` }} />
    </div>
  )
}

function StyleOverview(props: { prefixCls: string }) {
  const intl = useIntl()
  const { token } = antdTheme.useToken()
  const root = `${props.prefixCls}-theme-seed`
  const text = (id: string, fallback: string) => intl.getMessage(`zby.pro.layout.seed.${id}`, fallback)

  return (
    <div className={`${root}-page ${root}-catalog`} style={{ background: token.colorBgContainer }}>
      <Catalog prefixCls={props.prefixCls} title={text('color', '颜色')}>
        <CatalogRow prefixCls={props.prefixCls} label={text('colorPrimary', '品牌色')}>
          <Button type="primary">{text('previewButton', '主按钮')}</Button>
        </CatalogRow>
        <CatalogRow prefixCls={props.prefixCls} label={text('colorSuccess', '成功色')}>
          <SeedAlert type="success" title={text('previewSuccessMessage', '这是成功色提示')} />
        </CatalogRow>
        <CatalogRow prefixCls={props.prefixCls} label={text('colorWarning', '警戒色')}>
          <SeedAlert type="warning" title={text('previewWarningMessage', '这是警戒色提示')} />
        </CatalogRow>
        <CatalogRow prefixCls={props.prefixCls} label={text('colorError', '错误色')}>
          <SeedAlert type="error" title={text('previewErrorMessage', '这是错误色提示')} />
        </CatalogRow>
        <CatalogRow prefixCls={props.prefixCls} label={text('colorInfo', '信息色')}>
          <SeedAlert type="info" title={text('previewInfoMessage', '这是信息色提示')} />
        </CatalogRow>
        <CatalogRow prefixCls={props.prefixCls} label={text('colorLink', '链接色')}>
          <Typography.Link href="#" onClick={(event) => event.preventDefault()}>
            {text('previewLink', '查看详情')}
          </Typography.Link>
        </CatalogRow>
        <CatalogRow prefixCls={props.prefixCls} label={text('colorTextBase', '基础文本色')}>
          <span style={{ color: token.colorText, fontSize: token.fontSize }}>
            {text('previewBody', '正文示例')}
          </span>
        </CatalogRow>
        <CatalogRow prefixCls={props.prefixCls} label={text('colorBgBase', '基础背景色')}>
          <div style={{
            padding: token.paddingSM,
            borderRadius: token.borderRadius,
            background: token.colorBgLayout,
          }}
          >
            <div style={{
              padding: token.paddingSM,
              borderRadius: token.borderRadius,
              background: token.colorBgContainer,
              color: token.colorText,
            }}
            >
              {text('previewSurface', '容器背景')}
            </div>
          </div>
        </CatalogRow>
      </Catalog>
      <Catalog prefixCls={props.prefixCls} title={text('size', '尺寸')}>
        <CatalogRow prefixCls={props.prefixCls} label={text('fontSize', '文字')}>
          <span style={{ color: token.colorText, fontSize: token.fontSize }}>
            {text('previewBody', '正文示例')}
          </span>
        </CatalogRow>
        <CatalogRow prefixCls={props.prefixCls} label={text('sizeStep', '尺寸步长')}>
          <Button type="primary">{text('previewButton', '主按钮')}</Button>
          <Input
            style={{ width: 160 }}
            placeholder={text('previewInput', '输入框')}
          />
        </CatalogRow>
        <CatalogRow prefixCls={props.prefixCls} label={text('sizeUnit', '尺寸变化单位')}>
          <div style={{
            display: 'flex',
            gap: token.margin,
            padding: token.padding,
            borderRadius: token.borderRadius,
            background: token.colorFillAlter,
          }}
          >
            <span style={{
              width: token.controlHeight,
              height: token.controlHeight,
              borderRadius: token.borderRadiusSM,
              background: token.colorPrimary,
            }}
            />
            <span style={{
              width: token.controlHeight,
              height: token.controlHeight,
              borderRadius: token.borderRadiusSM,
              background: token.colorSuccess,
            }}
            />
          </div>
        </CatalogRow>
      </Catalog>
      <Catalog prefixCls={props.prefixCls} title={text('style', '风格')}>
        <CatalogRow prefixCls={props.prefixCls} label={text('borderRadius', '圆角')}>
          <Button type="primary">{text('previewButton', '主按钮')}</Button>
          <Input style={{ width: 160 }} placeholder={text('previewInput', '输入框')} />
          <Card size="small">{text('previewCard', '卡片')}</Card>
        </CatalogRow>
        <CatalogRow prefixCls={props.prefixCls} label={text('wireframe', '线框化')}>
          <Radio.Group
            value="checked"
            options={[
              { label: text('previewOption', '选项'), value: 'checked' },
              { label: text('previewOptionAlt', '另一项'), value: 'other' },
            ]}
          />
          <Pagination size="small" total={50} showSizeChanger={false} />
        </CatalogRow>
      </Catalog>
    </div>
  )
}

function SeedAlert(props: { type: 'success' | 'warning' | 'error' | 'info', title: string }) {
  return <Alert showIcon style={{ width: '100%', flex: '1 1 100%' }} type={props.type} title={props.title} />
}

function Catalog(props: { prefixCls: string, title: string, children: ReactNode }) {
  const root = `${props.prefixCls}-theme-seed`
  return (
    <section>
      <h3 className={`${root}-catalog-title`}>{props.title}</h3>
      {props.children}
    </section>
  )
}

function CatalogRow(props: { prefixCls: string, label: string, children: ReactNode }) {
  const root = `${props.prefixCls}-theme-seed`
  return (
    <div className={`${root}-catalog-row`}>
      <div className={`${root}-catalog-label`}>{props.label}</div>
      <div className={`${root}-catalog-demo`}>{props.children}</div>
    </div>
  )
}
