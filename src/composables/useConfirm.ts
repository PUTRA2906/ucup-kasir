import { reactive } from 'vue'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'primary'
}

// State singleton — dirender oleh ConfirmDialogHost yang dipasang di App.vue.
// Menggantikan window.confirm() native dengan ConfirmDialog komponen yang sudah ada.
export const confirmState = reactive({
  isOpen: false,
  title: 'Konfirmasi',
  message: '',
  confirmText: 'Ya',
  cancelText: 'Batal',
  variant: 'danger' as 'danger' | 'primary',
  resolve: null as ((value: boolean) => void) | null,
})

function settle(value: boolean) {
  const resolve = confirmState.resolve
  confirmState.resolve = null
  confirmState.isOpen = false
  resolve?.(value)
}

export function useConfirm() {
  /**
   * Ganti `confirm()` bawaan browser.
   *
   *   const { confirm } = useConfirm()
   *   if (!(await confirm('Hapus item ini?'))) return
   *
   * Resolve `true` saat user menekan tombol konfirmasi, `false` saat batal/tutup.
   */
  const confirm = (options: string | ConfirmOptions): Promise<boolean> => {
    const opts: ConfirmOptions =
      typeof options === 'string' ? { message: options } : options

    // Kalau ada dialog lama yang masih menggantung, batalkan dulu.
    settle(false)

    confirmState.title = opts.title ?? 'Konfirmasi'
    confirmState.message = opts.message
    confirmState.confirmText = opts.confirmText ?? 'Ya'
    confirmState.cancelText = opts.cancelText ?? 'Batal'
    confirmState.variant = opts.variant ?? 'danger'
    confirmState.isOpen = true

    return new Promise<boolean>((resolve) => {
      confirmState.resolve = resolve
    })
  }

  return { confirm }
}

// Dipakai ConfirmDialogHost saat tombol ditekan
export function resolveConfirm(value: boolean) {
  settle(value)
}
