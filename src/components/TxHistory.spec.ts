import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import TxHistory from '@/components/TxHistory.vue'
import type { Transaction } from '@/composables/useTransactions'

const mockFetchMore = vi.fn()
const mockTxList = ref<Transaction[]>([])
const mockLoading = ref(false)

vi.mock('@/composables/useTransactions', () => ({
  useTransactions: () => ({
    txList: mockTxList,
    loading: mockLoading,
    fetchMore: mockFetchMore,
  }),
}))

vi.mock('@/composables/useTokenPrice', () => ({
  useTokenPrice: () => ({
    prices: ref({ ethereum: 2000, 'usd-coin': 1, tether: 1 }),
    priceChange24h: ref({ ethereum: 0, 'usd-coin': 0, tether: 0 }),
    loading: ref(false),
  }),
}))

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    hash: '0x1234567890abcdef1234567890abcdef12345678',
    from: '0xSender1234',
    to: '0xRecipient5678',
    value: '1',
    asset: 'ETH',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    direction: 'in',
    ...overrides,
  }
}

function mountHistory(chainId = 1) {
  return mount(TxHistory, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          initialState: { wallet: { status: 'connected', address: '0xUser', chainId } },
          stubActions: false,
        }),
      ],
      stubs: { RouterLink: { template: '<a><slot /></a>' } },
    },
  })
}

describe('TxHistory — empty states', () => {
  beforeEach(() => {
    mockTxList.value = []
    mockLoading.value = false
  })

  it('shows No transactions found when list is empty', () => {
    const wrapper = mountHistory()
    expect(wrapper.text()).toContain('No transactions found.')
  })

  it('shows filter-no-match message when list has items but filter excludes all', async () => {
    mockTxList.value = [makeTx({ direction: 'in' })]
    const wrapper = mountHistory()
    const sentTab = wrapper.findAll('button').find(b => b.text() === 'Sent')!
    await sentTab.trigger('click')
    expect(wrapper.text()).toContain('No transactions match this filter.')
  })
})

describe('TxHistory — filter tabs', () => {
  beforeEach(() => {
    mockTxList.value = [
      makeTx({ hash: '0xin111', direction: 'in' }),
      makeTx({ hash: '0xout22', direction: 'out' }),
    ]
    mockLoading.value = false
  })

  it('All tab shows both transactions', () => {
    const wrapper = mountHistory()
    const rows = wrapper.findAll('a[href*="etherscan"]')
    expect(rows.length).toBe(2)
  })

  it('Received tab shows only in-direction', async () => {
    const wrapper = mountHistory()
    const receivedTab = wrapper.findAll('button').find(b => b.text() === 'Received')!
    await receivedTab.trigger('click')
    // Only 'in' direction rows should be shown — check for emerald class (in) and no red class (out)
    expect(wrapper.findAll('[class*="bg-emerald-500"]').length).toBeGreaterThan(0)
    expect(wrapper.findAll('[class*="bg-red-500"]').length).toBe(0)
  })

  it('Sent tab shows only out-direction', async () => {
    const wrapper = mountHistory()
    const sentTab = wrapper.findAll('button').find(b => b.text() === 'Sent')!
    await sentTab.trigger('click')
    expect(wrapper.text()).toContain('0xout22')
    expect(wrapper.text()).not.toContain('0xin111')
  })
})

describe('TxHistory — transaction row display', () => {
  beforeEach(() => {
    mockLoading.value = false
  })

  it('in-direction row shows + prefix and emerald class', () => {
    mockTxList.value = [makeTx({ direction: 'in', value: '1', asset: 'ETH' })]
    const wrapper = mountHistory()
    expect(wrapper.text()).toContain('+1 ETH')
    expect(wrapper.find('.text-emerald-400').exists()).toBe(true)
  })

  it('out-direction row shows - prefix', () => {
    mockTxList.value = [makeTx({ direction: 'out', value: '0.5', asset: 'ETH' })]
    const wrapper = mountHistory()
    expect(wrapper.text()).toContain('-0.5 ETH')
  })

  it('etherscan URL uses mainnet for chainId 1', () => {
    mockTxList.value = [makeTx()]
    const wrapper = mountHistory(1)
    const link = wrapper.find('a[href*="etherscan"]')
    expect(link.attributes('href')).toContain('https://etherscan.io')
  })

  it('etherscan URL uses sepolia for chainId 11155111', () => {
    mockTxList.value = [makeTx()]
    const wrapper = mountHistory(11155111)
    const link = wrapper.find('a[href*="etherscan"]')
    expect(link.attributes('href')).toContain('https://sepolia.etherscan.io')
  })

  it('shows USD value for ETH transactions', () => {
    mockTxList.value = [makeTx({ value: '1', asset: 'ETH' })]
    const wrapper = mountHistory()
    expect(wrapper.text()).toContain('$2,000.00')
  })

  it('shows — for unknown asset USD value', () => {
    mockTxList.value = [makeTx({ value: '1', asset: 'UNKNOWN' })]
    const wrapper = mountHistory()
    expect(wrapper.text()).toContain('—')
  })
})

describe('TxHistory — load more', () => {
  beforeEach(() => {
    mockTxList.value = [makeTx()]
    mockLoading.value = false
  })

  it('shows Load more button when txList has items', () => {
    const wrapper = mountHistory()
    expect(wrapper.text()).toContain('Load more')
  })

  it('clicking Load more calls fetchMore()', async () => {
    const wrapper = mountHistory()
    const loadMoreBtn = wrapper.findAll('button').find(b => b.text() === 'Load more')!
    await loadMoreBtn.trigger('click')
    expect(mockFetchMore).toHaveBeenCalled()
  })

  it('Load more button is disabled when loading', async () => {
    mockLoading.value = true
    const wrapper = mountHistory()
    await wrapper.vm.$nextTick()
    const loadMoreBtn = wrapper.findAll('button').find(b => b.text().includes('Loading'))
    expect(loadMoreBtn?.attributes('disabled')).toBeDefined()
  })
})

describe('TxHistory — time display', () => {
  it('shows time ago text', () => {
    mockTxList.value = [makeTx({ timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString() })]
    mockLoading.value = false
    const wrapper = mountHistory()
    expect(wrapper.text()).toMatch(/\d+ min ago|just now/)
  })

  it('shows — for empty timestamp', () => {
    mockTxList.value = [makeTx({ timestamp: '' })]
    mockLoading.value = false
    const wrapper = mountHistory()
    expect(wrapper.text()).toContain('—')
  })
})
