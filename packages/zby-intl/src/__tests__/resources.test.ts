import { describe, expect, it } from 'vitest'
import { mergeIntlResources } from '../resources'

// 这组单测专门保护语言包合并规则。
// zby-ui、zby-pro、业务项目都会各自维护语言包，最终会通过
// mergeIntlResources 合并成一份 `{ 'zh-CN': 文案树 }` 资源。
// 所以这里最需要固定的行为是：
// 1. 同一个语言下的嵌套文案对象必须深合并，不能互相覆盖整棵子树。
// 2. 后传入的语言包优先级更高，方便业务覆盖组件库默认文案。
describe('mergeIntlResources', () => {
  it('deep merges locale messages by locale', () => {
    // 这个用例模拟两个组件包分别提供自己的文案：
    // - 第一份资源提供 zby.ui.inputNumberRange
    // - 第二份资源提供 zby.pro.layout
    //
    // 它们同属 zh-CN，并且都挂在 zby 下面。
    // 如果实现写成浅合并，第二份资源的 zby 会整体覆盖第一份资源的 zby，
    // 导致 zby.ui.inputNumberRange 丢失。
    // 正确结果应该是 zby.ui 和 zby.pro 同时保留下来。
    expect(
      mergeIntlResources(
        {
          'zh-CN': {
            zby: {
              ui: {
                inputNumberRange: {
                  startPlaceholder: 'Min',
                },
              },
            },
          },
        },
        {
          'zh-CN': {
            zby: {
              pro: {
                layout: {
                  title: 'Console',
                },
              },
            },
          },
        },
      ),
    ).toEqual({
      // 期望结果明确要求 ui 和 pro 两条子树同时存在。
      // 这就是用测试防止“深合并被误改成浅合并”的关键断言。
      'zh-CN': {
        zby: {
          ui: {
            inputNumberRange: {
              startPlaceholder: 'Min',
            },
          },
          pro: {
            layout: {
              title: 'Console',
            },
          },
        },
      },
    })
  })

  it('lets later resources override earlier messages', () => {
    // 这个用例模拟业务覆盖组件库默认文案。
    // 第一份资源可以理解为组件库默认值：Confirm。
    // 第二份资源可以理解为业务项目自定义值：OK。
    //
    // mergeIntlResources 的约定是“越后传入优先级越高”，
    // 因此最终 common.confirm 应该是 OK，而不是 Confirm。
    expect(
      mergeIntlResources(
        {
          'en-US': {
            common: {
              confirm: 'Confirm',
            },
          },
        },
        {
          'en-US': {
            common: {
              confirm: 'OK',
            },
          },
        },
      ),
    ).toEqual({
      // 如果未来有人把合并顺序写反，这个断言会失败，
      // 从而提醒我们业务覆盖组件默认文案的能力被破坏了。
      'en-US': {
        common: {
          confirm: 'OK',
        },
      },
    })
  })
})
