interface ImportMetaEnv {
  /** Waitlist endpoint. Empty means the list is not open and nothing is sent. */
  readonly PUBLIC_WAITLIST_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
