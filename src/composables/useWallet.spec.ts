import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

let connect: () => Promise<void>
let disconnect: () => void

function makeBrowserProvider(overrides: Record<string, any> = {}) {
  return {
    send: vi.fn().mockResolvedValue(['0xDeadBeef0000000000000000000000000000dead']),
    getNetwork: vi.fn().mockResolvedValue({ chainId: 1n }),
    getSigner: vi.fn(),
    ...overrides,
  }
}

async function setupWallet(providerOverrides: Record<string, any> = {}) {
  vi.resetModules()
  const provider = makeBrowserProvider(providerOverrides)
  vi.doMock('ethers', async () => {
    const actual = await vi.importActual<typeof import('ethers')>('ethers')
    return {
      ...actual,
      BrowserProvider: vi.fn().mockImplementation(function () { return provider }),
    }
  })
  const mod = await import('@/composables/useWallet')
  connect = mod.connect
  disconnect = mod.disconnect
  return provider
}

describe('connect()', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('happy path: sets address and chainId in store', async () => {
    const { useWalletStore } = await import('@/stores/walletStore')
    const store = useWalletStore()
    ;(window as any).ethereum.on = vi.fn()

    await setupWallet()
    await connect()

    expect(store.address).toBe('0xDeadBeef0000000000000000000000000000dead')
    expect(store.chainId).toBe(1)
    expect(store.status).toBe('connected')
  })

  it('throws when window.ethereum is not present', async () => {
    await setupWallet()
    delete (window as any).ethereum
    await expect(connect()).rejects.toThrow('No Ethereum wallet detected')
  })

  it('throws and resets store when no accounts returned', async () => {
    const { useWalletStore } = await import('@/stores/walletStore')
    const store = useWalletStore()

    await setupWallet({ send: vi.fn().mockResolvedValue([]) })
    await expect(connect()).rejects.toThrow('No accounts returned')
    expect(store.status).toBe('disconnected')
  })

  it('user rejection (code 4001) resets store and shows toast', async () => {
    await setupWallet({ send: vi.fn().mockRejectedValue({ code: 4001, message: 'rejected' }) })
    await expect(connect()).rejects.toBeTruthy()

    // Check toast via the toasts array — spy won't work here since vi.resetModules()
    // creates a new useToast module instance that useWallet.ts imports fresh
    const { useToast } = await import('@/composables/useToast')
    const errorToasts = useToast().toasts.filter(t => t.type === 'error')
    expect(errorToasts.some(t => t.message.includes('Wallet connection rejected'))).toBe(true)
  })

  it('unsupported chain shows warning toast but connect succeeds', async () => {
    const { useWalletStore } = await import('@/stores/walletStore')
    ;(window as any).ethereum.on = vi.fn()

    await setupWallet({ getNetwork: vi.fn().mockResolvedValue({ chainId: 999n }) })
    await connect()

    const { useToast } = await import('@/composables/useToast')
    const warnToasts = useToast().toasts.filter(t => t.type === 'warning')
    expect(warnToasts.some(t => t.message.includes('Unsupported network'))).toBe(true)
    expect(useWalletStore().status).toBe('connected')
  })
})

describe('disconnect()', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await setupWallet()
  })

  it('resets the store', async () => {
    const { useWalletStore } = await import('@/stores/walletStore')
    const store = useWalletStore()
    store.setWallet('0xDeadBeef0000000000000000000000000000dead', 1)

    disconnect()
    expect(store.status).toBe('disconnected')
    expect(store.address).toBeNull()
  })
})

describe('event listeners', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  async function connectAndGetListeners() {
    const listeners: Record<string, Function> = {}
    const eth = (window as any).ethereum
    eth.on = vi.fn((event: string, cb: Function) => { listeners[event] = cb })

    await setupWallet()
    await connect()
    return listeners
  }

  it('accountsChanged with empty array resets store', async () => {
    const { useWalletStore } = await import('@/stores/walletStore')
    const store = useWalletStore()
    const listeners = await connectAndGetListeners()

    listeners['accountsChanged']([])
    expect(store.status).toBe('disconnected')
  })

  it('accountsChanged with new address updates store.address', async () => {
    const { useWalletStore } = await import('@/stores/walletStore')
    const store = useWalletStore()
    const listeners = await connectAndGetListeners()

    listeners['accountsChanged'](['0xNewAddress'])
    expect(store.address).toBe('0xNewAddress')
  })

  it('chainChanged updates chainId in store', async () => {
    const { useWalletStore } = await import('@/stores/walletStore')
    const store = useWalletStore()
    const listeners = await connectAndGetListeners()

    listeners['chainChanged']('0xaa36a7')
    expect(store.chainId).toBe(11155111)
  })
})
