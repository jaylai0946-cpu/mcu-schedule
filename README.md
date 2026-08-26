# 國企一甲課表 📅

銘傳大學國際企業學系跨境電商經營組一年級的個人課表 + 作業考試待辦。
一個人用，沒有登入、沒有後端、沒有雲端同步 —— 資料只存在你自己的瀏覽器裡。

- 手機優先，可以「加入主畫面」當成 App 用，離線也開得起來
- 打開就看到「接下來要幹嘛」，快到期的排最上面
- 課表可以改，改的時候會擋下衝堂
- 可以把課程和待辦匯出成 `.ics`，丟進 Google 日曆或 iOS 行事曆

---

## 開發

需要 Node 22 以上。

```bash
pnpm install
pnpm dev
```

開發伺服器會在 <http://localhost:5173/mcu-schedule/>（注意路徑，`base` 設成 `/mcu-schedule/`）。

| 指令 | 做什麼 |
|---|---|
| `pnpm dev` | 開發伺服器 |
| `pnpm test` | 跑一次 Vitest |
| `pnpm test:watch` | 監看模式 |
| `pnpm typecheck` | 只跑 TypeScript 檢查 |
| `pnpm build` | 型別檢查 + 產生 `dist/` |
| `pnpm preview` | 預覽 build 出來的結果（要測 PWA 就用這個，`dev` 不會啟用 service worker） |

## 部署到 GitHub Pages 🚀

1. 在 GitHub 開一個名叫 **`mcu-schedule`** 的 repo（名字要一致，見下方注意事項）
2. 推上去：

   ```bash
   git remote add origin https://github.com/<你的帳號>/mcu-schedule.git
   git branch -M main
   git push -u origin main
   ```

3. 到 repo 的 **Settings → Pages**，把 **Source** 改成 **GitHub Actions**
4. 之後每次 push 到 `main`，`.github/workflows/deploy.yml` 會自動跑測試、build、發布

網址會是 `https://<你的帳號>.github.io/mcu-schedule/`。

> ⚠️ **repo 名字必須和 `vite.config.ts` 裡的 `BASE` 一致。**
> 改用別的名字的話，`BASE` 要一起改成 `/<新名字>/`，否則上線會是一片空白。

## 裝到手機 📱

1. 手機瀏覽器打開上面的網址
2. **iPhone**：Safari 下方分享鍵 → 加入主畫面
   **Android**：Chrome 右上選單 → 安裝應用程式／加到主畫面
3. 從主畫面的圖示開啟。裝好之後沒網路也打得開

## 提醒功能的實際能力 ⚠️

這部分請照實看待，不要以為設定好就一定會響：

- 通知**只有在 App 開著的時候**才會排程與觸發。關掉分頁就不會響
- 這個專案**沒有**背景推播（不接任何後端或第三方推播服務）。
  `Periodic Background Sync` 支援度很有限，偵測不到就直接降級，設定頁會明說
- **iOS 必須先「加入主畫面」**，從主畫面圖示開啟，才發得出通知。
  沒裝就開通知是不會有效果的，設定頁會偵測並提示

**所以真正靠得住的提醒方式是行事曆匯出。** 設定頁的「匯出到系統行事曆」把 `.ics`
下載下來，在手機上點開選「加入行事曆」，提醒交給系統行事曆處理。

## 行事曆匯出

- **匯出全部**：課程（每週重複到學期結束）＋ 待辦（單次事件，附提醒）
- **只匯出待辦**：不想讓課表塞滿行事曆的話用這個
- 時區固定 `Asia/Taipei`，輸出合法的 `VTIMEZONE`
- 課程用 `RRULE:FREQ=WEEKLY;BYDAY=…;UNTIL=<學期最後一天>`，
  一段連續節次是一個事件（開始 = 第一節開始，結束 = 最後一節結束）
- 待辦帶 `VALARM`，依「提前幾天提醒」設定；沒填時間的當成全天事件

> 📌 **學期起訖目前是暫定值**（`2026-09-14` 到 `2027-01-17`），**還沒對過銘傳行事曆**。
> 匯出前請到設定頁改成正確日期，否則課程會重複到錯的週次。UI 上會一直提示到你改掉為止。

## 資料存在哪 💾

`localStorage`，key 是 `mcu-schedule.state.v1`。

- 每次寫入前都會先驗證結構，驗不過就**不覆蓋**舊資料，畫面上會顯示原因
- 讀取時如果資料壞掉，原始內容會搬到 `mcu-schedule.state.v1.corrupt` 留著備查，
  畫面用預設課表撐住而不是崩潰
- `version` 欄位用來做 schema migration，改結構時在 `src/lib/storage.ts` 的
  `migrations` 補一個 `N -> N+1` 的函式，舊資料就會自動升級

**清除瀏覽器資料會把東西清光。** 換手機或重灌前，設定頁「匯出 JSON 備份」存一份。

## 專案結構

```
src/
  types.ts              資料型別
  constants.ts          節次時間、顯示順序、色盤、學期暫定值
  seed.ts               種子資料（真實課表）
  state.ts              useAppState：狀態與所有異動動作
  useReminders.ts       開著時的通知排程
  useTheme.ts           淺色／深色／跟隨系統
  sw.ts                 service worker（precache、字體快取、通知點擊）
  lib/
    dates.ts            台北時區的今天、倒數天數、節次換算
    schedule.ts         課表版面計算、課程配色
    conflicts.ts        衝堂偵測
    ics.ts              .ics 產生器
    storage.ts          localStorage 讀寫、migration、JSON 備份
    validate.ts         結構驗證
    notifications.ts    通知能力偵測與當日提醒挑選
  components/           畫面
```

## 沒有做的事

照規格刻意不做：登入、帳號、雲端同步、AI 功能、UI 元件庫、後端推播。

另外**停課／補課／調整上課日**這一版沒做。遇到補課請用「新增待辦」記一筆活動，
課表本身維持固定週期。
