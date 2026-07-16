import { createContext, useContext } from 'react'
import { shallow } from 'zustand/shallow'

import type { StoreApi } from 'zustand/vanilla'

import type { ProLayoutEmitter, ProLayoutLocationEventPayload } from '../interface'
import {
  createReadonlyStore,
  emptyProLayoutContext,
  type ProLayoutContextValue,
} from './layoutContext'
import { useStoreSelector } from './useStoreSelector'

/** 单个页面实例在公共布局能力之外持有的独立上下文。 */
export interface ProLayoutPageContextValue extends ProLayoutContextValue {
  /** 当前页面实例对应的真实 pathname。 */
  pathname: string
  /** 页面实例和页签共用的稳定 key。 */
  tabKey: string
  /** 页面显示或隐藏时发布 boolean 状态的事件流。 */
  lifecycle$: ProLayoutEmitter<boolean>
  /** 当前页签 URL 变化时发布完整 location 的事件流。 */
  location$: ProLayoutEmitter<ProLayoutLocationEventPayload>
}

/** 每个 KeepAlive 页面实例提供一个独立的 vanilla Store。 */
export const ProLayoutPageContext = createContext<
  StoreApi<ProLayoutPageContextValue> | null
>(null)

const emptyEmitter: ProLayoutEmitter<never> = {
  emit: () => undefined,
  useSubscription: () => undefined,
}

const emptyPageContext: ProLayoutPageContextValue = {
  ...emptyProLayoutContext,
  pathname: '',
  tabKey: '',
  lifecycle$: emptyEmitter as unknown as ProLayoutEmitter<boolean>,
  location$: emptyEmitter as unknown as ProLayoutEmitter<ProLayoutLocationEventPayload>,
}

const emptyPageStore = createReadonlyStore(emptyPageContext)

export function useProLayoutPageContext(): ProLayoutPageContextValue
export function useProLayoutPageContext<Selected>(
  selector: (state: ProLayoutPageContextValue) => Selected,
  equalityFn?: (left: Selected, right: Selected) => boolean,
): Selected
/** 读取当前页面实例的完整上下文，或通过 selector 精确订阅页面字段。 */
export function useProLayoutPageContext<Selected>(
  selector?: (state: ProLayoutPageContextValue) => Selected,
  equalityFn?: (left: Selected, right: Selected) => boolean,
) {
  const store = useContext(ProLayoutPageContext) || emptyPageStore
  const finalSelector: (state: ProLayoutPageContextValue) => unknown =
    selector || ((state) => state)

  return useStoreSelector(
    store,
    finalSelector,
    (selector ? equalityFn : shallow) as (left: unknown, right: unknown) => boolean,
  )
}
