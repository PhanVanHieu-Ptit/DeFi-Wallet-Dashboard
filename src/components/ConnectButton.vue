<template>
  <div class="relative" ref="containerRef">
    <!-- Disconnected -->
    <button
      v-if="status === 'disconnected'"
      class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold transition-colors"
      @click="handleConnect"
    >
      Connect Wallet
    </button>

    <!-- Connecting -->
    <div
      v-else-if="status === 'connecting'"
      class="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/60 text-white text-sm font-semibold cursor-not-allowed select-none"
    >
      <svg class="animate-spin h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      Connecting...
    </div>

    <!-- Connected pill -->
    <button
      v-else
      class="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-sm font-medium transition-colors"
      @click="toggleDropdown"
    >
      <span class="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
      {{ shortAddress }}
      <svg
        class="h-3 w-3 opacity-60 transition-transform"
        :class="{ 'rotate-180': open }"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
      </svg>
    </button>

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition-all duration-150 ease-out"
      enter-from-class="opacity-0 scale-95 -translate-y-1"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition-all duration-100 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-95 -translate-y-1"
    >
      <div
        v-if="open"
        class="absolute right-0 mt-2 w-44 rounded-xl bg-gray-900 border border-white/10 shadow-xl overflow-hidden z-50"
      >
        <button
          class="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-200 hover:bg-white/10 transition-colors"
          @click="copyAddress"
        >
          <svg class="h-4 w-4 opacity-60" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          Copy address
        </button>
        <button
          class="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-white/10 transition-colors"
          @click="handleDisconnect"
        >
          <svg class="h-4 w-4 opacity-70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
          </svg>
          Disconnect
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useWallet } from '@/composables/useWallet'
import { useWalletStore } from '@/stores/walletStore'
import { useToast } from '@/composables/useToast'

const { connect, disconnect } = useWallet()
const walletStore = useWalletStore()
const { status, shortAddress, address } = storeToRefs(walletStore)
const { show } = useToast()

const open = ref(false)
const containerRef = ref<HTMLElement | null>(null)

async function handleConnect() {
  try { await connect() } catch { /* toast already shown by useWallet */ }
}

function onDocumentClick(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocumentClick, true))
onUnmounted(() => document.removeEventListener('click', onDocumentClick, true))

function toggleDropdown() {
  open.value = !open.value
}

async function copyAddress() {
  if (!address.value) return
  await navigator.clipboard.writeText(address.value)
  show('Address copied to clipboard', 'success')
  open.value = false
}

function handleDisconnect() {
  disconnect()
  open.value = false
}
</script>
