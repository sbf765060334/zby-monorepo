/** 共享页签复现用的假订单。详情路由是 /orders/:id，且未开启 supportMultipleTabs。 */
export interface MockOrder {
  id: string
  title: string
  customer: string
  amount: string
  status: string
}

export const MOCK_ORDERS: MockOrder[] = [
  { id: '42', title: '春季备货', customer: '杭州仓', amount: '¥12,800', status: '待发货' },
  { id: '99', title: '加急补货', customer: '深圳仓', amount: '¥8,360', status: '待审核' },
  { id: '7', title: '样品确认', customer: '上海仓', amount: '¥960', status: '草稿' },
]

export function getMockOrder(id: string | undefined) {
  return MOCK_ORDERS.find((order) => order.id === id)
}

export function getNextMockOrderId(id: string | undefined) {
  const index = MOCK_ORDERS.findIndex((order) => order.id === id)
  if (index < 0)
    return MOCK_ORDERS[0].id
  return MOCK_ORDERS[(index + 1) % MOCK_ORDERS.length].id
}
