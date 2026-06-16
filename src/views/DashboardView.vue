<template>
  <main class="min-h-screen bg-gray-950 text-white flex flex-col items-center py-10 gap-6 px-4">
    <h1 class="text-3xl font-bold">DeFi Wallet Dashboard</h1>

    <div v-if="wallet.isConnected" class="flex flex-col items-center gap-4 w-full max-w-md">
      <div class="text-center">
        <p class="text-gray-400 text-sm mb-1">Connected wallet</p>
        <p class="font-mono text-emerald-400 text-sm">{{ wallet.shortAddress }}</p>
        <button
          class="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg text-sm font-medium transition-colors"
          @click="disconnect"
        >
          Disconnect
        </button>
      </div>
      <BalanceCard />
    </div>

    <div v-else class="flex flex-col items-center gap-2">
      <template v-if="hasWallet">
        <button
          class="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition-colors disabled:opacity-50"
          :disabled="wallet.status === 'connecting'"
          @click="handleConnect"
        >
          {{ wallet.status === 'connecting' ? 'Connecting…' : 'Connect Wallet' }}
        </button>
        <p v-if="connectError" class="text-red-400 text-sm">{{ connectError }}</p>
      </template>
      <template v-else>
        <p class="text-gray-400 text-sm">No Web3 wallet detected.</p>
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noopener noreferrer"
          class="px-6 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl font-semibold transition-colors"
        >
          Install MetaMask
        </a>
      </template>
    </div>

    <nav v-if="wallet.isConnected" class="flex gap-4">
      <RouterLink
        to="/swap"
        class="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
      >
        Swap
      </RouterLink>
      <RouterLink
        to="/history"
        class="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
      >
        History
      </RouterLink>
    </nav>

    <!-- Price table always visible -->
    <div class="w-full max-w-md">
      <PriceTable />
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWallet } from '@/composables/useWallet'
import { useWalletStore } from '@/stores/walletStore'
import BalanceCard from '@/components/BalanceCard.vue'
import PriceTable from '@/components/PriceTable.vue'

const wallet = useWalletStore()
const { connect, disconnect } = useWallet()

const hasWallet = ref(false)
const connectError = ref<string | null>(null)

onMounted(() => {
  // Some wallets inject window.ethereum after DOMContentLoaded, so check once mounted.
  hasWallet.value = !!(window as any).ethereum
})

async function handleConnect() {
  connectError.value = null
  try {
    await connect()
  } catch (err: any) {
    connectError.value = err?.message ?? 'Failed to connect wallet.'
  }
}
</script>
