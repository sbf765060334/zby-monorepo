import type { ScrollAreaDirection } from '@zby/ui'
import { Typography, theme } from 'antd'

const { Text } = Typography

const verticalRows = Array.from({ length: 24 }, (_, index) => ({
  id: String(index + 1).padStart(2, '0'),
  name: `运输任务 ZBY-${String(index + 1).padStart(3, '0')}`,
  status: index % 3 === 0 ? '待处理' : index % 3 === 1 ? '执行中' : '已完成',
}))
const horizontalItems = Array.from({ length: 10 }, (_, index) => ({
  id: index + 1,
  title: `节点 ${index + 1}`,
  value: `${18 + index * 7}%`,
}))
const gridCells = Array.from(
  { length: 30 },
  (_, index) => `单元格 ${index + 1}`,
)

export function useScrollFrameStyle() {
  const { token } = theme.useToken()
  return {
    width: '100%',
    height: 210,
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
    borderRadius: 6,
    background: token.colorBgContainer,
  } as const
}

export function VerticalContent() {
  const { token } = theme.useToken()
  return (
    <div style={{ minWidth: 360 }}>
      {verticalRows.map((row) => (
        <div
          key={row.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '40px minmax(180px, 1fr) 64px',
            gap: 12,
            alignItems: 'center',
            minHeight: 42,
            paddingInline: 12,
            borderBlockEnd: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
          }}
        >
          <Text type="secondary">{row.id}</Text>
          <Text>{row.name}</Text>
          <Text
            style={{
              color:
                row.status === '已完成'
                  ? token.colorSuccess
                  : row.status === '执行中'
                    ? token.colorPrimary
                    : token.colorWarning,
            }}
          >
            {row.status}
          </Text>
        </div>
      ))}
    </div>
  )
}

export function HorizontalContent() {
  const { token } = theme.useToken()
  return (
    <div
      style={{ display: 'flex', gap: 12, width: 'max-content', padding: 12 }}
    >
      {horizontalItems.map((item) => (
        <div
          key={item.id}
          style={{
            display: 'grid',
            alignContent: 'space-between',
            width: 148,
            height: 104,
            padding: 12,
            border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
            borderRadius: 6,
            background:
              item.id % 2 === 0 ? token.colorFillAlter : token.colorBgElevated,
          }}
        >
          <Text type="secondary">{item.title}</Text>
          <Text
            style={{
              color: token.colorPrimary,
              fontSize: token.fontSizeHeading4,
            }}
          >
            {item.value}
          </Text>
        </div>
      ))}
    </div>
  )
}

export function BothContent() {
  const { token } = theme.useToken()
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 156px)',
        gap: 8,
        width: 836,
        padding: 12,
      }}
    >
      {gridCells.map((cell, index) => (
        <div
          key={cell}
          style={{
            display: 'grid',
            placeItems: 'center',
            height: 52,
            border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
            borderRadius: 4,
            color: index % 4 === 0 ? token.colorPrimary : token.colorText,
            background:
              index % 3 === 0
                ? token.colorFillSecondary
                : token.colorBgContainer,
          }}
        >
          {cell}
        </div>
      ))}
    </div>
  )
}

export function getContent(direction: ScrollAreaDirection) {
  if (direction === 'horizontal') return <HorizontalContent />
  if (direction === 'both') return <BothContent />
  return <VerticalContent />
}
