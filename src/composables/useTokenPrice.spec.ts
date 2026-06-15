import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { useTokenPrice } from '@/composables/useTokenPrice'

function makeFetchResponse(data: object, ok = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 429,
    json: () => Promise.resolve(data),
  } as Response)
}

const PRICE_DATA = {
  ethereum: { usd: 2000, usd_24h_change: 1.5 },
  'usd-coin': { usd: 1, usd_24h_change: 0.01 },
  tether: { usd: 1, usd_24h_change: -0.01 },
}

const TestComp = defineComponent({
  setup() {
    return useTokenPrice()
  },
  template: '<div/>',
})

describe('useTokenPrice', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.mocked(fetch).mockReset()
  })

  it('fetches prices on mount', async () => {
    vi.mocked(fetch).mockReturnValue(makeFetchResponse(PRICE_DATA) as any)
    const wrapper = mount(TestComp)
    await flushPromises()

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.prices.ethereum).toBe(2000)
    expect(wrapper.vm.priceChange24h.ethereum).toBe(1.5)
    expect(wrapper.vm.prices['usd-coin']).toBe(1)
    expect(wrapper.vm.prices.tether).toBe(1)
    wrapper.unmount()
  })

  it('loading is true only on the first fetch', async () => {
    let resolveFirst!: (r: Response) => void
    const firstFetch = new Promise<Response>(r => { resolveFirst = r })
    vi.mocked(fetch).mockReturnValueOnce(firstFetch as any)

    const wrapper = mount(TestComp)
    expect(wrapper.vm.loading).toBe(true)

    resolveFirst(makeFetchResponse(PRICE_DATA) as any)
    await flushPromises()
    expect(wrapper.vm.loading).toBe(false)
    wrapper.unmount()
  })

  it('polls every 30 seconds', async () => {
    vi.mocked(fetch).mockReturnValue(makeFetchResponse(PRICE_DATA) as any)
    const wrapper = mount(TestComp)
    await flushPromises()
    expect(fetch).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(30000)
    await flushPromises()
    expect(fetch).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(30000)
    await flushPromises()
    expect(fetch).toHaveBeenCalledTimes(3)
    wrapper.unmount()
  })

  it('silently keeps previous prices on API error (non-ok)', async () => {
    vi.mocked(fetch)
      .mockReturnValueOnce(makeFetchResponse(PRICE_DATA) as any)
      .mockReturnValueOnce(makeFetchResponse({}, false) as any)

    const wrapper = mount(TestComp)
    await flushPromises()
    expect(wrapper.vm.prices.ethereum).toBe(2000)

    vi.advanceTimersByTime(30000)
    await flushPromises()
    expect(wrapper.vm.prices.ethereum).toBe(2000)
    wrapper.unmount()
  })

  it('silently keeps previous prices on network error', async () => {
    vi.mocked(fetch)
      .mockReturnValueOnce(makeFetchResponse(PRICE_DATA) as any)
      .mockRejectedValueOnce(new Error('Network failure'))

    const wrapper = mount(TestComp)
    await flushPromises()

    vi.advanceTimersByTime(30000)
    await flushPromises()
    expect(wrapper.vm.prices.ethereum).toBe(2000)
    wrapper.unmount()
  })

  it('stops polling after unmount', async () => {
    vi.mocked(fetch).mockReturnValue(makeFetchResponse(PRICE_DATA) as any)
    const wrapper = mount(TestComp)
    await flushPromises()
    wrapper.unmount()

    const callsBefore = vi.mocked(fetch).mock.calls.length
    vi.advanceTimersByTime(60000)
    await flushPromises()
    expect(vi.mocked(fetch).mock.calls.length).toBe(callsBefore)
  })
})
