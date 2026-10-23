// 全系統共用的資料型別（對應 db/01_schema.sql）

export type Locale = "zh" | "en";
export type Gender = "male" | "female" | "undisclosed";
/** 緊急聯絡人與會員的關係 */
export type ContactRelation = "father" | "mother" | "spouse" | "child" | "sibling" | "friend" | "other";
/** 代訂成員與帳號持有人的關係 */
export type MemberRelation = "child" | "spouse" | "parent" | "sibling" | "friend" | "other";

export type Member = {
  id: string;
  line_user_id: string | null; // 小孩（受扶養人）沒有自己的 LINE，此欄位為 null
  line_display_name: string | null; // LINE 暱稱（例：Apple），只給教練對照用
  display_name: string; // 真實姓名（註冊時填寫，之後鎖定）
  phone: string | null;
  email: string | null;
  gender: Gender | null;
  birthday: string | null; // YYYY-MM-DD
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relation: ContactRelation | null;
  registered_at: string | null; // 完成註冊時間；非 null 代表姓名已鎖定
  locale: Locale;
  guardian_id: string | null; // 非 null = 這是某位帳號持有人代為管理的成員（家人/朋友）
  relation: MemberRelation | null; // 代訂成員與帳號持有人的關係
  created_at: string;
  updated_at: string;
};

export type Coach = {
  id: string;
  name: string;
  avatar_url: string | null;
  active: boolean;
};

export type Visibility = "public" | "private";

export type ClassSession = {
  id: string;
  template_id: string | null;
  coach_id: string | null;
  title: string;
  session_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string;
  capacity: number;
  status: "scheduled" | "cancelled";
  visibility: Visibility;
  min_attendance: number; // 最低開班人數
  cancel_reason: "manual" | "insufficient" | null;
  closed_at: string | null; // 系統已在截止時間處理過
};

export type CreditWallet = {
  id: string;
  member_id: string;
  type: "group" | "private";
  total_credits: number;
  remaining_credits: number;
  valid_from: string;
  valid_to: string;
  note: string | null;
  created_at: string;
};

export type BookingStatus = "booked" | "cancelled" | "attended" | "no_show";

export type Booking = {
  id: string;
  member_id: string;
  session_id: string;
  wallet_id: string | null;
  status: BookingStatus;
  credits_used: number;
  created_at: string;
  cancelled_at: string | null;
};

// 課表卡片用：場次 + 教練名 + 目前預約人數（衍生欄位）
export type SessionWithCounts = ClassSession & {
  coach_name: string | null;
  booked_count: number;
  remaining: number; // capacity - booked_count
  household_booked?: boolean; // 我或我代管的成員有預約這堂
};
