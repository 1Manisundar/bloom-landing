interface ImportMetaEnv {
  /** Waitlist endpoint. Empty means the list is not open and nothing is sent. */
  readonly PUBLIC_WAITLIST_URL?: string;
  /** Server only. Supabase project URL. */
  readonly SUPABASE_URL?: string;
  /** Server only. Supabase secret (or service_role) key. Never PUBLIC_, never committed. */
  readonly SUPABASE_SECRET_KEY?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
