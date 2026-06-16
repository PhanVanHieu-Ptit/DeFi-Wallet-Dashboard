import { BrowserProvider } from 'ethers'
import { useWalletStore } from '@/stores/walletStore'
import { showToast } from '@/composables/useToast'

const SUPPORTED_CHAINS = new Set([1, 11155111, 137, 56, 42161, 31337])

// Module-level singletons so listeners are only registered once per session.
let provider: BrowserProvider | null = null
let listenersAttached = false

function getEthereum(): any {
  const eth = (window as any).ethereum
  if (!eth) throw new Error('No Ethereum wallet detected. Please install MetaMask.')
  return eth
}

function getProvider(): BrowserProvider {
  if (!provider) provider = new BrowserProvider(getEthereum())
  return provider
}

function warnIfUnsupported(chainId: number): void {
  if (!SUPPORTED_CHAINS.has(chainId)) {
    showToast('Unsupported network. Please switch to Ethereum mainnet or Sepolia.', 'warning')
  }
}

function attachListeners(): void {
  if (listenersAttached) return
  const eth = getEthereum()
  const store = useWalletStore()

  eth.on('accountsChanged', (accounts: string[]) => {
    if (accounts.length === 0) {
      store.reset()
    } else {
      store.address = accounts[0]
    }
  })

  eth.on('chainChanged', (hexChainId: string) => {
    // Provider must be recreated after a chain change.
    provider = null
    const newChainId = parseInt(hexChainId, 16)
    store.chainId = newChainId
    warnIfUnsupported(newChainId)
  })

  listenersAttached = true
}

export async function connect(): Promise<void> {
  const store = useWalletStore()
  store.status = 'connecting'

  try {
    const p = getProvider()
    const accounts: string[] = await p.send('eth_requestAccounts', [])
    if (!accounts.length) throw new Error('No accounts returned by wallet.')

    const network = await p.getNetwork()
    const chainId = Number(network.chainId)
    store.setWallet(accounts[0], chainId)

    warnIfUnsupported(chainId)
    attachListeners()
  } catch (err: any) {
    store.reset()
    if (err?.code === 4001) {
      showToast('Wallet connection rejected', 'error')
    }
    throw err
  }
}

export function disconnect(): void {
  const store = useWalletStore()
  store.reset()
}

export function useWallet() {
  return { connect, disconnect }
}
