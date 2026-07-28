// 課程名單顯示給「其他學員」時，把姓名中間字以全形Ｏ遮罩，保護隱私。
// 規則：
//   王小明   → 王Ｏ明   （保留首尾，中間全部Ｏ）
//   歐陽小明 → 歐ＯＯ明
//   王威     → 王Ｏ     （兩字：保留姓氏，名字改Ｏ）
//   王       → 王       （單字不遮）
// 後台（教練）看到的仍是完整姓名，只有會員端的名單才遮罩。
export function maskName(name: string): string {
  const s = (name ?? "").trim();
  const chars = Array.from(s); // 以字元計算，避免破壞多位元字元
  const n = chars.length;
  if (n <= 1) return s || "會員";
  if (n === 2) return `${chars[0]}Ｏ`;
  return `${chars[0]}${"Ｏ".repeat(n - 2)}${chars[n - 1]}`;
}
