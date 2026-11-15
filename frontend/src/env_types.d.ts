// Typing for build-time environment variables exposed through Vite (VITE_ and NEXT_PUBLIC_ prefixes).
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly NEXT_PUBLIC_API_BASE_URL?: string;
  readonly NEXT_PUBLIC_USE_MOCK?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_USE_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
