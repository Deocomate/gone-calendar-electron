import { GoneAPI } from '@shared/ipc-contract'

declare global {
  interface Window {
    gone: GoneAPI
  }
}
