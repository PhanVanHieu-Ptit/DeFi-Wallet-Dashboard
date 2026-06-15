import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import { formatEther, formatUnits } from 'ethers'

const mockGetBalance = vi.fn()
const mockBalanceOf = vi.fn()
const mockDecimals = vi.fn()
const mockSymbol = vi.fn()

vi.mock('ethers', async () => {
  const actual = await vi.importActual<typeof import('ethers')>('ethers')
  return {
    ...actual,
    BrowserProvider: vi.fn().mockImplementation(function () {
      return { getBalance: mockGetBalance }
    }),
    Contract: vi.fn().mockImplementation(function () {
      return {
        balanceOf: mockBalanceOf,
        decimals: mockDecimals,
        symbol: mockSymbol,
        target: '0xToken',
      }
    }),
  }
})

describe('useBalance', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('returns zero balances when address is null', async () => {
    const { useWalletStore } = await import('@/stores/walletStore')
    useWalletStore().address = null

    const { useBalance } = await import('@/composables/useBalance')
    const { ethBalance, tokens, loading } = useBalance()

    await flushPromises()

    expect(ethBalance.value).toBe('0')
    expect(tokens.value).toEqual([])
    expect(loading.value).toBe(false)
    expect(mockGetBalance).not.toHaveBeenCalled()
  })

  it('fetches ETH balance correctly', async () => {
    const { useWalletStore } = await import('@/stores/walletStore')
    useWalletStore().setWallet('0xUser', 1)

    const oneEth = 1000000000000000000n
    mockGetBalance.mockResolvedValue(oneEth)
    mockBalanceOf.mockResolvedValue(0n)
    mockDecimals.mockResolvedValue(18)
    mockSymbol.mockResolvedValue('WETH')

    const { useBalance } = await import('@/composables/useBalance')
    const { ethBalance, refresh } = useBalance()
    await refresh()

    expect(ethBalance.value).toBe(formatEther(oneEth))
  })

  it('fetches ERC20 token balance correctly', async () => {
    const { useWalletStore } = await import('@/stores/walletStore')
    useWalletStore().setWallet('0xUser', 1)

    mockGetBalance.mockResolvedValue(0n)
    mockBalanceOf.mockResolvedValue(1000000n)
    mockDecimals.mockResolvedValue(6)
    mockSymbol.mockResolvedValue('USDC')

    const { useBalance } = await import('@/composables/useBalance')
    const { tokens, refresh } = useBalance()
    await refresh()

    expect(tokens.value[0].balance).toBe(formatUnits(1000000n, 6))
    expect(tokens.value[0].decimals).toBe(6)
  })

  it('returns fallback token with balance 0 when balanceOf throws', async () => {
    const { useWalletStore } = await import('@/stores/walletStore')
    useWalletStore().setWallet('0xUser', 1)

    mockGetBalance.mockResolvedValue(0n)
    mockBalanceOf.mockRejectedValue(new Error('call failed'))
    mockDecimals.mockRejectedValue(new Error('call failed'))
    mockSymbol.mockRejectedValue(new Error('call failed'))

    const { useBalance } = await import('@/composables/useBalance')
    const { tokens, refresh } = useBalance()
    await refresh()

    expect(tokens.value[0].balance).toBe('0')
    expect(tokens.value[0].decimals).toBe(18)
  })

  it('loading is true during fetch and false after', async () => {
    const { useWalletStore } = await import('@/stores/walletStore')
    useWalletStore().setWallet('0xUser', 1)

    let resolveBalance!: (v: bigint) => void
    mockGetBalance.mockReturnValue(new Promise<bigint>(r => { resolveBalance = r }))
    mockBalanceOf.mockResolvedValue(0n)
    mockDecimals.mockResolvedValue(18)
    mockSymbol.mockResolvedValue('WETH')

    const { useBalance } = await import('@/composables/useBalance')
    const { loading, refresh } = useBalance()

    const fetchPromise = refresh()
    expect(loading.value).toBe(true)
    resolveBalance(0n)
    await fetchPromise
    expect(loading.value).toBe(false)
  })
})
