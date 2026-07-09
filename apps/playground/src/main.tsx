import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider } from 'antd';
import 'antd/dist/reset.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider>
      <main style={{ padding: 24 }}>zby-monorepo playground</main>
    </ConfigProvider>
  </React.StrictMode>,
);
