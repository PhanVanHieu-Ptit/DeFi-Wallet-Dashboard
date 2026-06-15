/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ALCHEMY_KEY: string
  readonly VITE_COINGECKO_URL: string
  readonly VITE_1INCH_API_URL: string
  readonly VITE_1INCH_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
