import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ToastContainer from '@/components/ToastContainer.vue'
import { useToast, showToast } from '@/composables/useToast'

function clearToasts() {
  const api = useToast()
  while (api.toasts.length) api.dismiss(api.toasts[0].id)
}

describe('ToastContainer', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    vi.useFakeTimers()
    clearToasts()
  })

  afterEach(() => {
    wrapper?.unmount()
    clearToasts()
    vi.useRealTimers()
  })

  // Stub Teleport so content renders inline inside wrapper (makes wrapper queries work)
  function mountContainer() {
    wrapper = mount(ToastContainer, {
      global: { stubs: { Teleport: true, TransitionGroup: false } },
    })
    return wrapper
  }

  it('renders nothing when toasts array is empty', () => {
    mountContainer()
    expect(wrapper.text()).toBe('')
  })

  it('renders one toast with correct message', async () => {
    showToast('Hello world', 'info')
    mountContainer()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Hello world')
  })

  it('info toast has correct icon and bg class', async () => {
    showToast('info msg', 'info')
    mountContainer()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('ℹ')
    expect(wrapper.find('[class*="bg-blue-600"]').exists()).toBe(true)
  })

  it('success toast has correct icon and bg class', async () => {
    showToast('ok', 'success')
    mountContainer()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('✓')
    expect(wrapper.find('[class*="bg-emerald-600"]').exists()).toBe(true)
  })

  it('warning toast has correct icon and bg class', async () => {
    showToast('warn', 'warning')
    mountContainer()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('⚠')
    expect(wrapper.find('[class*="bg-amber-500"]').exists()).toBe(true)
  })

  it('error toast has correct bg class', async () => {
    showToast('err', 'error')
    mountContainer()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[class*="bg-red-600"]').exists()).toBe(true)
  })

  it('dismiss button exists and dismissing a toast updates the UI', async () => {
    showToast('removable', 'info')
    // Stub both Teleport and TransitionGroup — without TransitionGroup stub the leave
    // transition holds the element in DOM until transitionend, which never fires in jsdom
    const w = mount(ToastContainer, {
      global: { stubs: { Teleport: true, TransitionGroup: true } },
    })
    await w.vm.$nextTick()

    expect(w.findAll('button').some(b => b.text().trim() === '✕')).toBe(true)

    const api = useToast()
    api.dismiss(api.toasts[0].id)
    await w.vm.$nextTick()

    expect(w.text()).not.toContain('removable')
    w.unmount()
  })

  it('renders two toasts when two are in the array', async () => {
    showToast('first', 'info')
    showToast('second', 'success')
    mountContainer()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('first')
    expect(wrapper.text()).toContain('second')
  })
})
