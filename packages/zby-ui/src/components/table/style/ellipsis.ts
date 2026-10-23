import type { CSSObject } from '@ant-design/cssinjs'

import { textEllipsis } from 'antd/es/style'
import type { GenerateStyle } from 'antd/es/theme/internal'
import { TABLE_CELL_ROWS_VAR } from '../ellipsisRows'
import type { TableToken } from './index'

const lineClampStyle: CSSObject = {
  display: '-webkit-box',
  width: '100%',
  maxWidth: '100%',
  overflow: 'hidden',
  whiteSpace: 'normal',
  wordBreak: 'normal',
  overflowWrap: 'break-word',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: `var(${TABLE_CELL_ROWS_VAR})`,
}

const genEllipsisStyle: GenerateStyle<TableToken, CSSObject> = (token) => {
  const { componentCls } = token
  return {
    [`${componentCls}-wrapper`]: {
      [`${componentCls}-cell-ellipsis`]: {
        ...textEllipsis,
        wordBreak: 'keep-all',

        // Fixed first or last should special process
        [`
          &${componentCls}-cell-fix-start-shadow,
          &${componentCls}-cell-fix-end-shadow
        `]: {
          overflow: 'visible',
          [`${componentCls}-cell-content`]: {
            ...textEllipsis,
            display: 'block',
          },
        },

        [`${componentCls}-column-title`]: {
          ...textEllipsis,
          wordBreak: 'keep-all',
        },
      },

      [`${componentCls}-cell-copy`]: {
        display: 'inline-flex',
        alignItems: 'center',
        flexWrap: 'nowrap',
        maxWidth: '100%',
        minWidth: 0,
        verticalAlign: 'middle',
        gap: token.marginXXS,
      },

      [`${componentCls}-cell-copy-text`]: {
        flex: '0 1 auto',
        minWidth: 0,
        overflowWrap: 'break-word',
        whiteSpace: 'normal',
        wordBreak: 'normal',
      },

      [`${componentCls}-cell-copy-action`]: {
        flex: 'none',
      },

      [`${componentCls}-cell-ellipsis-multiple`]: lineClampStyle,

      [`${componentCls}-cell-copy-text-ellipsis`]: {
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        wordBreak: 'keep-all',
      },

      // 复制文案在 flex 行里收缩，不拉满整格，避免短文本把图标顶到最右。
      [`${componentCls}-cell-copy-text${componentCls}-cell-copy-text-ellipsis-multiple`]: {
        ...lineClampStyle,
        width: 'auto',
        flex: '0 1 auto',
        minWidth: 0,
      },
    },
  }
}

export default genEllipsisStyle
