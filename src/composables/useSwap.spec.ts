import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ToastHandledError } from '@/composables/useToast'

const mockSendTransaction = vi.fn()
const mockGetSigner = vi.fn().mockResolvedValue({ sendTransaction: mockSendTransaction })

vi.mock('ethers', async () => {
  const actual = await vi.importActual<typeof import('ethers')>('ethers')
  return {
    ...actual,
    BrowserProvider: vi.fn().mockImplementation(function () {
      return { getSigner: mockGetSigner }
    }),
  }
})

const FROM_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
const TO_TOKEN = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

function mockQuoteResponse(overrides = {}) {
  return {
    fromToken: { address: FROM_TOKEN, decimals: 18, symbol: 'ETH', name: 'Ether', logoURI: '', usdPrice: 2000 },
    toToken: { address: TO_TOKEN, decimals: 6, symbol: 'USDC', name: 'USD Coin', logoURI: '', usdPrice: 1 },
    fromTokenAmount: '1000000000000000000',
    toTokenAmount: '1980000000',
    estimatedGas: 200000,
    protocols: [],
    ...overrides,
  }
}

function mockSwapResponse() {
  return {
    tx: {
      from: '0xUser',
      to: '0xRouter',
      data: '0xdata',
      value: '0',
      gasPrice: '20000000000',
      gas: 200000,
    },
  }
}

function makeFetch(data: object, ok = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 400,
    json: () => Promise.resolve(data),
  } as Response)
}

describe('useSwap', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.mocked(fetch).mockReset()
    vi.clearAllMocks()

    vi.stubEnv('VITE_1INCH_API_URL', 'https://api.1inch.test/v5.0')
    vi.stubEnv('VITE_1INCH_API_KEY', '')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  describe('getQuote()', () => {
    it('throws when wallet is not connected', async () => {
      const { useWalletStore } = await import('@/stores/walletStore')
      useWalletStore().chainId = null

      const { useSwap } = await import('@/composables/useSwap')
      const { getQuote } = useSwap()
      await expect(getQuote(FROM_TOKEN, TO_TOKEN, '1000000000000000000')).rejects.toThrow(
        'Wallet not connected',
      )
    })

    it('sets quote and estimatedGas on success', async () => {
      const { useWalletStore } = await import('@/stores/walletStore')
      useWalletStore().setWallet('0xUser', 1)
      vi.mocked(fetch).mockReturnValue(makeFetch(mockQuoteResponse()) as any)

      const { useSwap } = await import('@/composables/useSwap')
      const { quote, estimatedGas, getQuote } = useSwap()
      await getQuote(FROM_TOKEN, TO_TOKEN, '1000000000000000000')

      expect(quote.value).not.toBeNull()
      expect(quote.value!.fromToken.symbol).toBe('ETH')
      expect(estimatedGas.value).toBe(200000)
    })

    it('calculates price impact when both tokens have usdPrice', async () => {
      const { useWalletStore } = await import('@/stores/walletStore')
      useWalletStore().setWallet('0xUser', 1)
      // 1 ETH ($2000) → 1980 USDC ($1980) = ~1% impact
      vi.mocked(fetch).mockReturnValue(makeFetch(mockQuoteResponse()) as any)

      const { useSwap } = await import('@/composables/useSwap')
      const { priceImpact, getQuote } = useSwap()
      await getQuote(FROM_TOKEN, TO_TOKEN, '1000000000000000000')

      expect(priceImpact.value).not.toBeNull()
      expect(priceImpact.value!).toBeCloseTo(1, 0)
    })

    it('priceImpact is null when token has no usdPrice', async () => {
      const { useWalletStore } = await import('@/stores/walletStore')
      useWalletStore().setWallet('0xUser', 1)
      vi.mocked(fetch).mockReturnValue(
        makeFetch(mockQuoteResponse({ fromToken: { address: FROM_TOKEN, decimals: 18, symbol: 'ETH', name: 'Ether', logoURI: '' } })) as any,
      )

      const { useSwap } = await import('@/composables/useSwap')
      const { priceImpact, getQuote } = useSwap()
      await getQuote(FROM_TOKEN, TO_TOKEN, '1000000000000000000')

      expect(priceImpact.value).toBeNull()
    })

    it('loading is true during fetch and false after', async () => {
      const { useWalletStore } = await import('@/stores/walletStore')
      useWalletStore().setWallet('0xUser', 1)

      let resolve!: () => void
      const pending = new Promise<Response>(r => { resolve = () => r(makeFetch(mockQuoteResponse()) as any) })
      vi.mocked(fetch).mockReturnValue(pending as any)

      const { useSwap } = await import('@/composables/useSwap')
      const { loading, getQuote } = useSwap()
      const fetchPromise = getQuote(FROM_TOKEN, TO_TOKEN, '1000000000000000000')
      expect(loading.value).toBe(true)
      resolve()
      await fetchPromise
      expect(loading.value).toBe(false)
    })

    it('throws on 1inch HTTP error with description', async () => {
      const { useWalletStore } = await import('@/stores/walletStore')
      useWalletStore().setWallet('0xUser', 1)
      vi.mocked(fetch).mockReturnValue(makeFetch({ description: 'insufficient liquidity' }, false) as any)

      const { useSwap } = await import('@/composables/useSwap')
      const { getQuote } = useSwap()
      await expect(getQuote(FROM_TOKEN, TO_TOKEN, '1000000000000000000')).rejects.toThrow(
        'insufficient liquidity',
      )
    })

    it('timeout after 10s shows toast and throws ToastHandledError', async () => {
      const { useWalletStore } = await import('@/stores/walletStore')
      useWalletStore().setWallet('0xUser', 1)

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

      const { useSwap } = await import('@/composables/useSwap')
      const { getQuote } = useSwap()
      const quotePromise = getQuote(FROM_TOKEN, TO_TOKEN, '1000000000000000000')

      vi.advanceTimersByTime(10001)
      await expect(quotePromise).rejects.toBeInstanceOf(ToastHandledError)

      // Verify the toast was shown via the toasts array
      const { useToast } = await import('@/composables/useToast')
      const warningToasts = useToast().toasts.filter(t => t.type === 'warning')
      expect(warningToasts.some(t => t.message.includes('timed out'))).toBe(true)
    })

    it('includes Authorization header when VITE_1INCH_API_KEY is set', async () => {
      vi.stubEnv('VITE_1INCH_API_KEY', 'secret-key')
      const { useWalletStore } = await import('@/stores/walletStore')
      useWalletStore().setWallet('0xUser', 1)
      vi.mocked(fetch).mockReturnValue(makeFetch(mockQuoteResponse()) as any)

      const { useSwap } = await import('@/composables/useSwap')
      const { getQuote } = useSwap()
      await getQuote(FROM_TOKEN, TO_TOKEN, '1000000000000000000')

      const headers = vi.mocked(fetch).mock.calls[0][1]?.headers as Record<string, string>
      expect(headers['Authorization']).toBe('Bearer secret-key')
    })
  })

  describe('executeSwap()', () => {
    it('throws when wallet is not connected', async () => {
      const { useWalletStore } = await import('@/stores/walletStore')
      useWalletStore().address = null
      useWalletStore().chainId = null

      const { useSwap } = await import('@/composables/useSwap')
      const { executeSwap } = useSwap()
      await expect(executeSwap(FROM_TOKEN, TO_TOKEN, '1000000000000000000')).rejects.toThrow(
        'Wallet not connected',
      )
    })

    it('returns tx hash on successful swap', async () => {
      const { useWalletStore } = await import('@/stores/walletStore')
      useWalletStore().setWallet('0xUser', 1)
      vi.mocked(fetch).mockReturnValue(makeFetch(mockSwapResponse()) as any)
      mockSendTransaction.mockResolvedValue({ hash: '0xhash123' })

      const { useSwap } = await import('@/composables/useSwap')
      const { executeSwap } = useSwap()
      const hash = await executeSwap(FROM_TOKEN, TO_TOKEN, '1000000000000000000')
      expect(hash).toBe('0xhash123')
    })

    it('user rejection (4001) shows warning toast and throws ToastHandledError', async () => {
      const { useWalletStore } = await import('@/stores/walletStore')
      useWalletStore().setWallet('0xUser', 1)
      vi.mocked(fetch).mockReturnValue(makeFetch(mockSwapResponse()) as any)
      mockSendTransaction.mockRejectedValue({ code: 4001, message: 'rejected' })

      const toastSpy = vi.spyOn(await import('@/composables/useToast'), 'showToast')
      const { useSwap } = await import('@/composables/useSwap')
      const { executeSwap } = useSwap()

      await expect(executeSwap(FROM_TOKEN, TO_TOKEN, '1000000000000000000')).rejects.toBeInstanceOf(
        ToastHandledError,
      )
      expect(toastSpy).toHaveBeenCalledWith('Transaction rejected by user', 'warning')
    })

    it('generic transaction error shows error toast and throws ToastHandledError', async () => {
      const { useWalletStore } = await import('@/stores/walletStore')
      useWalletStore().setWallet('0xUser', 1)
      vi.mocked(fetch).mockReturnValue(makeFetch(mockSwapResponse()) as any)
      mockSendTransaction.mockRejectedValue(new Error('out of gas'))

      const toastSpy = vi.spyOn(await import('@/composables/useToast'), 'showToast')
      const { useSwap } = await import('@/composables/useSwap')
      const { executeSwap } = useSwap()

      await expect(executeSwap(FROM_TOKEN, TO_TOKEN, '1000000000000000000')).rejects.toBeInstanceOf(
        ToastHandledError,
      )
      expect(toastSpy).toHaveBeenCalledWith(expect.stringContaining('out of gas'), 'error')
    })
  })
})
