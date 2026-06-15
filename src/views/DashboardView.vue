<template>
  <main class="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6">
    <h1 class="text-3xl font-bold">DeFi Wallet Dashboard</h1>

    <div v-if="wallet.isConnected" class="text-center">
      <p class="text-gray-400 text-sm mb-1">Connected wallet</p>
      <p class="font-mono text-emerald-400 text-sm">{{ wallet.address }}</p>
      <button
        class="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg text-sm font-medium transition-colors"
        @click="disconnect"
      >
        Disconnect
      </button>
    </div>

    <button
      v-else
      class="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition-colors"
      @click="connect"
    >
      Connect Wallet
    </button>

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
  </main>
</template>

<script setup lang="ts">
import { useWalletStore } from '@/stores/wallet'

const wallet = useWalletStore()

async function connect() {
  const provider = (window as any).ethereum
  if (!provider) {
    alert('No wallet detected. Install MetaMask or another Web3 wallet.')
    return
  }
  const [addr] = await provider.request({ method: 'eth_requestAccounts' })
  wallet.setAddress(addr)
}

function disconnect() {
  wallet.setAddress(null)
}
</script>
