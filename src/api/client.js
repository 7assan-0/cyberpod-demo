import { mockApi } from './mock.js'
import { liveApi } from './live.js'

export const DEMO_MODE = !import.meta.env.VITE_API_BASE
export const api = DEMO_MODE ? mockApi : liveApi
