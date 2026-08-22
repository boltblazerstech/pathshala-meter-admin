// ---------------------------------------------------------------------------
// Minimal toast utility — renders a fixed-position notification.
// Replace with react-hot-toast or sonner if a richer lib is added later.
// ---------------------------------------------------------------------------

type ToastType = 'error' | 'success' | 'info'

const COLORS: Record<ToastType, string> = {
  error: '#ef4444',
  success: '#22c55e',
  info: '#3b82f6',
}

function show(message: string, type: ToastType, duration = 4000): void {
  const container = getOrCreateContainer()

  const el = document.createElement('div')
  el.style.cssText = `
    background:${COLORS[type]};
    color:#fff;
    padding:10px 16px;
    border-radius:6px;
    margin-bottom:8px;
    font-family:sans-serif;
    font-size:14px;
    box-shadow:0 2px 8px rgba(0,0,0,.2);
    transition:opacity .3s;
    max-width:340px;
    word-break:break-word;
  `
  el.textContent = message
  container.appendChild(el)

  setTimeout(() => {
    el.style.opacity = '0'
    setTimeout(() => el.remove(), 300)
  }, duration)
}

function getOrCreateContainer(): HTMLElement {
  const id = 'pm-toast-container'
  let container = document.getElementById(id)
  if (!container) {
    container = document.createElement('div')
    container.id = id
    container.style.cssText = `
      position:fixed;
      top:16px;
      right:16px;
      z-index:9999;
      display:flex;
      flex-direction:column;
      align-items:flex-end;
    `
    document.body.appendChild(container)
  }
  return container
}

export const toast = {
  error: (msg: string, duration?: number) => show(msg, 'error', duration),
  success: (msg: string, duration?: number) => show(msg, 'success', duration),
  info: (msg: string, duration?: number) => show(msg, 'info', duration),
}
