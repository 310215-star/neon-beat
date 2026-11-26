# 實作經驗

## 單檔靜態遊戲適合先驗證核心循環

- **經驗**：遊戲第一版用原生 HTML、CSS 與 JavaScript，無框架與套件安裝需求；直接開啟 `index.html` 即可遊玩，GitHub Pages 也可直接提供。
- **適用範圍**：小型互動原型、單頁遊戲、需求尚在探索且希望先快速試玩的作品。
- **提醒**：遊戲複雜度、多人協作或測試需求上升時，再拆分模組並引入建置工具。

## 節奏判定以時間戳為中心

- **經驗**：每個音符使用預定命中時間；輸入時以目前時間與命中時間的差判定品質，而不是只看音符的視覺位置。視覺動畫用同一個 elapsed 時間推算位置，減少幀率差異造成的判定漂移。
- **適用範圍**：節奏遊戲、動畫與輸入需對齊的即時互動、需要判斷時間誤差的 UI。
- **提醒**：若加入真正音樂播放，應以 Web Audio 的音樂時鐘同步譜面，並量測裝置輸入延遲。

## 觸控與鍵盤共享同一操作入口

- **經驗**：所有輸入都轉為 `press(lane)`，讓鍵盤與觸控走同一判定與回饋程式；行動裝置按鈕加上 `touch-action: manipulation` 並以 pointerdown 回應。
- **適用範圍**：同一互動需支援滑鼠、觸控與鍵盤的網頁遊戲。
- **提醒**：部署前仍需在實體手機確認瀏覽器的觸控、音訊啟動限制及版面。

## GitHub Pages 靜態部署

- **經驗**：使用官方 `actions/deploy-pages` workflow，透過 upload-pages-artifact 提交網站內容，不需額外建置即可部署根目錄靜態檔。
- **適用範圍**：純 HTML/CSS/JS 網站與作品展示。
- **提醒**：repository 首次發布需在 Pages 設定中選擇 GitHub Actions；GitHub Actions 的 Pages 權限需允許 workflow 寫入。

## 用隔離時鐘做遊戲邏輯 smoke check

- **經驗**：對單檔遊戲，可在 Node `vm` 中載入實際 `<script>`，用最小假 DOM、可控的 `performance.now()` 與 `requestAnimationFrame`，快速驗證開始遊戲、PERFECT 得分、MISS、結算等核心流程，不必先搭完整瀏覽器測試架構。本專案將 smoke check 固化在 `tests/smoke.cjs`，用 `npm test` 執行，沒有額外套件依賴。
- **適用範圍**：依賴少、核心流程以 DOM 事件和時間為主的單頁遊戲原型；適合快速回歸邏輯。
- **限制**：假 DOM 不會驗證真實 CSS 版面、滑鼠/觸控事件差異、瀏覽器音訊策略或手機可用性。重要互動仍需瀏覽器與實機檢查。

## 節拍器與譜面共用 BPM 時基

- **經驗**：用同一個 `beat = 60000 / bpm` 推導節拍器與音符 hit time，再提供固定拍數的 count-in，能讓可聽節拍和視覺譜面保持同一時間格線。
- **適用範圍**：節奏遊戲原型、節拍練習工具，以及需要讓視覺提示跟隨固定速度的互動作品。
- **提醒**：以 `requestAnimationFrame` 驅動的原型適合粗略節拍提示；若要跟完整音樂精準同步，需改由 Web Audio 時鐘排程音符並量測延遲。

## 用瀏覽器渲染檢查靜態頁面的孤立文字

- **經驗**：HTML parser 與 JavaScript 語法檢查不會指出頁尾多出的純文字；用 headless Chrome 直接載入頁面並查看渲染結果，能找出這類視覺瑕疵。本次抓到 HTML 結束標籤後的字面 `\\n`，移除後再確認原始頁面結尾。
- **適用範圍**：單頁靜態網站、作品集和使用原生 HTML/CSS 的小型應用；適合補足語法檢查以外的視覺檢查。
- **限制**：桌機 headless 渲染不涵蓋行動版 viewport、真實觸控與音訊互動，仍應另做對應檢查。

## 部署前執行快速 smoke check

- **經驗**：把無依賴的 `npm test` 放在 Pages 發布 workflow 的部署步驟之前，可在遠端每次部署時先驗證核心流程，讓同一條檢查同時服務本機迭代與發布閘門。
- **適用範圍**：有快速、穩定 smoke check 的靜態網站；檢查耗時應足夠短，不拖慢部署回饋。
- **提醒**：假 DOM 的測試不會取代瀏覽器版面、觸控與真實音訊檢查。

## GitHub API 身分與本機 Git 認證分開處理

- **經驗**：GitHub 整合能建立或讀取 repository，不代表本機 Git Credential Manager 已取得 push 權限。本機推送會另行啟動 `Connect to GitHub` 登入流程；需完成該流程後才能驗證 remote push 與 Actions 部署。
- **適用範圍**：以整合工具管理 GitHub、同時透過本機 Git 推送的開發工作流程。
- **提醒**：建立 repository 後即刻檢查 `git push` 認證狀態，將 repository 已建立與程式碼已推送分別記錄，避免把兩者誤當成同一步。

## Pages 首次部署前先啟用網站來源

- **經驗**：workflow 檔案就緒且 smoke tests 通過，不代表 Pages site 已經建立。`actions/configure-pages` 預設只讀取現有 Pages 設定；若 Pages 未啟用，該步會回報 site not found。先把 repository Pages source 設為 GitHub Actions，再重跑 workflow，即可完成發布。本專案重跑成功後用首頁 HTTP 200 與頁面標題驗證上線。
- **適用範圍**：新建 GitHub repository 後首次以 GitHub Actions 發布 Pages 的專案。
- **提醒**：不要把 Actions workflow 失敗直接當成程式測試失敗；檢查 job step 和原始錯誤，分清是程式、workflow 語法或 repository Pages 設定。

## 背景分頁期間凍結互動遊戲時鐘

- **經驗**：以 `visibilitychange` 偵測頁面進入背景時暫停動畫迴圈；回到前景時，將暫停時間加回遊戲起始時間，讓譜面與判定時鐘從原進度繼續，避免瀏覽器節流後一次補算大量失誤。使用可控時鐘的 smoke check 驗證長時間隱藏後仍能接續命中。
- **適用範圍**：以 `performance.now()` 和 `requestAnimationFrame` 驅動、切換分頁或切換 App 後仍應保留進度的即時互動頁面與遊戲。
- **提醒**：`visibilitychange` 可驗證頁面前景/背景切換，但不能代替實機確認觸控、音訊中斷與裝置輸入延遲；恢復播放聲音時仍需遵守瀏覽器的音訊啟動規則。
