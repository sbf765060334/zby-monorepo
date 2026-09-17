import { CheckCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import { ProViewManagement } from '@zby/pro'
import { Alert, Flex, Segmented, Tag } from 'antd'
import * as React from 'react'

import { PlaygroundCase } from '../../../components/ComponentPlayground'
import type { LoadMode, Snapshot } from '../shared'
import { defaultSnapshot, systemViews } from '../shared'

export default function ControlledStateExample() {
  const [mode, setMode] = React.useState<LoadMode>('ready')
  const statusText = mode === 'ready' ? '可用' : mode === 'loading' ? '加载中' : '加载失败'
  const statusType = mode === 'ready' ? 'success' : mode === 'loading' ? 'info' : 'error'

  return (
    <PlaygroundCase
      title="loading / error / retry"
      description="受控状态下系统视图仍可查看，失败后可点击重试。"
    >
      <Flex align="center" justify="space-between" gap="middle" wrap>
        <Segmented<LoadMode>
          value={mode}
          options={[
            { label: '正常', value: 'ready' },
            { label: '加载中', value: 'loading' },
            { label: '错误', value: 'error' },
          ]}
          onChange={setMode}
        />
        <Tag icon={mode === 'ready' ? <CheckCircleOutlined /> : <ReloadOutlined />} color={statusType}>
          {statusText}
        </Tag>
      </Flex>
      <ProViewManagement<Snapshot>
        currentSnapshot={defaultSnapshot}
        defaultSnapshot={defaultSnapshot}
        initialStorageState={{
          activeViewId: systemViews[0].id,
          views: [],
        }}
        instanceId="playground-pro-view-management-controlled"
        loadError={mode === 'error' ? new Error('demo load failed') : undefined}
        loading={mode === 'loading'}
        systemViews={systemViews}
        onApplyView={() => undefined}
        onRetryLoad={() => setMode('ready')}
      />
      {mode === 'error' ? (
        <Alert
          showIcon
          type="error"
          title="视图加载失败"
          description="点击组件右侧错误图标触发 retry。"
        />
      ) : null}
    </PlaygroundCase>
  )
}
