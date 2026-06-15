<template>
  <div class="bg-gray-900 rounded-2xl p-6 border border-white/10 w-full">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <span class="text-sm font-medium text-gray-400 uppercase tracking-wider">Portfolio</span>
      <button
        class="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
        :disabled="isLoading"
        @click="refresh"
        aria-label="Refresh balances"
      >
        <svg
          class="h-4 w-4 transition-transform"
          :class="{ 'animate-spin': isLoading }"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>

    <!-- Total value -->
    <div class="mb-5">
      <p class="text-xs text-gray-500 mb-1">Total Value</p>
      <div v-if="isLoading" class="h-9 w-48 rounded-lg bg-gray-800 animate-pulse" />
      <p v-else class="text-3xl font-bold text-white">${{ fmt(totalUsd) }}</p>
    </div>

    <!-- Not connected -->
    <div v-if="!isConnected" class="py-6 text-center text-gray-500 text-sm">
      Connect your wallet to see balances
    </div>

    <template v-else>
      <!-- Skeleton rows -->
      <div v-if="isLoading" class="flex flex-col gap-3">
        <div v-for="i in 4" :key="i" class="h-12 rounded-xl bg-gray-800 animate-pulse" />
      </div>

      <!-- Balance rows -->
      <div v-else class="flex flex-col gap-1">
        <!-- ETH row -->
        <div class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors">
          <div class="h-9 w-9 rounded-full bg-indigo-500 flex items-center justify-center shrink-0 text-white text-xs font-bold">
            ETH
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white">Ethereum</p>
            <p class="text-xs text-gray-500">ETH</p>
          </div>
          <div class="text-right shrink-0">
            <p class="text-sm font-medium text-white">{{ fmtToken(ethBalance) }}</p>
            <p class="text-xs text-gray-500">${{ fmt(ethUsd) }}</p>
          </div>
        </div>

        <!-- Divider -->
        <div class="border-t border-white/5 my-1" />

        <!-- ERC-20 tokens -->
        <div
          v-for="token in tokenRows"
          :key="token.address"
          class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
        >
          <div
            class="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
            :class="ICON_COLOR[token.symbol] ?? 'bg-gray-600'"
          >
            {{ token.symbol.slice(0, 3) }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white">{{ token.symbol }}</p>
            <p class="text-xs text-gray-500 truncate">{{ token.address.slice(0, 6) }}…{{ token.address.slice(-4) }}</p>
          </div>
          <div class="text-right shrink-0">
            <p class="text-sm font-medium text-white">{{ fmtToken(token.balance) }}</p>
            <p class="text-xs text-gray-500">${{ fmt(token.usdValue) }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useBalance } from '@/composables/useBalance'
import { useTokenPrice, type TokenId } from '@/composables/useTokenPrice'
import { useWalletStore } from '@/stores/walletStore'

const { ethBalance, tokens, loading, refresh } = useBalance()
const { prices, loading: priceLoading } = useTokenPrice()
const walletStore = useWalletStore()
const { isConnected } = storeToRefs(walletStore)

const PRICE_KEY: Record<string, TokenId> = {
  USDC: 'usd-coin',
  USDT: 'tether',
  WETH: 'ethereum',
}

const ICON_COLOR: Record<string, string> = {
  USDC: 'bg-blue-500',
  USDT: 'bg-emerald-600',
  WETH: 'bg-violet-500',
}

const isLoading = computed(() => loading.value || priceLoading.value)

const ethUsd = computed(() => parseFloat(ethBalance.value) * prices.value['ethereum'])

const tokenRows = computed(() =>
  tokens.value.map((t) => ({
    ...t,
    usdValue: parseFloat(t.balance) * (prices.value[PRICE_KEY[t.symbol] ?? 'ethereum'] ?? 0),
  })),
)

const totalUsd = computed(
  () => ethUsd.value + tokenRows.value.reduce((sum, t) => sum + t.usdValue, 0),
)

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtToken(raw: string): string {
  const n = parseFloat(raw)
  if (isNaN(n)) return '0'
  if (n === 0) return '0'
  if (n < 0.0001) return '< 0.0001'
  return n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })
}
</script>
