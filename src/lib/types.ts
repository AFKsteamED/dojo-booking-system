// 全系統共用的資料型別（對應 db/01_schema.sql）

export type Member = {
  id: string;
  line_user_id: string;
  display_name: string;
  phone: string | null;
  email: string | null;
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
};
