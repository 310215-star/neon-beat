# NEON BEAT

四軌節奏遊戲：跟著節拍敲擊落下的音符，累積分數與連擊。

## 開始遊玩

直接以瀏覽器開啟 `index.html`。按「開始遊戲」後，用鍵盤 `D F J K` 或點擊畫面底部四個軌道。音符有 PERFECT（±65ms）與 GOOD（±150ms）判定；每局約 45 秒，最高分保存在目前瀏覽器。

## 專案文件

- `knowledge/plan.md`：產品願景、狀態與開發路線圖。
- `knowledge/experience.md`：可重用的實作經驗與適用範圍。
- `knowledge/decision.md`：待決策項目與推薦方案。

## 發布

GitHub Actions workflow 位於 `.github/workflows/pages.yml`。推送到 `main` 後會把靜態網站部署到 GitHub Pages。首次使用時，需在 GitHub repository 的 **Settings → Pages → Build and deployment** 選擇 **GitHub Actions** 作為來源。
