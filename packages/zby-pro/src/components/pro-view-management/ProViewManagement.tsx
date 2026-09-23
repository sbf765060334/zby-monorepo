import {
  DownOutlined,
  ExclamationCircleFilled,
} from '@ant-design/icons'
import { useEvent } from '@rc-component/util'
import { useIntl } from '@zby/intl'
import { ActionIcon } from '@zby/ui'
import { Button, ConfigProvider, Dropdown, Flex, message, Tooltip } from 'antd'
import { clsx } from 'clsx'
import * as React from 'react'

import { createIndexedDBProViewManagementAdapter } from './adapters'
import type {
  ProViewManagementProps,
  ProViewManagementStorageState,
  ProViewManagementView,
  ViewCreateMode,
} from './interface'
import useStyle from './style'
import {
  buildViewId,
  DEFAULT_PREFIX_CLS,
  normalizeCustomViews,
  normalizeSystemViews,
  resolveActiveView,
  resolveDirty,
  validateCreateViewName,
  type ViewNameValidationMessages,
} from './utils'
import { ViewCreateModal } from './ViewCreateModal'
import { ViewManagementModal } from './ViewManagementModal'
import { ViewSelector } from './ViewSelector'

type PendingApply<TSnapshot> = {
  viewId: string
  baseSnapshot: TSnapshot
}

type ApplyViewOptions = {
  persistActiveView?: boolean
}

function getViewCounts<TSnapshot>(
  views: ProViewManagementView<TSnapshot>[],
  viewCounts: Record<string, number | undefined | null> | undefined,
) {
  if (!viewCounts) {
    return {}
  }

  return views.reduce<Record<string, number | undefined | null>>(
    (result, view) => {
      result[view.id] = viewCounts[view.id]
      return result
    },
    {},
  )
}

export default function ProViewManagement<TSnapshot = unknown>({
  adapter: adapterProp,
  className,
  currentSnapshot,
  defaultSnapshot,
  dirty,
  getViewCount,
  initialStorageState,
  instanceId,
  isSnapshotEqual,
  loadError: loadErrorProp,
  loading: loadingProp,
  maxCustomViews,
  onActiveViewChange,
  onApplyView,
  onLoadError,
  onResetView,
  onRetryLoad,
  onSaveView,
  onViewsChange,
  popupWidth,
  prefixCls: customizePrefixCls,
  rootClassName,
  showCount = false,
  style,
  systemViews,
  viewCounts,
}: ProViewManagementProps<TSnapshot>) {
  const intl = useIntl()
  const [messageApi, messageContextHolder] = message.useMessage()
  const locale = intl.locale
  const { getPrefixCls } = React.useContext(ConfigProvider.ConfigContext)
  const prefixCls = getPrefixCls(DEFAULT_PREFIX_CLS, customizePrefixCls)
  const [hashId, cssVarCls] = useStyle(prefixCls)
  const popupRootClassName = clsx(prefixCls, hashId, cssVarCls)
  const viewNameValidationMessages =
    React.useMemo<ViewNameValidationMessages>(
      () => ({
        required: intl.getMessage(
          'zby.pro.viewManagement.viewRequired',
          '请输入视图名称',
        ),
        duplicated: intl.getMessage(
          'zby.pro.viewManagement.viewDuplicated',
          '视图名称已存在',
        ),
        maxCustomViews: (count) =>
          intl.getMessage(
            'zby.pro.viewManagement.maxCustomViews',
            '最多只能创建 {{count}} 个自定义视图',
            { count },
          ),
      }),
      // IntlShape keeps its identity when i18next changes language, so locale is
      // intentionally included to refresh the validation messages.
      [intl, locale],
    )
  const adapter = React.useMemo(
    () =>
      adapterProp ?? createIndexedDBProViewManagementAdapter<TSnapshot>(),
    [adapterProp],
  )
  const normalizedSystemViews = React.useMemo(
    () => normalizeSystemViews(systemViews),
    [systemViews],
  )
  const initialCustomViews = React.useMemo(
    () => normalizeCustomViews(initialStorageState?.views ?? []),
    [initialStorageState],
  )
  const initialActiveViewId = React.useMemo(
    () =>
      resolveActiveView(
        initialStorageState?.activeViewId ?? null,
        normalizedSystemViews,
        initialCustomViews,
      )?.id ?? null,
    [
      initialCustomViews,
      initialStorageState?.activeViewId,
      normalizedSystemViews,
    ],
  )
  const [customViews, setCustomViews] = React.useState<
    ProViewManagementView<TSnapshot>[]
  >(initialCustomViews)
  const [activeViewId, setActiveViewIdState] = React.useState<string | null>(
    initialActiveViewId,
  )
  const [createMode, setCreateMode] = React.useState<ViewCreateMode>('create')
  const [createOpen, setCreateOpen] = React.useState(false)
  const [managerOpen, setManagerOpen] = React.useState(false)
  const [pendingApply, setPendingApply] =
    React.useState<PendingApply<TSnapshot> | null>(null)
  const externalLoadControlled =
    loadingProp !== undefined ||
    loadErrorProp !== undefined ||
    onRetryLoad !== undefined
  const shouldUseInternalLoad = !initialStorageState && !externalLoadControlled
  const [internalLoading, setInternalLoading] = React.useState(
    shouldUseInternalLoad,
  )
  const [internalLoadError, setInternalLoadError] = React.useState<unknown>()
  const [retryingLoad, setRetryingLoad] = React.useState(false)
  const [loadVersion, setLoadVersion] = React.useState(0)
  const onActiveViewChangeEvent = useEvent(
    (view: ProViewManagementView<TSnapshot>) => onActiveViewChange?.(view),
  )
  const onApplyViewEvent = useEvent(
    (view: ProViewManagementView<TSnapshot>) => onApplyView?.(view),
  )
  const onLoadErrorEvent = useEvent(
    (
      error: unknown,
      info: { instanceId: string; retry: () => void | Promise<void> },
    ) => onLoadError?.(error, info),
  )
  const onResetViewEvent = useEvent(
    (view: ProViewManagementView<TSnapshot>) => onResetView?.(view),
  )
  const onRetryLoadEvent = useEvent(() => onRetryLoad?.())
  const onSaveViewEvent = useEvent(
    (view: ProViewManagementView<TSnapshot>) => onSaveView?.(view),
  )
  const onViewsChangeEvent = useEvent(
    (views: ProViewManagementView<TSnapshot>[]) => onViewsChange?.(views),
  )
  const getCurrentSnapshot = useEvent(() => currentSnapshot)
  const hasApplyView = useEvent(() => typeof onApplyView === 'function')
  const allViews = React.useMemo(
    () => normalizedSystemViews.concat(customViews),
    [customViews, normalizedSystemViews],
  )
  const activeView = resolveActiveView(
    activeViewId,
    normalizedSystemViews,
    customViews,
  )
  const dirtyBySnapshot = resolveDirty(
    dirty,
    activeView,
    currentSnapshot,
    isSnapshotEqual,
  )
  const suppressApplyingDirty =
    typeof dirty !== 'boolean' &&
    Boolean(pendingApply) &&
    pendingApply?.viewId === activeView?.id &&
    pendingApply.baseSnapshot === currentSnapshot
  const mergedDirty = suppressApplyingDirty ? false : dirtyBySnapshot
  const [asyncCounts, setAsyncCounts] = React.useState<
    Record<string, number | undefined | null>
  >({})
  const counts = viewCounts ? getViewCounts(allViews, viewCounts) : asyncCounts
  const loading = (loadingProp ?? internalLoading) || retryingLoad
  const loadError = retryingLoad
    ? undefined
    : (loadErrorProp ?? internalLoadError)
  const storageUnavailable = loading || Boolean(loadError)

  const markPendingApply = React.useCallback((viewId: string) => {
    if (!hasApplyView()) {
      return
    }

    setPendingApply({
      viewId,
      baseSnapshot: getCurrentSnapshot(),
    })
  }, [getCurrentSnapshot, hasApplyView])

  const emitViewsChange = React.useCallback(
    (nextCustomViews: ProViewManagementView<TSnapshot>[]) => {
      onViewsChangeEvent?.(normalizedSystemViews.concat(nextCustomViews))
    },
    [normalizedSystemViews, onViewsChangeEvent],
  )

  const persist = React.useCallback(
    (
      recipe: (
        current: ProViewManagementStorageState<TSnapshot>,
      ) => ProViewManagementStorageState<TSnapshot>,
    ) =>
      adapter.update(instanceId, (current) =>
        recipe({
          views: normalizeCustomViews(current.views ?? []),
          activeViewId: current.activeViewId,
        })),
    [adapter, instanceId],
  )

  const setActiveView = React.useCallback(
    async (
      view: ProViewManagementView<TSnapshot>,
      options?: ApplyViewOptions,
    ) => {
      setActiveViewIdState(view.id)
      if (options?.persistActiveView !== false) {
        await persist((current) => ({
          ...current,
          activeViewId: view.id,
        }))
      }
      onActiveViewChangeEvent?.(view)
    },
    [onActiveViewChangeEvent, persist],
  )

  const applyView = React.useCallback(
    async (
      view: ProViewManagementView<TSnapshot>,
      options?: ApplyViewOptions,
    ) => {
      markPendingApply(view.id)
      await setActiveView(view, options)
      await onApplyViewEvent?.(view)
    },
    [markPendingApply, onApplyViewEvent, setActiveView],
  )

  const applyLoadedStorageState = React.useCallback(
    (
      storageState: Partial<ProViewManagementStorageState<TSnapshot>>,
      options: {
        applyActiveView: boolean
      },
    ) => {
      const nextCustomViews = normalizeCustomViews(storageState.views ?? [])
      const nextActiveView = resolveActiveView(
        storageState.activeViewId ?? null,
        normalizedSystemViews,
        nextCustomViews,
      )

      if (options.applyActiveView && nextActiveView) {
        markPendingApply(nextActiveView.id)
      }
      setCustomViews(nextCustomViews)
      setActiveViewIdState(nextActiveView?.id ?? null)
      onViewsChangeEvent?.(normalizedSystemViews.concat(nextCustomViews))
      if (options.applyActiveView && nextActiveView) {
        void onApplyViewEvent?.(nextActiveView)
      }
    },
    [
      markPendingApply,
      normalizedSystemViews,
      onApplyViewEvent,
      onViewsChangeEvent,
    ],
  )

  const handleRetryLoad = React.useCallback(async () => {
    setRetryingLoad(true)

    if (onRetryLoad) {
      await onRetryLoadEvent?.()
      return
    }

    setInternalLoading(true)
    setInternalLoadError(undefined)
    setLoadVersion((version) => version + 1)
  }, [onRetryLoad, onRetryLoadEvent])

  const validateCreateName = React.useCallback(
    async (name: string) => {
      return validateCreateViewName(
        {
          customViews,
          maxCustomViews,
          mode: createMode,
          name,
          systemViews: normalizedSystemViews,
        },
        viewNameValidationMessages,
      )
    },
    [
      createMode,
      customViews,
      maxCustomViews,
      normalizedSystemViews,
      viewNameValidationMessages,
    ],
  )

  React.useEffect(() => {
    if (retryingLoad && !loadErrorProp) {
      // This mirrors the externally controlled retry state after the parent clears the error.
      setRetryingLoad(false)
    }
  }, [loadErrorProp, retryingLoad])

  React.useEffect(() => {
    if (
      pendingApply &&
      (activeView?.id !== pendingApply.viewId ||
        currentSnapshot !== pendingApply.baseSnapshot)
    ) {
      // Clear the dirty-suppression marker once the applied snapshot has changed.
      setPendingApply(null)
    }
  }, [activeView?.id, currentSnapshot, pendingApply])

  React.useEffect(() => {
    let cancelled = false

    if (initialStorageState) {
      // Preloaded state is intentionally pushed into the local state machine once on mount/update.
      applyLoadedStorageState(initialStorageState, { applyActiveView: false })
      return () => {
        cancelled = true
      }
    }

    if (!shouldUseInternalLoad) {
      return () => {
        cancelled = true
      }
    }

    setInternalLoading(true)
    setInternalLoadError(undefined)

    adapter
      .load(instanceId)
      .then((state) => {
        if (cancelled) {
          return
        }

        setInternalLoading(false)
        applyLoadedStorageState(state, { applyActiveView: true })
      })
      .catch((error) => {
        if (cancelled) {
          return
        }

        setInternalLoading(false)
        setInternalLoadError(error)
        onLoadErrorEvent?.(error, {
          instanceId,
          retry: handleRetryLoad,
        })
      })

    return () => {
      cancelled = true
    }
  }, [
    adapter,
    applyLoadedStorageState,
    handleRetryLoad,
    initialStorageState,
    instanceId,
    loadVersion,
    onLoadErrorEvent,
    shouldUseInternalLoad,
  ])

  React.useEffect(() => {
    if (storageUnavailable || !showCount || viewCounts || !getViewCount) {
      return
    }

    let cancelled = false

    Promise.all(
      allViews.map(async (view) => {
        const count = await getViewCount(view)
        return [view.id, count] as const
      }),
    ).then((entries) => {
      if (cancelled) {
        return
      }

      setAsyncCounts(Object.fromEntries(entries))
    })

    return () => {
      cancelled = true
    }
  }, [
    allViews,
    getViewCount,
    storageUnavailable,
    showCount,
    viewCounts,
  ])

  const handleSelectView = async (viewId: string) => {
    const nextView = allViews.find((view) => view.id === viewId)

    if (loadError && nextView?.scope !== 'system') {
      return
    }

    if (nextView) {
      await applyView(nextView, {
        persistActiveView: !(loadError && nextView.scope === 'system'),
      })
    }
  }

  const handleCreate = async (name: string) => {
    const validationMessage = await validateCreateName(name)

    if (validationMessage) {
      throw new Error(validationMessage)
    }

    const snapshot = createMode === 'saveAs' ? currentSnapshot : defaultSnapshot
    const nextView: ProViewManagementView<TSnapshot> = {
      id: buildViewId(),
      name,
      scope: 'custom',
      order: customViews.length,
      snapshot,
    }
    const nextCustomViews = normalizeCustomViews(customViews.concat(nextView))

    await persist((current) => ({
      views: normalizeCustomViews(current.views.concat(nextView)),
      activeViewId: nextView.id,
    }))
    setCustomViews(nextCustomViews)
    emitViewsChange(nextCustomViews)
    setCreateOpen(false)
    void messageApi.success(
      createMode === 'saveAs'
        ? intl.getMessage(
            'zby.pro.viewManagement.saveAsSuccess',
            '已另存为“{{name}}”',
            { name },
          )
        : intl.getMessage(
            'zby.pro.viewManagement.createSuccess',
            '已新建视图“{{name}}”',
            { name },
          ),
    )
    void applyView(nextView, { persistActiveView: false }).catch(() => undefined)
  }

  const handleSave = async () => {
    if (!activeView) {
      return
    }

    if (activeView.scope === 'system') {
      setCreateMode('saveAs')
      setCreateOpen(true)
      return
    }

    const nextView = {
      ...activeView,
      snapshot: currentSnapshot,
    }
    const nextCustomViews = normalizeCustomViews(
      customViews.map((view) => (view.id === nextView.id ? nextView : view)),
    )

    await persist((current) => ({
      ...current,
      views: normalizeCustomViews(
        current.views.map((view) =>
          view.id === nextView.id ? nextView : view,
        ),
      ),
    }))
    setCustomViews(nextCustomViews)
    emitViewsChange(nextCustomViews)
    void messageApi.success(
      intl.getMessage('zby.pro.viewManagement.saveSuccess', '保存成功'),
    )
    await onSaveViewEvent?.(nextView)
    await setActiveView(nextView)
  }

  const handleConfirmViews = async (
    nextCustomViews: ProViewManagementView<TSnapshot>[],
  ) => {
    const normalized = normalizeCustomViews(nextCustomViews)
    const activeWasRemoved = Boolean(
      activeView &&
      activeView.scope === 'custom' &&
      !normalized.some((view) => view.id === activeView.id),
    )

    await persist((current) => ({
      views: normalized,
      activeViewId:
        current.activeViewId &&
        normalized.some((view) => view.id === current.activeViewId)
          ? current.activeViewId
          : undefined,
    }))
    setCustomViews(normalized)
    emitViewsChange(normalized)
    setManagerOpen(false)
    void messageApi.success(
      intl.getMessage('zby.pro.viewManagement.manageSaveSuccess', '视图已保存'),
    )

    if (!activeWasRemoved) {
      return
    }

    const nextActiveView = resolveActiveView(
      null,
      normalizedSystemViews,
      normalized,
    )

    if (nextActiveView) {
      void applyView(nextActiveView).catch(() => undefined)
    } else {
      setActiveViewIdState(null)
    }
  }

  return (
    <>
      {/* message.useMessage 的 holder 必须留在当前主题上下文中，提示层才能继承正确 token。 */}
      {messageContextHolder}
      <Flex
        className={clsx(
          prefixCls,
          hashId,
          cssVarCls,
          className,
          rootClassName,
        )}
        style={style}
        align="center"
        gap="small"
        wrap="wrap"
      >
        <ViewSelector
          actionsDisabled={storageUnavailable}
          activeView={activeView}
          counts={counts}
          customViews={customViews}
          customViewsDisabled={Boolean(loadError)}
          disabled={loading}
          loadError={loadError}
          loading={loading}
          onCreate={() => {
            setCreateMode('create')
            setCreateOpen(true)
          }}
          onManage={() => setManagerOpen(true)}
          onSelect={handleSelectView}
          popupRootClassName={popupRootClassName}
          popupWidth={popupWidth}
          prefixCls={prefixCls}
          showCount={showCount}
          systemViews={normalizedSystemViews}
        />
        {loadError ? (
          <Tooltip
            title={intl.getMessage(
              'zby.pro.viewManagement.loadErrorRetry',
              '视图加载失败，点击重新获取',
            )}
          >
            <ActionIcon
              aria-label={intl.getMessage(
                'zby.pro.viewManagement.loadErrorRetry',
                '视图加载失败，点击重新获取',
              )}
              danger
              icon={<ExclamationCircleFilled />}
              size="small"
              onClick={() => {
                void handleRetryLoad()
              }}
            />
          </Tooltip>
        ) : null}
        {mergedDirty ? (
          <Flex
            className={`${prefixCls}-actions`}
            align="center"
            gap="small"
          >
            <Flex align="center" gap={0}>
              <Dropdown
                trigger={['click']}
                menu={{
                  items: [
                    {
                      key: 'save',
                      label: intl.getMessage(
                        'zby.pro.viewManagement.save',
                        '保存',
                      ),
                      disabled:
                      storageUnavailable || activeView?.scope === 'system',
                    },
                    {
                      key: 'saveAs',
                      label: intl.getMessage(
                        'zby.pro.viewManagement.saveAs',
                        '另存为',
                      ),
                      disabled: storageUnavailable,
                    },
                  ],
                  onClick: ({ key }) => {
                    if (storageUnavailable) {
                      return
                    }

                    if (key === 'save') {
                      void handleSave()
                      return
                    }

                    setCreateMode('saveAs')
                    setCreateOpen(true)
                  },
                }}
              >
                <Button
                  color="default"
                  disabled={storageUnavailable}
                  variant="filled"
                  icon={<DownOutlined />}
                  iconPlacement="end"
                >
                  {intl.getMessage('zby.pro.viewManagement.save', '保存')}
                </Button>
              </Dropdown>
            </Flex>
            <Button
              color="default"
              variant="filled"
              disabled={storageUnavailable || !activeView}
              onClick={() => {
                if (activeView) {
                  void onResetViewEvent?.(activeView)
                }
              }}
            >
              {intl.getMessage('zby.pro.viewManagement.reset', '重置')}
            </Button>
          </Flex>
        ) : null}
        <ViewCreateModal
          mode={createMode}
          open={createOpen}
          rootClassName={clsx(
            `${prefixCls}-create-modal`,
            popupRootClassName,
          )}
          onCancel={() => setCreateOpen(false)}
          onCreate={handleCreate}
          validateName={validateCreateName}
        />
        <ViewManagementModal
          customViews={customViews}
          open={managerOpen}
          prefixCls={prefixCls}
          rootClassName={clsx(
            `${prefixCls}-manager-modal`,
            popupRootClassName,
          )}
          systemViews={normalizedSystemViews}
          onCancel={() => setManagerOpen(false)}
          onConfirm={handleConfirmViews}
        />
      </Flex>
    </>
  )
}
