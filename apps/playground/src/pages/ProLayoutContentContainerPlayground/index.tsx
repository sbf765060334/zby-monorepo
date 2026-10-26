import { ProLayoutContentContainer } from '@zby/pro'
import { Button, Space } from 'antd'

export default function ProLayoutContentContainerPlayground() {
  return (
    <ProLayoutContentContainer
      mode="stack"
      // aside={(
      //   <ProLayoutContentContainer.Item>
      //     123
      //   </ProLayoutContentContainer.Item>
      // )}
      // asideWidth={220}
      // header={(
      //   <Typography.Text strong>
      //     订单列表
      //   </Typography.Text>
      // )}
      footer={(
        <Space>
          <Button>取消</Button>
          <Button type="primary">保存</Button>
        </Space>
      )}
    >
      <ProLayoutContentContainer.Item>
        <div>123</div>
        <div>123</div>
        <div>123</div>
        <div>123</div>
        <div>123</div>
        <div>123</div>
        <div>123</div>
        <div>123</div>
        <div>123</div>
        <div>123</div>
        <div>123</div>
        <div>123</div>
        <div>123</div>
        <div>123</div>
        <div>123</div>
        <div>123</div>
        <div>123</div>
        <div>123</div>
      </ProLayoutContentContainer.Item>
      {/* <div>123</div>
      <div>123</div>
      <div>123</div>
      <div>123</div>
      <div>123</div>
      <div>123</div>
      <div>123</div>
      <div>123</div>
      <div>123</div>
      <div>123</div>
      <div>123</div>
      <div>123</div>
      <div>123</div>
      <div>123</div>
      <div>123</div>
      <div>123</div>
      <div>123</div>
      <div>123</div> */}
    </ProLayoutContentContainer>
  )
}
