import type { ActionIconProps } from '@zby/ui'

export type ActionSize = NonNullable<ActionIconProps['size']>
export type ActionShape = NonNullable<ActionIconProps['shape']>
export type ActionColor = NonNullable<ActionIconProps['color']>
export type ActionVariant = NonNullable<ActionIconProps['variant']>
export const presetColors: ActionColor[] = [
  'default',
  'primary',
  'danger',
  'green',
  'orange',
  'purple',
]
export const variants: ActionVariant[] = [
  'outlined',
  'dashed',
  'solid',
  'filled',
  'text',
  'link',
  'inline',
]
