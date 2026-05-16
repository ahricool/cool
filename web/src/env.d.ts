/// <reference types="vite/client" />

declare global {
  interface Window {
    __COOL_CMS__: {
      apiBase: string;
    };
  }
}
