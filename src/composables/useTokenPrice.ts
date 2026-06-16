import { ref, onMounted, onUnmounted } from 'vue'

const TOKEN_IDS = 'ethereum,usd-coin,tether,bitcoin,binancecoin'
const BASE_URL = import.meta.env.VITE_COINGECKO_URL ?? 'https://api.coingecko.com/api/v3'
const POLL_INTERVAL_MS = 60_000

export type TokenId = 'ethereum' | 'usd-coin' | 'tether' | 'bitcoin' | 'binancecoin'
export type PriceMap = Record<TokenId, number>

// Fallback prices used when the API is unreachable (e.g. CORS in dev, rate limit)
const FALLBACK_PRICES: PriceMap = {
  bitcoin: 105000,
  ethereum: 3800,
  binancecoin: 650,
  'usd-coin': 1.0,
  tether: 1.0,
}
const FALLBACK_CHANGES: PriceMap = {
  bitcoin: 2.4,
  ethereum: 1.8,
  binancecoin: 3.1,
  'usd-coin': 0.01,
  tether: -0.02,
}

interface CoinGeckoResponse {
  [id: string]: {
    usd: number
    usd_24h_change: number
  }
}

export function useTokenPrice() {
  const prices = ref<PriceMap>({ ...FALLBACK_PRICES })
  const priceChange24h = ref<PriceMap>({ ...FALLBACK_CHANGES })
  const loading = ref(false)
  const isMock = ref(false)
  let hasFetched = false

  let intervalId: ReturnType<typeof setInterval> | null = null

  async function fetchPrices(): Promise<void> {
    if (!hasFetched) loading.value = true
    try {
      const url = `${BASE_URL}/simple/price?ids=${TOKEN_IDS}&vs_currencies=usd&include_24hr_change=true`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`CoinGecko ${res.status}`)

      const data: CoinGeckoResponse = await res.json()

      const ids: TokenId[] = ['ethereum', 'usd-coin', 'tether', 'bitcoin', 'binancecoin']
      for (const id of ids) {
        if (data[id]) {
          prices.value[id] = data[id].usd
          priceChange24h.value[id] = data[id].usd_24h_change
        }
      }
      isMock.value = false
    } catch {
      // Keep fallback values already set; mark as mock so UI can indicate it
      isMock.value = true
    } finally {
      if (!hasFetched) {
        loading.value = false
        hasFetched = true
      }
    }
  }

  onMounted(() => {
    fetchPrices()
    intervalId = setInterval(fetchPrices, POLL_INTERVAL_MS)
  })

  onUnmounted(() => {
    if (intervalId !== null) clearInterval(intervalId)
  })

  return { prices, priceChange24h, loading, isMock }
}
