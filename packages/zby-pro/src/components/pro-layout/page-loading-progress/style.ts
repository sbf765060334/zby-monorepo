import { useStyleRegister } from '@ant-design/cssinjs'
import { theme as antdTheme } from 'antd'

/** 只让 NProgress 跟随主题主色，其余视觉和定位继续使用库的默认 CSS。 */
export default function usePageLoadingProgressStyle() {
  const { cssVar, theme, token } = antdTheme.useToken()
  const styleToken = cssVar ?? token

  useStyleRegister(
    {
      theme,
      token: styleToken,
      path: ['zby-pro', 'page-loading-progress'],
    },
    () => ({
      '#nprogress .bar': {
        background: styleToken.colorPrimary,
      },
      '#nprogress .peg': {
        boxShadow: `0 0 10px ${styleToken.colorPrimary}, 0 0 5px ${styleToken.colorPrimary}`,
      },
    }),
  )
}
