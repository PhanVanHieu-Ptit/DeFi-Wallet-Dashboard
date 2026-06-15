import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useToast, showToast, ToastHandledError } from '@/composables/useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useToast().toasts.splice(0)
  })

  afterEach(() => {
    vi.useRealTimers()
    useToast().toasts.splice(0)
  })

  it('showToast adds a toast with id, message, and type', () => {
    const { toasts } = useToast()
    showToast('hello', 'info')
    expect(toasts).toHaveLength(1)
    expect(toasts[0].message).toBe('hello')
    expect(toasts[0].type).toBe('info')
    expect(toasts[0]).toHaveProperty('id')
  })

  it('each toast gets a unique incrementing id', () => {
    showToast('a', 'info')
    showToast('b', 'info')
    showToast('c', 'info')
    const { toasts } = useToast()
    expect(toasts[1].id).toBeGreaterThan(toasts[0].id)
    expect(toasts[2].id).toBeGreaterThan(toasts[1].id)
  })

  it('auto-dismisses after 4000ms', () => {
    const { toasts } = useToast()
    showToast('auto', 'info')
    expect(toasts).toHaveLength(1)
    vi.advanceTimersByTime(3999)
    expect(toasts).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toasts).toHaveLength(0)
  })

  it('dismiss removes the toast immediately', () => {
    const { toasts, dismiss } = useToast()
    showToast('msg', 'success')
    const id = toasts[0].id
    dismiss(id)
    expect(toasts).toHaveLength(0)
  })

  it('dismiss with unknown id is a no-op', () => {
    const { toasts, dismiss } = useToast()
    showToast('msg', 'info')
    dismiss(99999)
    expect(toasts).toHaveLength(1)
  })

  it('supports all four toast types', () => {
    const { toasts } = useToast()
    showToast('a', 'info')
    showToast('b', 'success')
    showToast('c', 'warning')
    showToast('d', 'error')
    const types = toasts.map(t => t.type)
    expect(types).toContain('info')
    expect(types).toContain('success')
    expect(types).toContain('warning')
    expect(types).toContain('error')
  })

  it('default type is info', () => {
    const { toasts } = useToast()
    showToast('no type')
    expect(toasts[0].type).toBe('info')
  })
})

describe('ToastHandledError', () => {
  it('is an instance of Error', () => {
    const err = new ToastHandledError('oops')
    expect(err).toBeInstanceOf(Error)
  })

  it('has name ToastHandledError', () => {
    const err = new ToastHandledError('oops')
    expect(err.name).toBe('ToastHandledError')
  })

  it('preserves the message', () => {
    const err = new ToastHandledError('something went wrong')
    expect(err.message).toBe('something went wrong')
  })
})
