# 精灵图预览 · 4×4

上传最多 6 张不同视角的 **4×4** 精灵图，点左侧「播放」后，右侧 2×2 四个窗口分别循环该图的四行序列帧（每行 4 帧，**4 fps**）。

图片仅在浏览器本地处理，不会上传服务器。

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

产物在 `dist/`，可直接部署到 Vercel（Framework Preset: Vite，或 Other + `npm run build` / `dist`）。

## 使用

1. 左侧「视角 1–6」上传 PNG / JPG / WebP
2. 点对应「播放」→ 右侧四格分别播第 1–4 行
3. 再点「暂停」停止；点另一个视角会切换到那张图
