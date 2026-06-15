import { ref } from 'vue'
import { BrowserProvider } from 'ethers'
import { useWalletStore } from '@/stores/walletStore'

const BASE_URL = import.meta.env.VITE_1INCH_API_URL ?? 'https://api.1inch.io/v5.0'

interface SwapTokenInfo {
  address: string
  decimals: number
  symbol: string
  name: string
  logoURI: string
  usdPrice?: number
}

interface SwapQuote {
  fromToken: SwapTokenInfo
  toToken: SwapTokenInfo
  fromTokenAmount: string
  toTokenAmount: string
  protocols: unknown[]
}

interface OneInchSwapTx {
  from: string
  to: string
  data: string
  value: string
  gasPrice: string
  gas: number
}

async function call1inch(
  chainId: number,
  path: 'quote' | 'swap',
  params: Record<string, string | number>,
): Promise<Record<string, unknown>> {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  ).toString()

  const headers: Record<string, string> = { Accept: 'application/json' }
  const apiKey = import.meta.env.VITE_1INCH_API_KEY
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

  const res = await fetch(`${BASE_URL}/${chainId}/${path}?${query}`, { headers })
  const data = await res.json()

  if (!res.ok) {
    throw new Error((data as { description?: string }).description ?? `1inch HTTP ${res.status}`)
  }

  return data as Record<string, unknown>
}

export function useSwap() {
  const walletStore = useWalletStore()
  const quote = ref<SwapQuote | null>(null)
  const estimatedGas = ref<number | null>(null)
  const priceImpact = ref<number | null>(null)
  const loading = ref(false)

  async function getQuote(
    fromToken: string,
    toToken: string,
    amount: string,
    slippage = 0.5,
  ): Promise<void> {
    const chainId = walletStore.chainId
    if (!chainId) throw new Error('Wallet not connected.')

    loading.value = true
    try {
      const data = await call1inch(chainId, 'quote', {
        fromTokenAddress: fromToken,
        toTokenAddress: toToken,
        amount,
      })

      const q: SwapQuote = {
        fromToken: data.fromToken as SwapTokenInfo,
        toToken: data.toToken as SwapTokenInfo,
        fromTokenAmount: data.fromTokenAmount as string,
        toTokenAmount: data.toTokenAmount as string,
        protocols: data.protocols as unknown[],
      }

      quote.value = q
      estimatedGas.value = (data.estimatedGas as number) ?? null

      const fp = q.fromToken.usdPrice
      const tp = q.toToken.usdPrice
      if (fp != null && tp != null) {
        const fromUsd = fp * (Number(q.fromTokenAmount) / 10 ** q.fromToken.decimals)
        const toUsd = tp * (Number(q.toTokenAmount) / 10 ** q.toToken.decimals)
        priceImpact.value = fromUsd > 0 ? (1 - toUsd / fromUsd) * 100 : null
      } else {
        priceImpact.value = null
      }

      void slippage // slippage only applies to swap, not quote
    } finally {
      loading.value = false
    }
  }

  async function executeSwap(
    fromToken: string,
    toToken: string,
    amount: string,
    slippage = 0.5,
  ): Promise<string> {
    const address = walletStore.address
    const chainId = walletStore.chainId
    if (!address || !chainId) throw new Error('Wallet not connected.')

    loading.value = true
    try {
      const data = await call1inch(chainId, 'swap', {
        fromTokenAddress: fromToken,
        toTokenAddress: toToken,
        amount,
        fromAddress: address,
        slippage,
      })

      const tx = data.tx as OneInchSwapTx

      const provider = new BrowserProvider((window as any).ethereum)
      const signer = await provider.getSigner()

      const txResponse = await signer.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: BigInt(tx.value),
        gasLimit: BigInt(tx.gas),
      })

      return txResponse.hash
    } finally {
      loading.value = false
    }
  }

  return { quote, estimatedGas, priceImpact, loading, getQuote, executeSwap }
}
