import { ref, onMounted, onUnmounted } from 'vue'

const TOKEN_IDS = 'ethereum,usd-coin,tether'
const BASE_URL = import.meta.env.VITE_COINGECKO_URL ?? 'https://api.coingecko.com/api/v3'
const POLL_INTERVAL_MS = 30_000

export type TokenId = 'ethereum' | 'usd-coin' | 'tether'
export type PriceMap = Record<TokenId, number>

interface CoinGeckoResponse {
  [id: string]: {
    usd: number
    usd_24h_change: number
  }
}

export function useTokenPrice() {
  const prices = ref<PriceMap>({ ethereum: 0, 'usd-coin': 0, tether: 0 })
  const priceChange24h = ref<PriceMap>({ ethereum: 0, 'usd-coin': 0, tether: 0 })
  const loading = ref(false)
  let hasFetched = false

  let intervalId: ReturnType<typeof setInterval> | null = null

  async function fetchPrices(): Promise<void> {
    if (!hasFetched) loading.value = true
    try {
      const url = `${BASE_URL}/simple/price?ids=${TOKEN_IDS}&vs_currencies=usd&include_24hr_change=true`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`CoinGecko ${res.status}`)

      const data: CoinGeckoResponse = await res.json()

      const ids: TokenId[] = ['ethereum', 'usd-coin', 'tether']
      for (const id of ids) {
        if (data[id]) {
          prices.value[id] = data[id].usd
          priceChange24h.value[id] = data[id].usd_24h_change
        }
      }
    } catch {
      // Silently keep the last successfully cached values
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

  return { prices, priceChange24h, loading }
}
