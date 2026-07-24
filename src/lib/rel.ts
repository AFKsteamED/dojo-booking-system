// Supabase 的關聯內嵌（foreign table）在型別上常被推斷成陣列，
// 但一對一關聯實際回傳的是單一物件。這個小工具把兩種情況統一成「單一物件或 null」。
export function relOne<T>(value: unknown): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return (value[0] ?? null) as T | null;
  return value as T;
}
