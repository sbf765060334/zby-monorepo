import React, { useState } from 'react'

export default function DemoPage() {
  const [random] = useState(() => Math.random().toString())
  return <div>Demo Page: { random }</div>
}
