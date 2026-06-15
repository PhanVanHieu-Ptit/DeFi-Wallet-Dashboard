<template>
  <div class="bg-gray-900 rounded-2xl p-6 border border-white/10 w-full max-w-2xl">
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-lg font-semibold text-white">Transaction History</h2>
      <RouterLink
        to="/"
        class="flex items-center min-h-11 px-1 text-sm text-gray-400 hover:text-white transition-colors"
      >
        ← Back
      </RouterLink>
    </div>

    <!-- Filter tabs -->
    <div class="flex gap-1 bg-gray-800/60 rounded-xl p-1 mb-5">
      <button
        v-for="tab in TABS"
        :key="tab.value"
        class="flex-1 px-3 py-2 min-h-11 rounded-lg text-sm font-medium transition-colors"
        :class="activeTab === tab.value
          ? 'bg-gray-700 text-white'
          : 'text-gray-400 hover:text-gray-200'"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading && !txList.length" class="flex flex-col gap-3">
      <div v-for="i in 5" :key="i" class="h-14 rounded-xl bg-gray-800 animate-pulse" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!filteredList.length"
      class="py-12 text-center text-gray-500 text-sm"
    >
      {{ txList.length ? 'No transactions match this filter.' : 'No transactions found.' }}
    </div>

    <!-- Transaction rows -->
    <div v-else class="flex flex-col divide-y divide-white/5">
      <div
        v-for="tx in filteredList"
        :key="tx.hash"
        class="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-white/5 transition-colors"
      >
        <!-- Direction icon -->
        <div
          class="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
          :class="tx.direction === 'in' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'"
        >
          <!-- Arrow up (received) -->
          <svg
            v-if="tx.direction === 'in'"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-4 w-4"
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
          <!-- Arrow down (sent) -->
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-4 w-4"
          >
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>

        <!-- Hash + from/to address -->
        <div class="flex-1 min-w-0">
          <a
            :href="etherscanUrl(tx.hash)"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 max-w-full text-sm font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
            @click.stop
          >
            {{ truncateHash(tx.hash) }}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3 opacity-60">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
            </svg>
          </a>
          <p class="text-xs text-gray-500 truncate mt-0.5">
            {{ tx.direction === 'in' ? 'From' : 'To' }}
            {{ tx.direction === 'in'
              ? `${tx.from.slice(0, 6)}…${tx.from.slice(-4)}`
              : `${tx.to.slice(0, 6)}…${tx.to.slice(-4)}` }}
          </p>
        </div>

        <!-- Amount + USD + time -->
        <div class="text-right shrink-0">
          <p
            class="text-sm font-medium"
            :class="tx.direction === 'in' ? 'text-emerald-400' : 'text-white'"
          >
            {{ tx.direction === 'in' ? '+' : '-' }}{{ fmtAmount(tx.value) }} {{ tx.asset }}
          </p>
          <p class="text-xs text-gray-500">{{ getUsdValue(tx.asset, tx.value) }}</p>
          <p class="text-xs text-gray-600 mt-0.5">{{ timeAgo(tx.timestamp) }}</p>
        </div>
      </div>
    </div>

    <!-- Load more -->
    <button
      v-if="txList.length"
      class="mt-4 w-full py-2.5 min-h-11 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
      :disabled="loading"
      @click="fetchMore"
    >
      {{ loading ? 'Loading…' : 'Load more' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTransactions } from '@/composables/useTransactions'
import { useTokenPrice, type TokenId } from '@/composables/useTokenPrice'
import { useWalletStore } from '@/stores/walletStore'

const { txList, loading, fetchMore } = useTransactions()
const { prices } = useTokenPrice()
const walletStore = useWalletStore()
const { chainId } = storeToRefs(walletStore)

type Tab = 'all' | 'in' | 'out'
const activeTab = ref<Tab>('all')

const TABS: { label: string; value: Tab }[] = [
  { label: 'All', value: 'all' },
  { label: 'Received', value: 'in' },
  { label: 'Sent', value: 'out' },
]

const ASSET_TO_PRICE_KEY: Record<string, TokenId> = {
  ETH: 'ethereum',
  WETH: 'ethereum',
  USDC: 'usd-coin',
  USDT: 'tether',
}

const ETHERSCAN_BASE: Record<number, string> = {
  1: 'https://etherscan.io',
  11155111: 'https://sepolia.etherscan.io',
  17000: 'https://holesky.etherscan.io',
}

const filteredList = computed(() => {
  if (activeTab.value === 'all') return txList.value
  return txList.value.filter(tx => tx.direction === activeTab.value)
})

function truncateHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`
}

function etherscanUrl(hash: string): string {
  const base = ETHERSCAN_BASE[chainId.value ?? 1] ?? 'https://etherscan.io'
  return `${base}/tx/${hash}`
}

function fmtAmount(value: string): string {
  const n = parseFloat(value)
  if (isNaN(n) || n === 0) return '0'
  if (n < 0.0001) return '< 0.0001'
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 })
}

function getUsdValue(asset: string, value: string): string {
  const priceKey = ASSET_TO_PRICE_KEY[asset.toUpperCase()]
  if (!priceKey) return '—'
  const price = prices.value[priceKey]
  if (!price) return '—'
  const n = parseFloat(value)
  if (isNaN(n)) return '—'
  return `$${(n * price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function timeAgo(iso: string): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} mo ago`
  const years = Math.floor(months / 12)
  return `${years}y ago`
}
</script>
