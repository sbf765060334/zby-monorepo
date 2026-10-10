import { describe, expect, it } from 'vitest'

import { deriveSiderPalette } from './siderPalette'

describe('deriveSiderPalette', () => {
  it('derives a dark gradient from the primary color instead of painting the primary itself', () => {
    const palette = deriveSiderPalette('#1677ff')

    expect(palette.gradientStart).not.toBe('#1677ff')
    expect(palette.gradientEnd).not.toBe(palette.gradientStart)
    expect(palette.textActive).toBe('#ffffff')
    expect(palette.text).toBe('rgba(255, 255, 255, 0.55)')
    expect(palette.textHover).toBe('rgba(255, 255, 255, 0.78)')
  })

  it('changes the gradient hue when the primary color changes', () => {
    const blue = deriveSiderPalette('#1677ff')
    const green = deriveSiderPalette('#52c41a')

    expect(green.gradientStart).not.toBe(blue.gradientStart)
    expect(green.gradientEnd).not.toBe(blue.gradientEnd)
  })

  it('keeps the original navy gradient when the color cannot be parsed', () => {
    expect(deriveSiderPalette('red').gradientStart).toBe('#384386')
  })
})
