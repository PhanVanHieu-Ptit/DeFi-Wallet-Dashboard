import { ref, watch } from 'vue'
import { BrowserProvider, Contract, formatEther, formatUnits } from 'ethers'
import { useWalletStore } from '@/stores/walletStore'

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]

const TOKEN_LIST = [
  { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
  { symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
]

export interface TokenBalance {
  symbol: string
  address: string
  balance: string
  decimals: number
}

export function useBalance() {
  const walletStore = useWalletStore()
  const ethBalance = ref('0')
  const tokens = ref<TokenBalance[]>([])
  const loading = ref(false)

  async function fetchToken(
    contract: Contract,
    address: string,
    fallbackSymbol: string,
  ): Promise<TokenBalance> {
    try {
      const [balance, decimals, symbol] = await Promise.all([
        contract.balanceOf(address) as Promise<bigint>,
        contract.decimals() as Promise<number>,
        contract.symbol() as Promise<string>,
      ])
      return { symbol, address: contract.target as string, balance: formatUnits(balance, decimals), decimals }
    } catch {
      return { symbol: fallbackSymbol, address: contract.target as string, balance: '0', decimals: 18 }
    }
  }

  async function refresh(): Promise<void> {
    const address = walletStore.address
    if (!address) {
      ethBalance.value = '0'
      tokens.value = []
      return
    }

    loading.value = true
    try {
      const provider = new BrowserProvider((window as any).ethereum)
      const contracts = TOKEN_LIST.map((t) => new Contract(t.address, ERC20_ABI, provider))

      const [rawEth, tokenBalances] = await Promise.all([
        provider.getBalance(address),
        Promise.all(TOKEN_LIST.map((t, i) => fetchToken(contracts[i], address, t.symbol))),
      ])

      ethBalance.value = formatEther(rawEth)
      tokens.value = tokenBalances
    } finally {
      loading.value = false
    }
  }

  watch(() => walletStore.address, refresh, { immediate: true })

  return { ethBalance, tokens, loading, refresh }
}
