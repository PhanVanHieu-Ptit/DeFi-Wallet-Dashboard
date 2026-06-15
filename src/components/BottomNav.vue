<template>
  <nav
    v-if="wallet.isConnected"
    class="fixed bottom-0 left-0 right-0 z-50 flex sm:hidden bg-gray-900 border-t border-white/10"
  >
    <RouterLink
      to="/"
      class="flex-1 flex flex-col items-center justify-center min-h-[56px] transition-colors"
      :class="route.path === '/' ? 'text-indigo-400' : 'text-gray-500'"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
      <span class="text-[10px] mt-1 font-medium">Dashboard</span>
    </RouterLink>

    <RouterLink
      to="/swap"
      class="flex-1 flex flex-col items-center justify-center min-h-[56px] transition-colors"
      :class="route.path === '/swap' ? 'text-indigo-400' : 'text-gray-500'"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
        <path d="M7 16V4m0 0L3 8m4-4l4 4" />
        <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
      </svg>
      <span class="text-[10px] mt-1 font-medium">Swap</span>
    </RouterLink>

    <RouterLink
      to="/history"
      class="flex-1 flex flex-col items-center justify-center min-h-[56px] transition-colors"
      :class="route.path === '/history' ? 'text-indigo-400' : 'text-gray-500'"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
      <span class="text-[10px] mt-1 font-medium">History</span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useWalletStore } from '@/stores/walletStore'

const route = useRoute()
const wallet = useWalletStore()
</script>
