<template>
  <div class="bg-gray-900 rounded-2xl p-6 border border-white/10 w-full">
    <div class="flex items-center justify-between mb-4">
      <span class="text-sm font-medium text-gray-400 uppercase tracking-wider">Market Prices</span>
      <span v-if="isMock" class="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full">
        Demo data
      </span>
    </div>

    <div v-if="loading" class="flex flex-col gap-3">
      <div v-for="i in 5" :key="i" class="h-12 rounded-xl bg-gray-800 animate-pulse" />
    </div>

    <div v-else class="flex flex-col gap-1">
      <div
        v-for="token in rows"
        :key="token.id"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
      >
        <div
          class="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
          :class="token.color"
        >
          {{ token.symbol }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-white">{{ token.name }}</p>
          <p class="text-xs text-gray-500">{{ token.symbol }}</p>
        </div>
        <div class="text-right shrink-0">
          <p class="text-sm font-medium text-white">${{ fmtPrice(prices[token.id]) }}</p>
          <p
            class="text-xs font-medium"
            :class="priceChange24h[token.id] >= 0 ? 'text-emerald-400' : 'text-red-400'"
          >
            {{ priceChange24h[token.id] >= 0 ? '+' : '' }}{{ priceChange24h[token.id].toFixed(2) }}%
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTokenPrice, type TokenId } from '@/composables/useTokenPrice'

const { prices, priceChange24h, loading, isMock } = useTokenPrice()

const rows: { id: TokenId; name: string; symbol: string; color: string }[] = [
  { id: 'bitcoin',     name: 'Bitcoin',  symbol: 'BTC', color: 'bg-orange-500' },
  { id: 'ethereum',   name: 'Ethereum', symbol: 'ETH', color: 'bg-indigo-500' },
  { id: 'binancecoin', name: 'BNB',     symbol: 'BNB', color: 'bg-yellow-500' },
  { id: 'usd-coin',   name: 'USD Coin', symbol: 'USDC', color: 'bg-blue-500' },
  { id: 'tether',     name: 'Tether',   symbol: 'USDT', color: 'bg-emerald-600' },
]

function fmtPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (n >= 1) return n.toFixed(4)
  return n.toFixed(6)
}
</script>
