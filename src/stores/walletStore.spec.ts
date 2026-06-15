import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWalletStore } from '@/stores/walletStore'

describe('walletStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('has correct initial state', () => {
    const store = useWalletStore()
    expect(store.address).toBeNull()
    expect(store.chainId).toBeNull()
    expect(store.status).toBe('disconnected')
    expect(store.isConnected).toBe(false)
    expect(store.shortAddress).toBeNull()
  })

  it('setWallet sets address, chainId and status=connected', () => {
    const store = useWalletStore()
    store.setWallet('0xABCDEF1234567890ABCDEF1234567890ABCDEF12', 1)
    expect(store.address).toBe('0xABCDEF1234567890ABCDEF1234567890ABCDEF12')
    expect(store.chainId).toBe(1)
    expect(store.status).toBe('connected')
    expect(store.isConnected).toBe(true)
  })

  it('shortAddress formats as first 6 chars + ... + last 4 chars', () => {
    const store = useWalletStore()
    store.setWallet('0xABCDEF1234567890ABCDEF1234567890ABCDEF12', 1)
    expect(store.shortAddress).toBe('0xABCD...EF12')
  })

  it('shortAddress returns null when no address', () => {
    const store = useWalletStore()
    expect(store.shortAddress).toBeNull()
  })

  it('reset returns store to initial state', () => {
    const store = useWalletStore()
    store.setWallet('0xABCDEF1234567890ABCDEF1234567890ABCDEF12', 1)
    store.reset()
    expect(store.address).toBeNull()
    expect(store.chainId).toBeNull()
    expect(store.status).toBe('disconnected')
    expect(store.isConnected).toBe(false)
  })

  it('status can be set to connecting manually', () => {
    const store = useWalletStore()
    store.status = 'connecting'
    expect(store.status).toBe('connecting')
    expect(store.isConnected).toBe(false)
  })

  it('isConnected is only true when status is connected', () => {
    const store = useWalletStore()
    store.status = 'disconnected'
    expect(store.isConnected).toBe(false)
    store.status = 'connecting'
    expect(store.isConnected).toBe(false)
    store.status = 'connected'
    expect(store.isConnected).toBe(true)
  })
})
