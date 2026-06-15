import { inject, provide, reactive, type InjectionKey } from 'vue'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

interface Toast {
  id: number
  message: string
  type: ToastType
}

export interface ToastAPI {
  toasts: Toast[]
  show: (message: string, type?: ToastType, duration?: number) => void
  dismiss: (id: number) => void
}

export const ToastKey: InjectionKey<ToastAPI> = Symbol('toast')

// Module-level singleton — shared state and fallback for non-component code
const _toasts = reactive<Toast[]>([])
let _nextId = 0

function _show(message: string, type: ToastType = 'info', duration = 4000): void {
  const id = _nextId++
  _toasts.push({ id, message, type })
  setTimeout(() => {
    const idx = _toasts.findIndex((t) => t.id === id)
    if (idx !== -1) _toasts.splice(idx, 1)
  }, duration)
}

function _dismiss(id: number): void {
  const idx = _toasts.findIndex((t) => t.id === id)
  if (idx !== -1) _toasts.splice(idx, 1)
}

const _api: ToastAPI = { toasts: _toasts, show: _show, dismiss: _dismiss }

/** Call once in the root component setup to register the toast API with Vue's DI. */
export function provideToast(): void {
  provide(ToastKey, _api)
}

/** Use inside component setup — injects the provided API, falls back to the singleton. */
export function useToast(): ToastAPI {
  return inject(ToastKey, _api)
}

/** Direct access for composable functions that run outside a component setup context. */
export const showToast = _show

/**
 * Thrown by composable error handlers after they have already displayed a toast,
 * so callers can skip their own generic error display.
 */
export class ToastHandledError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ToastHandledError'
  }
}
