import { createApp, h } from 'vue'
import Toast from '@/components/ui/Toast.vue'

interface ToastOptions {
  title: string
  message: string
  variant?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

const toasts: any[] = []

export function useToast() {
  const show = (options: ToastOptions) => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const app = createApp({
      render() {
        return h(Toast, {
          ...options,
          variant: options.variant || 'info',
          onClose: () => {
            app.unmount()
            document.body.removeChild(container)
            const index = toasts.indexOf(app)
            if (index > -1) {
              toasts.splice(index, 1)
            }
          }
        })
      }
    })

    app.mount(container)
    toasts.push(app)

    return app
  }

  const success = (title: string, message: string, duration = 5000) => {
    return show({ title, message, variant: 'success', duration })
  }

  const error = (title: string, message: string, duration = 5000) => {
    return show({ title, message, variant: 'error', duration })
  }

  const warning = (title: string, message: string, duration = 5000) => {
    return show({ title, message, variant: 'warning', duration })
  }

  const info = (title: string, message: string, duration = 5000) => {
    return show({ title, message, variant: 'info', duration })
  }

  return {
    show,
    success,
    error,
    warning,
    info
  }
}
