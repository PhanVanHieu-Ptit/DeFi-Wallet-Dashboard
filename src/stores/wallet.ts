import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useWalletStore = defineStore('wallet', () => {
  const address = ref<string | null>(null)
  const isConnected = computed(() => !!address.value)

  function setAddress(addr: string | null) {
    address.value = addr
  }

  return { address, isConnected, setAddress }
})
