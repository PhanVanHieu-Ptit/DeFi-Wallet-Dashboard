import { ref, watch } from 'vue'
import { useWalletStore } from '@/stores/walletStore'
import { showToast, ToastHandledError } from '@/composables/useToast'

const ALCHEMY_URL = `https://eth-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_KEY}`
const API_TIMEOUT_MS = 10_000

export interface Transaction {
  hash: string
  from: string
  to: string
  value: string
  asset: string
  timestamp: string
  direction: 'in' | 'out'
}

interface AlchemyTransfer {
  hash: string
  from: string
  to: string | null
  value: number | null
  asset: string | null
  metadata: { blockTimestamp: string }
}

interface AlchemyResult {
  transfers: AlchemyTransfer[]
  pageKey?: string
}

async function callAlchemy(params: Record<string, unknown>): Promise<AlchemyResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  try {
    const res = await fetch(ALCHEMY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getAssetTransfers',
        params: [params],
      }),
      signal: controller.signal,
    })

    if (!res.ok) throw new Error(`Alchemy HTTP ${res.status}`)
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)
    return data.result as AlchemyResult
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      showToast('Transaction history request timed out (>10s)', 'warning')
      throw new ToastHandledError('API request timed out')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

function parseTransfer(raw: AlchemyTransfer, walletAddress: string): Transaction {
  return {
    hash: raw.hash,
    from: raw.from,
    to: raw.to ?? '',
    value: raw.value != null ? String(raw.value) : '0',
    asset: raw.asset ?? 'ETH',
    timestamp: raw.metadata?.blockTimestamp ?? '',
    direction: raw.from.toLowerCase() === walletAddress.toLowerCase() ? 'out' : 'in',
  }
}

export function useTransactions() {
  const walletStore = useWalletStore()
  const txList = ref<Transaction[]>([])
  const loading = ref(false)
  let pageKeyFrom: string | undefined
  let pageKeyTo: string | undefined

  async function load(address: string, reset: boolean): Promise<void> {
    loading.value = true
    try {
      const base = {
        category: ['external', 'erc20'],
        withMetadata: true,
        maxCount: '0x14',
        order: 'desc',
      }

      const fromParams = reset || !pageKeyFrom
        ? { ...base, fromAddress: address }
        : { ...base, fromAddress: address, pageKey: pageKeyFrom }

      const toParams = reset || !pageKeyTo
        ? { ...base, toAddress: address }
        : { ...base, toAddress: address, pageKey: pageKeyTo }

      const [outResult, inResult] = await Promise.all([
        callAlchemy(fromParams),
        callAlchemy(toParams),
      ])

      pageKeyFrom = outResult.pageKey
      pageKeyTo = inResult.pageKey

      const merged = [
        ...outResult.transfers.map(t => parseTransfer(t, address)),
        ...inResult.transfers.map(t => parseTransfer(t, address)),
      ]

      const seen = new Set<string>()
      const deduped = merged.filter(tx => {
        if (seen.has(tx.hash)) return false
        seen.add(tx.hash)
        return true
      })
      deduped.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

      if (reset) {
        txList.value = deduped
      } else {
        const existing = new Set(txList.value.map(t => t.hash))
        txList.value = [...txList.value, ...deduped.filter(t => !existing.has(t.hash))]
      }
    } catch (err) {
      if (!(err instanceof ToastHandledError)) {
        showToast(
          err instanceof Error ? err.message : 'Failed to load transactions',
          'error',
        )
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchMore(): Promise<void> {
    const address = walletStore.address
    if (!address || (!pageKeyFrom && !pageKeyTo)) return
    await load(address, false)
  }

  watch(
    () => walletStore.address,
    (address) => {
      pageKeyFrom = undefined
      pageKeyTo = undefined
      txList.value = []
      if (address) load(address, true)
    },
    { immediate: true },
  )

  return { txList, loading, fetchMore }
}
