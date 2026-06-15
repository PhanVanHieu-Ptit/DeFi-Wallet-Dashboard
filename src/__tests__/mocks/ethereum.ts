import { vi } from 'vitest'

export function createEthereumMock() {
  return {
    request: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
    isMetaMask: true,
  }
}
