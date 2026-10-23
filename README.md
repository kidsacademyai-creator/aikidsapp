# AI 想像工房 — 部署步驟（Bolt + Supabase）

1. 喺 Bolt 開新 Vite 專案，將呢啲檔案放入去（或匯入 zip），連接 Supabase。
2. Supabase → SQL Editor，執行 `supabase/migrations/001_init.sql`。
3. 部署 Edge Function `ai`（`supabase/functions/ai/index.ts`），並設定 secret：`ANTHROPIC_API_KEY`（可選 `CLAUDE_MODEL`）。
   - Bolt 可以叫佢代你部署；或用 CLI：`supabase functions deploy ai` + `supabase secrets set ANTHROPIC_API_KEY=...`
4. `.env` 填 `VITE_SUPABASE_URL` 同 `VITE_SUPABASE_ANON_KEY`（參考 `.env.example`）。
5. 註冊一個帳戶，然後執行 SQL 將自己設為管理員：
   `insert into admins select id from auth.users where email='你的電郵';`
   之後「面試」分頁底部會出現題庫管理。
6. 語音輸入要用 Chrome／Safari，並喺 https 網址直接開（Bolt 預覽視窗可能擋住麥克風，請用部署後網址測試）。
