export function DragonMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="31" fill="#071018" />
      <path fill="#2ee6c7" d="M14 40c8-16 22-24 36-22-2 10-8 16-16 20 10 2 16 8 18 16-12-2-22-8-28-16-4 6-10 10-18 12 2-6 4-10 8-10z" />
      <circle cx="38" cy="26" r="2.2" fill="#071018" />
    </svg>
  )
}

export function IconTerminal() {
  return (
    <svg viewBox="0 0 48 48" width="42" height="42" aria-hidden="true">
      <rect x="3" y="6" width="42" height="36" rx="4" fill="#1a1d21" stroke="#3dff9a" strokeWidth="2" />
      <path d="M10 16l8 8-8 8" fill="none" stroke="#3dff9a" strokeWidth="2.4" />
      <path d="M22 32h14" stroke="#3dff9a" strokeWidth="2.4" />
    </svg>
  )
}

export function IconFirefox() {
  return (
    <svg viewBox="0 0 48 48" width="42" height="42" aria-hidden="true">
      <circle cx="24" cy="24" r="18" fill="#1b3a6b" />
      <circle cx="24" cy="24" r="8" fill="#ffb14a" />
      <path d="M10 22c8-16 28-16 32 2-8 4-16 2-22-2-2 6-6 10-12 12 0-4 0-8 2-12z" fill="#ff6a3d" />
    </svg>
  )
}

export function IconFolder() {
  return (
    <svg viewBox="0 0 48 48" width="42" height="42" aria-hidden="true">
      <path d="M6 16h14l4 4h18v20H6z" fill="#e0b44a" />
      <path d="M6 20h36v20H6z" fill="#f0d27a" />
    </svg>
  )
}

export function IconNotes() {
  return (
    <svg viewBox="0 0 48 48" width="42" height="42" aria-hidden="true">
      <rect x="10" y="6" width="28" height="36" rx="3" fill="#f4efe3" />
      <path d="M16 16h16M16 22h16M16 28h10" stroke="#6b5840" strokeWidth="2" />
    </svg>
  )
}
