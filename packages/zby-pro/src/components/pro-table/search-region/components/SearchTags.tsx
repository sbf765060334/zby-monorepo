import { memo } from 'react'
import { ReloadOutlined } from '@ant-design/icons'
import { Tag } from 'antd'

import type { ActiveSearchTagItem } from '../../utils'

const SEARCH_TAG_RESET_ICON = <ReloadOutlined />

export type SearchTagsProps = {
  onCloseTag: (item: ActiveSearchTagItem) => void
  prefixCls: string
  tags: ActiveSearchTagItem[]
}

export const SearchTags = memo(({ onCloseTag, prefixCls, tags }: SearchTagsProps) => {
  if (tags.length === 0) {
    return null
  }

  return (
    <div className={`${prefixCls}-search-tags`}>
      {tags.map((item) => (
        <Tag
          key={item.key}
          closable={item.action !== null}
          closeIcon={item.action === 'reset' ? SEARCH_TAG_RESET_ICON : undefined}
          color="processing"
          variant="filled"
          onClose={(event) => {
            event.preventDefault()
            onCloseTag(item)
          }}
        >
          {item.label}
          ：
          {item.text}
        </Tag>
      ))}
    </div>
  )
})

SearchTags.displayName = 'ProTableSearchTags'
