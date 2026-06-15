import { BrowserProvider } from 'ethers'
import { useWalletStore } from '@/stores/walletStore'

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
    store.chainId = parseInt(hexChainId, 16)
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
    store.setWallet(accounts[0], Number(network.chainId))

    attachListeners()
  } catch (err) {
    store.reset()
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
