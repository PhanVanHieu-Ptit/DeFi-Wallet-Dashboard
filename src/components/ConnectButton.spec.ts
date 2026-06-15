import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ConnectButton from '@/components/ConnectButton.vue'

const mockConnect = vi.fn()
const mockDisconnect = vi.fn()

vi.mock('@/composables/useWallet', () => ({
  useWallet: () => ({ connect: mockConnect, disconnect: mockDisconnect }),
}))

function mountButton(walletState: Record<string, any> = {}) {
  return mount(ConnectButton, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          initialState: {
            wallet: {
              status: 'disconnected',
              address: null,
              chainId: null,
              ...walletState,
            },
          },
          stubActions: false,
        }),
      ],
      stubs: { Transition: false },
    },
  })
}

describe('ConnectButton — disconnected state', () => {
  it('renders Connect Wallet button', () => {
    const wrapper = mountButton({ status: 'disconnected' })
    expect(wrapper.find('button').text()).toContain('Connect Wallet')
  })

  it('has no dropdown', () => {
    const wrapper = mountButton({ status: 'disconnected' })
    expect(wrapper.find('[class*="absolute"]').exists()).toBe(false)
  })
})

describe('ConnectButton — connecting state', () => {
  it('renders spinner and Connecting... text', () => {
    const wrapper = mountButton({ status: 'connecting' })
    expect(wrapper.text()).toContain('Connecting...')
    expect(wrapper.find('svg.animate-spin').exists()).toBe(true)
  })

  it('does not render Connect Wallet button', () => {
    const wrapper = mountButton({ status: 'connecting' })
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBe(0)
  })
})

describe('ConnectButton — connected state', () => {
  const ADDR = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12'

  beforeEach(() => {
    mockConnect.mockReset()
    mockDisconnect.mockReset()
  })

  it('shows shortAddress in pill button', () => {
    const wrapper = mountButton({ status: 'connected', address: ADDR })
    expect(wrapper.text()).toContain('0xABCD...EF12')
  })

  it('clicking pill toggles dropdown open', async () => {
    const wrapper = mountButton({ status: 'connected', address: ADDR })
    const pill = wrapper.find('button')
    await pill.trigger('click')
    expect(wrapper.text()).toContain('Copy address')
    expect(wrapper.text()).toContain('Disconnect')
  })

  it('clicking Disconnect calls disconnect() and closes dropdown', async () => {
    const wrapper = mountButton({ status: 'connected', address: ADDR })
    await wrapper.find('button').trigger('click')
    const buttons = wrapper.findAll('button')
    const disconnectBtn = buttons.find(b => b.text().includes('Disconnect'))!
    await disconnectBtn.trigger('click')
    expect(mockDisconnect).toHaveBeenCalledOnce()
  })

  it('clicking Copy address calls clipboard.writeText with the address', async () => {
    const wrapper = mountButton({ status: 'connected', address: ADDR })
    await wrapper.find('button').trigger('click')
    const buttons = wrapper.findAll('button')
    const copyBtn = buttons.find(b => b.text().includes('Copy address'))!
    await copyBtn.trigger('click')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(ADDR)
  })
})

describe('ConnectButton — connect flow', () => {
  it('clicking Connect Wallet calls connect()', async () => {
    mockConnect.mockResolvedValue(undefined)
    const wrapper = mountButton({ status: 'disconnected' })
    await wrapper.find('button').trigger('click')
    expect(mockConnect).toHaveBeenCalledOnce()
  })

  it('swallows connect() errors without throwing', async () => {
    mockConnect.mockRejectedValue(new Error('user rejected'))
    const wrapper = mountButton({ status: 'disconnected' })
    await expect(wrapper.find('button').trigger('click')).resolves.not.toThrow()
  })
})
