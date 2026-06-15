import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'

function makeTransfer(overrides: Record<string, any> = {}) {
  return {
    hash: '0xhash1',
    from: '0xUser',
    to: '0xRecipient',
    value: 1.5,
    asset: 'ETH',
    metadata: { blockTimestamp: '2024-01-15T12:00:00Z' },
    ...overrides,
  }
}

function alchemyOk(transfers: object[], pageKey?: string) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ result: { transfers, ...(pageKey ? { pageKey } : {}) } }),
  } as Response)
}

describe('useTransactions', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.mocked(fetch).mockReset()
    vi.stubEnv('VITE_ALCHEMY_KEY', 'test-key')

    // Set active wallet so the watcher fires immediately when composable is created
    const { useWalletStore } = await import('@/stores/walletStore')
    useWalletStore().setWallet('0xUser', 1)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('loads transactions and merges in/out transfers', async () => {
    vi.mocked(fetch)
      .mockReturnValueOnce(alchemyOk([makeTransfer({ hash: '0xout', from: '0xUser', to: '0xRecipient' })]) as any)
      .mockReturnValueOnce(alchemyOk([makeTransfer({ hash: '0xin', from: '0xSender', to: '0xUser' })]) as any)

    const { useTransactions } = await import('@/composables/useTransactions')
    const { txList, loading } = useTransactions()
    await flushPromises()

    expect(txList.value).toHaveLength(2)
    expect(loading.value).toBe(false)
  })

  it('deduplicates transactions with the same hash', async () => {
    const dup = makeTransfer({ hash: '0xdup', from: '0xUser', to: '0xUser' })
    vi.mocked(fetch)
      .mockReturnValueOnce(alchemyOk([dup]) as any)
      .mockReturnValueOnce(alchemyOk([dup]) as any)

    const { useTransactions } = await import('@/composables/useTransactions')
    const { txList } = useTransactions()
    await flushPromises()

    expect(txList.value).toHaveLength(1)
  })

  it('assigns direction out when from === walletAddress', async () => {
    vi.mocked(fetch)
      .mockReturnValueOnce(alchemyOk([makeTransfer({ hash: '0xout', from: '0xUser', to: '0xOther' })]) as any)
      .mockReturnValueOnce(alchemyOk([]) as any)

    const { useTransactions } = await import('@/composables/useTransactions')
    const { txList } = useTransactions()
    await flushPromises()

    expect(txList.value[0].direction).toBe('out')
  })

  it('assigns direction in when from !== walletAddress', async () => {
    vi.mocked(fetch)
      .mockReturnValueOnce(alchemyOk([]) as any)
      .mockReturnValueOnce(alchemyOk([makeTransfer({ hash: '0xin', from: '0xSender', to: '0xUser' })]) as any)

    const { useTransactions } = await import('@/composables/useTransactions')
    const { txList } = useTransactions()
    await flushPromises()

    expect(txList.value[0].direction).toBe('in')
  })

  it('sorts transactions descending by timestamp', async () => {
    vi.mocked(fetch)
      .mockReturnValueOnce(alchemyOk([
        makeTransfer({ hash: '0xold', from: '0xUser', metadata: { blockTimestamp: '2024-01-10T00:00:00Z' } }),
        makeTransfer({ hash: '0xnew', from: '0xUser', metadata: { blockTimestamp: '2024-01-20T00:00:00Z' } }),
      ]) as any)
      .mockReturnValueOnce(alchemyOk([]) as any)

    const { useTransactions } = await import('@/composables/useTransactions')
    const { txList } = useTransactions()
    await flushPromises()

    expect(txList.value[0].hash).toBe('0xnew')
    expect(txList.value[1].hash).toBe('0xold')
  })

  it('handles null to/value/asset fields gracefully', async () => {
    vi.mocked(fetch)
      .mockReturnValueOnce(alchemyOk([makeTransfer({ to: null, value: null, asset: null })]) as any)
      .mockReturnValueOnce(alchemyOk([]) as any)

    const { useTransactions } = await import('@/composables/useTransactions')
    const { txList } = useTransactions()
    await flushPromises()

    expect(txList.value[0].to).toBe('')
    expect(txList.value[0].value).toBe('0')
    expect(txList.value[0].asset).toBe('ETH')
  })

  it('fetchMore sends pageKey in subsequent request', async () => {
    vi.mocked(fetch)
      .mockReturnValueOnce(alchemyOk([makeTransfer({ hash: '0xa', from: '0xUser' })], 'pagekey-123') as any)
      .mockReturnValueOnce(alchemyOk([]) as any)
      .mockReturnValueOnce(alchemyOk([makeTransfer({ hash: '0xb', from: '0xUser' })]) as any)
      .mockReturnValueOnce(alchemyOk([]) as any)

    const { useTransactions } = await import('@/composables/useTransactions')
    const { fetchMore } = useTransactions()
    await flushPromises()

    await fetchMore()
    await flushPromises()

    const body = JSON.parse(vi.mocked(fetch).mock.calls[2][1]?.body as string)
    expect(body.params[0].pageKey).toBe('pagekey-123')
  })

  it('timeout shows warning toast and loading returns to false', async () => {
    // Mock fetch that responds to AbortController.abort()
    vi.mocked(fetch).mockImplementation(function (_url, init) {
      return new Promise<Response>((_, reject) => {
        if (init?.signal) {
          ;(init.signal as AbortSignal).addEventListener('abort', () => {
            const err = new Error('The user aborted a request.')
            ;(err as any).name = 'AbortError'
            reject(err)
          })
        }
      })
    })

    const { useTransactions } = await import('@/composables/useTransactions')
    const { loading } = useTransactions()

    vi.advanceTimersByTime(10001)
    await flushPromises()

    // Verify toast was shown via the toasts array
    const { useToast } = await import('@/composables/useToast')
    const warningToasts = useToast().toasts.filter(t => t.type === 'warning')
    expect(warningToasts.some(t => t.message.includes('timed out'))).toBe(true)
    expect(loading.value).toBe(false)
  })

  it('resets txList when wallet address changes', async () => {
    vi.mocked(fetch).mockReturnValue(alchemyOk([makeTransfer()]) as any)

    const { useTransactions } = await import('@/composables/useTransactions')
    const { txList } = useTransactions()
    await flushPromises()
    expect(txList.value.length).toBeGreaterThan(0)

    const { useWalletStore } = await import('@/stores/walletStore')
    vi.mocked(fetch).mockReturnValue(alchemyOk([]) as any)
    useWalletStore().address = null
    await flushPromises()

    expect(txList.value).toHaveLength(0)
  })
})
