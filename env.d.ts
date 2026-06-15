/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ALCHEMY_KEY: string
  readonly VITE_COINGECKO_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
