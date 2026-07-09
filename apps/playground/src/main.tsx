import 'antd/dist/reset.css'

import { ConfigProvider } from 'antd'
import React from 'react'
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider>
      <main style={{ padding: 24 }}>zby-monorepo playground</main>
    </ConfigProvider>
  </React.StrictMode>,
)
