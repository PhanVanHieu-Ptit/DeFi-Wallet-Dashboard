import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import BalanceCard from '@/components/BalanceCard.vue'

const mockRefresh = vi.fn()

vi.mock('@/composables/useBalance', () => ({
  useBalance: () => ({
    ethBalance: ref('0'),
    tokens: ref([]),
    loading: ref(false),
    refresh: mockRefresh,
  }),
}))

vi.mock('@/composables/useTokenPrice', () => ({
  useTokenPrice: () => ({
    prices: ref({ ethereum: 0, 'usd-coin': 0, tether: 0 }),
    priceChange24h: ref({ ethereum: 0, 'usd-coin': 0, tether: 0 }),
    loading: ref(false),
  }),
}))

function mountCard(walletState: Record<string, any> = {}, composeOverrides: Record<string, any> = {}) {
  if (composeOverrides.ethBalance !== undefined || composeOverrides.tokens !== undefined || composeOverrides.prices !== undefined) {
    vi.doMock('@/composables/useBalance', () => ({
      useBalance: () => ({
        ethBalance: ref(composeOverrides.ethBalance ?? '0'),
        tokens: ref(composeOverrides.tokens ?? []),
        loading: ref(composeOverrides.loading ?? false),
        refresh: mockRefresh,
      }),
    }))
    vi.doMock('@/composables/useTokenPrice', () => ({
      useTokenPrice: () => ({
        prices: ref(composeOverrides.prices ?? { ethereum: 0, 'usd-coin': 0, tether: 0 }),
        priceChange24h: ref({ ethereum: 0, 'usd-coin': 0, tether: 0 }),
        loading: ref(false),
      }),
    }))
  }
  return mount(BalanceCard, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          initialState: { wallet: { status: 'disconnected', address: null, chainId: null, ...walletState } },
          stubActions: false,
        }),
      ],
    },
  })
}

describe('BalanceCard', () => {
  it('shows not-connected message when wallet is disconnected', () => {
    const wrapper = mountCard({ status: 'disconnected' })
    expect(wrapper.text()).toContain('Connect your wallet to see balances')
  })

  it('shows Total Value label when disconnected', () => {
    const wrapper = mountCard({ status: 'disconnected' })
    expect(wrapper.text()).toContain('Total Value')
  })

  it('refresh button is present and calls refresh on click', async () => {
    const wrapper = mountCard({ status: 'connected', address: '0xUser' })
    const refreshBtn = wrapper.find('button[aria-label="Refresh balances"]')
    expect(refreshBtn.exists()).toBe(true)
    await refreshBtn.trigger('click')
    expect(mockRefresh).toHaveBeenCalled()
  })
})

describe('BalanceCard — fmtToken formatting', () => {
  it('displays ETH balance row when connected', () => {
    const wrapper = mount(BalanceCard, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: { wallet: { status: 'connected', address: '0xUser', chainId: 1 } },
            stubActions: false,
          }),
        ],
      },
    })
    expect(wrapper.text()).toContain('Ethereum')
    expect(wrapper.text()).toContain('ETH')
  })
})
