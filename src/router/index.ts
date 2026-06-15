import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import { useWalletStore } from '@/stores/wallet'
import { useToast } from '@/composables/useToast'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
    },
    {
      path: '/swap',
      name: 'swap',
      component: () => import('@/views/SwapView.vue'),
      meta: { requiresWallet: true },
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('@/views/HistoryView.vue'),
      meta: { requiresWallet: true },
    },
  ],
})

router.beforeEach((to) => {
  if (!to.meta.requiresWallet) return true

  const wallet = useWalletStore()
  if (!wallet.isConnected) {
    const { show } = useToast()
    show('Please connect your wallet to access this page.', 'warning')
    return { name: 'dashboard' }
  }
})

export default router
