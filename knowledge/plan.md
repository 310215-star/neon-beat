# NEON BEAT — 願景與路線圖

## 願景

做一款打開就能玩的輕量節奏遊戲：音符沿四條軌道落下，玩家在底線附近點擊相同軌道或敲擊對應按鍵得分。遊戲要有清晰的節拍回饋、適合桌機與手機操作，並能透過 GitHub Pages 分享。

## 目前狀態

- 原型已完成，可直接以瀏覽器開啟 `index.html` 遊玩。
- 核心循環包括四軌音符、112 BPM 節拍提示、鍵盤與觸控輸入、判定視窗、分數、連擊、失誤、準確率、最高分與結算畫面。
- GitHub 公開 repository `310215-star/neon-beat` 已建立，本機 `main` 已推送；GitHub Actions workflow 成功部署至 Pages，線上首頁已回應 HTTP 200：<https://310215-star.github.io/neon-beat/>。
- HTML 結構、JavaScript 語法、HTTP 200 與 `npm test` 核心流程 smoke check 已通過；headless Chrome 桌機預覽已檢視並移除頁尾孤立字串，手機版、觸控與實機音訊仍待確認。

## 已完成

- [x] 將最初想法整理為可玩的四軌節奏遊戲。
- [x] 建立桌機與手機版遊戲介面，支援 D/F/J/K、觸控、音效開關與重玩。
- [x] 加入 PERFECT/GOOD 判定、分數、Combo、Miss、準確率、進度與本機最高分。
- [x] 建立專案說明及 GitHub Pages 部署 workflow。
- [x] 記錄第一階段經驗與可複用範圍。

## 剩餘項目

- [x] 驗證 HTML/JavaScript 結構、本機 HTTP 載入，以及開始、112 BPM 節拍提示、PERFECT、MISS、結算的 `npm test` smoke check。
- [x] 檢視 headless Chrome 桌機預覽，並移除 HTML 後方誤顯示的孤立文字。
- [ ] 在桌機與手機瀏覽器實際試玩，檢查音符位置、鍵盤/觸控判定、音訊與手機版版面，修正體驗問題。
- [x] 建立公開 GitHub repository `310215-star/neon-beat`，設定 `main` 為主要分支並接上本機 `origin`。
- [x] 完成 Git Credential Manager 的 GitHub 登入並推送本機 `main`。
- [x] 設定 Pages 使用 GitHub Actions，確認 workflow 成功部署且首頁回應 HTTP 200；網址為 <https://310215-star.github.io/neon-beat/>。
- [ ] 根據試玩調整音符移動、節奏與回饋，更新經驗文件。
## 路線圖與目前狀態

1. **MVP 遊戲與專案骨架 — 完成**：完成靜態遊戲、README、知識文件與 Pages workflow，通過 JavaScript 語法及 HTML 結構檢查。
2. **瀏覽器試玩與體驗修整 — 進行中**：桌機 headless 預覽已檢視並修正孤立文字，`npm test` 節拍提示與遊戲邏輯 smoke check 通過；待確認手機顯示、互動輸入與真實音訊。
3. **GitHub 建置與公開發布 — 完成**：公開 repository 已建立並保留本機 Git 歷史；Pages 已設定為 Actions，部署 workflow 成功，公開首頁回應 HTTP 200。
4. **發布後迭代 — 待開始**：先完成桌機/手機實際試玩，再依據回饋調整手感、判定與可玩性。

## 迭代規則

每一階段完成後，將可重用做法與適用範圍寫入 `knowledge/experience.md`，更新本文件狀態與 check list；不確定但可合理決定的事項採推薦方案，無法自行決定時記入 `knowledge/decision.md`，並繼續處理不受影響的工作。
