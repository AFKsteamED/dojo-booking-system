# 部署上線（M6）

把專案部署到 Vercel，取得公開網址，並接回 LINE LIFF。

## 步驟 1：推上 GitHub

1. 到 https://github.com/new 建立一個**空的** repo（名稱例：`dojo-booking-system`）：
   - 設 **Private**（私有）
   - **不要**勾 Add README / .gitignore / license（保持空的）
2. 建好後，GitHub 會顯示 repo 網址。回到終端機執行（把 URL 換成你的）：

   ```bash
   git remote add origin https://github.com/<你的帳號>/dojo-booking-system.git
   git branch -M main
   git push -u origin main
   ```

   > 第一次 push 會要你登入 GitHub（帳號 + 個人存取權杖 PAT，或用瀏覽器授權）。

## 步驟 2：在 Vercel import

1. 到 https://vercel.com 用 GitHub 帳號登入。
2. **Add New… → Project** → 選剛剛的 repo → Import。
3. Framework 會自動偵測為 **Next.js**，其他保持預設。

## 步驟 3：設定環境變數（重要）

在 Import 畫面（或之後 Project → Settings → Environment Variables）加入以下變數。
**值就照你本機 `.env.local` 裡的**，但有兩點不同：

| 變數 | 值 | 備註 |
|---|---|---|
| `NEXT_PUBLIC_LIFF_ID` | 同 .env.local | |
| `NEXT_PUBLIC_SUPABASE_URL` | 同 .env.local | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 同 .env.local | |
| `SUPABASE_SERVICE_ROLE_KEY` | 同 .env.local | 保密 |
| `ADMIN_PASSWORD` | **改成正式密碼** | 別再用開發用的 |
| `ADMIN_SESSION_SECRET` | 同 .env.local | |

> ⚠️ **不要**設 `NEXT_PUBLIC_LIFF_MOCK`。正式網址沒有這個變數，App 才會使用真正的 LINE 身分。
> `LINE_CHANNEL_ACCESS_TOKEN` 是 M5 通知才用，現在可先不設。

## 步驟 4：Deploy

按 **Deploy**，等 1–2 分鐘，成功後會得到網址，例如
`https://dojo-booking-system.vercel.app`。

## 步驟 5：接回 LINE LIFF

1. 回 LINE Developers Console → 你的 **LINE Login channel** → **LIFF** 分頁。
2. 編輯你的 LIFF App，把 **Endpoint URL** 改成 Vercel 網址（步驟 4 那個）。
3. 存檔。現在用手機開啟 LIFF 網址 `https://liff.line.me/<你的LIFF_ID>` 就會載入正式 App，
   並顯示你**真實的 LINE 身分**。

## 步驟 6（之後）：圖文選單

在 LINE Official Account Manager 設計圖文選單，各按鈕連到：
- 課程預約 → `https://liff.line.me/<LIFF_ID>/`
- 我的預約 → `https://liff.line.me/<LIFF_ID>/bookings`
- 剩餘堂數 → `https://liff.line.me/<LIFF_ID>/credits`
- 個人檔案 → `https://liff.line.me/<LIFF_ID>/profile`

## 更新流程

之後改程式：`git push` 後 Vercel 會自動重新部署。
後台網址：`https://<你的網址>/admin`（用 `ADMIN_PASSWORD` 登入）。
