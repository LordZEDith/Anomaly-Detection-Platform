/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PLATFORM_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 