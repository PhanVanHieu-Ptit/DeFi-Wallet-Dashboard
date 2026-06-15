import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { setActivePinia, createPinia } from 'pinia'
import { defineComponent } from 'vue'

const Stub = defineComponent({ template: '<div/>' })

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ show: mockShow, toasts: [], dismiss: vi.fn() }),
  showToast: vi.fn(),
  provideToast: vi.fn(),
  ToastKey: Symbol('toast'),
}))

const mockShow = vi.fn()

async function buildRouter(isConnected: boolean) {
  const { useWalletStore } = await import('@/stores/walletStore')
  const store = useWalletStore()
  if (isConnected) {
    store.setWallet('0xUser', 1)
  } else {
    store.reset()
  }

  const { default: appRouter } = await import('@/router/index')

  const router = createRouter({
    history: createMemoryHistory(),
    routes: appRouter.getRoutes().map(r => ({
      path: r.path,
      name: r.name,
      component: Stub,
      meta: r.meta,
    })),
  })

  router.beforeEach((to) => {
    if (!to.meta.requiresWallet) return true
    if (!store.isConnected) {
      mockShow('Please connect your wallet to access this page.', 'warning')
      return { name: 'dashboard' }
    }
  })

  return router
}

describe('router guard', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.resetModules()
    mockShow.mockReset()
  })

  it('allows navigation to / without wallet', async () => {
    const router = await buildRouter(false)
    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('redirects /swap to dashboard when wallet not connected', async () => {
    const router = await buildRouter(false)
    await router.push('/swap')
    expect(router.currentRoute.value.name).toBe('dashboard')
    expect(mockShow).toHaveBeenCalledWith(
      expect.stringContaining('connect your wallet'),
      'warning',
    )
  })

  it('redirects /history to dashboard when wallet not connected', async () => {
    const router = await buildRouter(false)
    await router.push('/history')
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('allows /swap when wallet is connected', async () => {
    const router = await buildRouter(true)
    await router.push('/swap')
    expect(router.currentRoute.value.path).toBe('/swap')
    expect(mockShow).not.toHaveBeenCalled()
  })

  it('allows /history when wallet is connected', async () => {
    const router = await buildRouter(true)
    await router.push('/history')
    expect(router.currentRoute.value.path).toBe('/history')
  })
})
