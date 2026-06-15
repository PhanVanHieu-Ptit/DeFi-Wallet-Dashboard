import { vi, beforeEach, afterEach } from 'vitest'
import { createEthereumMock } from './mocks/ethereum'

global.fetch = vi.fn() as unknown as typeof fetch

Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
})

beforeEach(() => {
  ;(window as any).ethereum = createEthereumMock()
})

afterEach(() => {
  vi.mocked(fetch).mockReset()
  delete (window as any).ethereum
})
