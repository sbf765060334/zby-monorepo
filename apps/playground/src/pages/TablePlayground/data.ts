export interface OrderRecord {
  id: number;
  orderNo: string;
  customer: string;
  status: '待处理' | '运输中' | '已完成';
  amount: number;
  owner: string;
  createdAt: string;
  address: string;
}

export function createOrderRecord(id: number): OrderRecord {
  const index = id - 1

  return {
    id,
    orderNo: `ZBY-${String(id).padStart(6, '0')}`,
    customer: `客户 ${String((index % 120) + 1).padStart(3, '0')}`,
    status: index % 3 === 0 ? '待处理' : index % 3 === 1 ? '运输中' : '已完成',
    amount: 1000 + ((index * 137) % 50000),
    owner: ['张敏', '李想', '周宁', '王雪'][index % 4],
    createdAt: `2026-08-${String((index % 28) + 1).padStart(2, '0')} 10:30`,
    address: ['上海市浦东新区', '浙江省杭州市余杭区', '江苏省苏州市工业园区'][
      index % 3
    ],
  }
}

export const normalData = Array.from({ length: 18 }, (_, index) =>
  createOrderRecord(index + 1))
export const fillData = normalData.slice(0, 3)
export const virtualData = Array.from({ length: 3000 }, (_, index) =>
  createOrderRecord(index + 1))

export interface TreeOrderRecord extends OrderRecord {
  children?: TreeOrderRecord[];
}

export const treeData: TreeOrderRecord[] = normalData
  .slice(0, 4)
  .map((record, index) => ({
    ...record,
    children: [
      {
        ...createOrderRecord(100 + index * 2 + 1),
        orderNo: `${record.orderNo}-01`,
        customer: `${record.customer} / 子订单 1`,
      },
      {
        ...createOrderRecord(100 + index * 2 + 2),
        orderNo: `${record.orderNo}-02`,
        customer: `${record.customer} / 子订单 2`,
      },
    ],
  }))
