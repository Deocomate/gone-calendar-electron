/// <reference types="vite/client" />
import type { GoneAPI } from '@shared/ipc-contract'

declare global {
  interface Window {
    gone?: GoneAPI
  }
}
