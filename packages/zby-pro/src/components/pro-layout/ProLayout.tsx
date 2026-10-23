import { DEFAULT_LOCALE, mergeIntlResources, useIntl, ZbyIntlProvider } from '@zby/intl'
import { useRouterCoreSelector } from '@zby/router-core/react'
import { toIntlResources } from '@zby/ui'
import { App, ConfigProvider, Layout } from 'antd'
import { clsx } from 'clsx'
import { memo, useContext, useEffect, useMemo, useState } from 'react'

import type { RouterCoreState } from '@zby/router-core'
import { zbyProIntlResources } from '../../locale/intl-resources'
import Header from './header'
import ProLocaleSwitch from './locale/LocaleSwitch'
import ProRouteSearch from './search/RouteSearch'
import { useLocalePreference } from './locale/useLocalePreference'
import IconDrawerMenu from './menu'
import { ProLayoutProvider } from './metrics/ProLayoutMetricsContext'
import { PageContent } from './page'
import PageProgressProvider from './page-progress'
import useProLayoutStyles from './styles'
import { PRO_LAYOUT_THEME_VIEW_TRANSITION_NAME } from './theme/constants'
import ProThemeSwitch from './theme/ThemeSwitch'
import { useThemePreference } from './theme/useThemePreference'
import {
  resolveThemeAlgorithm,
  toThemeSeedToken,
  useThemeSeedPreference,
} from './theme/useThemeSeedPreference'
import { resolveProLayoutTitle } from './title'
import type { UseLocalePreferenceReturn } from './locale/useLocalePreference'
import type {
  UseThemePreferenceReturn,
  UseThemeSeedPreferenceReturn,
} from './theme/types'
import type { ProLayoutLocaleConfig, ProLayoutProps, ProLayoutRoute } from './types'

function toLocaleResources(option: ProLayoutLocaleConfig) {
  if (!option.pack)
    return undefined

  // 资源挂在菜单 key 上。key 和 pack.locale 不一致时，仍然能被当前语言读到。
  const messages = toIntlResources(option.pack)[option.pack.locale]
  return messages ? { [option.key]: messages } : undefined
}

const BUILTIN_LOCALES: ProLayoutLocaleConfig[] = [
  { key: 'zh-CN', label: '简体中文' },
  { key: 'en-US', label: 'English' },
  { key: 'vi-VN', label: 'Tiếng Việt' },
  { key: 'my-MM', label: 'မြန်မာ' },
]

/**
 * ProLayout 的纯 UI 外壳。
 *
 * 主题、语言和种子只在这里创建一次，并写进内部的 ConfigProvider、App 和语言包。
 * 菜单、页签、面包屑和页面内容仍接入同一个 RouterCore 实例。
 */
function ProLayout(props: ProLayoutProps) {
  const {
    app = true,
    configProvider,
    defaultLocale,
    defaultTheme,
    defaultThemeSeed,
    locales,
    ...layoutProps
  } = props
  const localeOptions = locales?.length ? locales : BUILTIN_LOCALES
  const allowedLocales = useMemo(
    () => localeOptions.map((item) => item.key),
    [localeOptions],
  )
  const initialLocale = defaultLocale && allowedLocales.includes(defaultLocale)
    ? defaultLocale
    : (allowedLocales[0] ?? DEFAULT_LOCALE)
  const themePreference = useThemePreference({ defaultValue: defaultTheme })
  const localePreference = useLocalePreference({
    allowed: allowedLocales,
    defaultValue: initialLocale,
  })
  const themeSeed = useThemeSeedPreference({ defaultValue: defaultThemeSeed })
  const outerConfig = useContext(ConfigProvider.ConfigContext)
  const {
    prefixCls: configPrefixCls,
    theme: themeOverride,
    ...restConfig
  } = configProvider ?? {}
  const antdPrefixCls = configPrefixCls ?? outerConfig.getPrefixCls()
  const currentPack = localeOptions.find((item) => item.key === localePreference.value)?.pack
  // 全部语言包一次注册。只放当前语言时，切到英文后缺的文案找不到中文包。
  const resources = useMemo(
    () => mergeIntlResources(
      zbyProIntlResources,
      ...localeOptions.map(toLocaleResources),
    ),
    [localeOptions],
  )
  const themeToken = useMemo(
    () => toThemeSeedToken(themeSeed.value, themePreference.appearance),
    [themePreference.appearance, themeSeed.value],
  )

  useEffect(() => {
    if (typeof document === 'undefined')
      return undefined

    const root = document.documentElement
    const previousColorScheme = root.style.colorScheme
    const previousTheme = root.dataset.theme
    root.style.colorScheme = themePreference.appearance
    root.dataset.theme = themePreference.appearance
    return () => {
      root.style.colorScheme = previousColorScheme
      if (previousTheme === undefined)
        delete root.dataset.theme
      else
        root.dataset.theme = previousTheme
    }
  }, [themePreference.appearance])

  const intlNode = (
    <ZbyIntlProvider
      locale={localePreference.value}
      fallbackLocale={DEFAULT_LOCALE}
      resources={resources}
    >
      <ProLayoutView
        {...layoutProps}
        localeOptions={localeOptions}
        localePreference={localePreference}
        themePreference={themePreference}
        themeSeed={themeSeed}
      />
    </ZbyIntlProvider>
  )
  const appNode = app === false
    ? intlNode
    : <App {...(typeof app === 'object' ? app : {})}>{intlNode}</App>

  return (
    <ConfigProvider
      {...restConfig}
      {...(antdPrefixCls ? { prefixCls: antdPrefixCls } : {})}
      locale={currentPack?.antd}
      theme={{
        ...themeOverride,
        algorithm: resolveThemeAlgorithm(
          themePreference.appearance,
          themePreference.value.density,
        ),
        token: {
          ...themeOverride?.token,
          ...themeToken,
        },
      }}
    >
      {appNode}
    </ConfigProvider>
  )
}

interface ProLayoutViewProps extends Omit<
  ProLayoutProps,
  'app' | 'configProvider' | 'defaultLocale' | 'defaultTheme' | 'defaultThemeSeed' | 'locales'
> {
  localeOptions: ProLayoutLocaleConfig[]
  localePreference: UseLocalePreferenceReturn
  themePreference: UseThemePreferenceReturn
  themeSeed: UseThemeSeedPreferenceReturn
}

function ProLayoutView(props: ProLayoutViewProps) {
  const {
    beforeUnload,
    className,
    classNames,
    header,
    localeOptions,
    localePreference,
    minimumContentWidth,
    noBar = false,
    onPageError,
    pageLoading,
    prefixCls: customizePrefixCls,
    rootClassName,
    setPage,
    showBreadcrumb = true,
    style,
    styles,
    systemList,
    themePreference,
    themeSeed,
    title,
  } = props
  const { getPrefixCls } = useContext(ConfigProvider.ConfigContext)
  const prefixCls = getPrefixCls('pro-layout', customizePrefixCls)
  const currentRoutes = useRouterCoreSelector(
    (state: RouterCoreState<ProLayoutRoute>) => state.currentRoutes,
  )
  const { breadcrumbHeight, hashId, headerHeight, siderWidth, layoutCSSVariables } =
    useProLayoutStyles(prefixCls)
  const pathnameDescriptionMap = useRouterCoreSelector((state) => state.pathnameDescriptionMap)
  const currentPathname = useRouterCoreSelector((state) => state.currentPathname)
  const intl = useIntl()
  const [pageScrolled, setPageScrolled] = useState(false)
  const currentRoute = currentRoutes[currentRoutes.length - 1]
  // 描述符每次渲染才被解释成文本，因此语言切换后 document.title 会自动跟上。
  const currentPageTitle = currentRoute
    ? resolveProLayoutTitle(
        intl,
        pathnameDescriptionMap[currentRoute.realPath] || currentRoute.route.title,
      )
    : ''
  const appTitle = resolveProLayoutTitle(intl, title)
  const layoutContextValue = useMemo(
    () => ({
      breadcrumbHeight,
      density: themePreference.value.density,
      headerHeight,
      locale: localePreference.value,
      noBar,
      resolvedTheme: themePreference.appearance,
      setDensity: themePreference.setDensity,
      setLocale: localePreference.setValue,
      setMode: themePreference.setMode,
      showBreadcrumb,
      siderWidth,
      theme: themePreference.value.mode,
    }),
    [
      breadcrumbHeight,
      headerHeight,
      localePreference.setValue,
      localePreference.value,
      noBar,
      showBreadcrumb,
      siderWidth,
      themePreference.appearance,
      themePreference.setDensity,
      themePreference.setMode,
      themePreference.value.density,
      themePreference.value.mode,
    ],
  )

  useEffect(() => {
    if (typeof document === 'undefined')
      return

    document.title = currentPageTitle ? `${currentPageTitle} - ${appTitle}` : appTitle
    setPage?.(currentPageTitle)
  }, [appTitle, currentPageTitle, setPage])

  useEffect(() => {
    if (!beforeUnload || typeof window === 'undefined')
      return undefined

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const shouldBlock = typeof beforeUnload === 'function' ? beforeUnload() : beforeUnload
      if (!shouldBlock)
        return

      event.preventDefault()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [beforeUnload])

  return (
    <ProLayoutProvider value={layoutContextValue}>
      <Layout
        className={clsx(prefixCls, hashId, classNames?.root, rootClassName, className)}
        style={{
          minHeight: '100vh',
          viewTransitionName: PRO_LAYOUT_THEME_VIEW_TRANSITION_NAME,
          ...styles?.root,
          ...style,
          ...layoutCSSVariables,
        }}
        data-current-pathname={currentPathname}
      >
        {!noBar ? (
          <IconDrawerMenu
            prefixCls={prefixCls}
            hashId={hashId}
            logo={header?.logo}
            systemList={systemList}
            siderWidth={siderWidth}
            classNames={classNames}
            styles={styles}
          />
        ) : null}
        <Layout
          className={`${prefixCls}-main`}
          style={{
            width: '100%',
            minWidth: minimumContentWidth,
            paddingInlineStart: noBar ? 0 : siderWidth,
            paddingBlockStart: noBar ? 0 : headerHeight,
          }}
        >
          {!noBar ? (
            <Header
              prefixCls={prefixCls}
              hashId={hashId}
              height={headerHeight}
              extra={header?.extra}
              paddingLeft={siderWidth}
              scrolled={pageScrolled}
              classNames={classNames}
              styles={styles}
              tools={(
                <>
                  <ProRouteSearch />
                  <ProLocaleSwitch
                    options={localeOptions}
                    value={localePreference.value}
                    onChange={localePreference.setValue}
                  />
                  <ProThemeSwitch
                    appearance={themePreference.appearance}
                    seed={themeSeed.value}
                    seedConfig={themeSeed.config}
                    value={themePreference.value}
                    onChange={themePreference.setValue}
                    onSeedConfirm={themeSeed.setValue}
                  />
                </>
              )}
            />
          ) : null}
          <Layout.Content
            className={clsx(`${prefixCls}-content`, classNames?.content)}
            style={{
              display: 'flex',
              minWidth: 0,
              minHeight: 0,
              flex: 1,
              flexDirection: 'column',
              ...styles?.content,
            }}
          >
            <PageProgressProvider>
              <PageContent
                prefixCls={prefixCls}
                onPageError={onPageError}
                pageLoading={pageLoading}
                onScrollStateChange={setPageScrolled}
                pageClassName={classNames?.page}
                pageStyle={styles?.page}
              />
            </PageProgressProvider>
          </Layout.Content>
        </Layout>
      </Layout>
    </ProLayoutProvider>
  )
}

export default memo(ProLayout)
