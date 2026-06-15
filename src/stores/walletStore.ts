import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useWalletStore = defineStore('wallet', () => {
  const address = ref<string | null>(null)
  const chainId = ref<number | null>(null)
  const status = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')

  const isConnected = computed(() => status.value === 'connected')

  const shortAddress = computed(() => {
    if (!address.value) return null
    return `${address.value.slice(0, 6)}...${address.value.slice(-4)}`
  })

  function setWallet(addr: string, chain: number) {
    address.value = addr
    chainId.value = chain
    status.value = 'connected'
  }

  function reset() {
    address.value = null
    chainId.value = null
    status.value = 'disconnected'
  }

  return { address, chainId, status, isConnected, shortAddress, setWallet, reset }
})
