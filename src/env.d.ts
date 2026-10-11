/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where the waitlist form posts. Empty or missing means the list is not open yet. */
  readonly VITE_WAITLIST_URL?: string;
}
