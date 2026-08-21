# 太极浑仪 Taiji Armillary

用 Three.js 在浏览器里复刻青铜浑仪 / 罗盘：中心太极、多层卦象刻盘、倾斜的浑仪环。拖拽旋转，滚轮缩放，空格暂停。

灵感来自古代浑仪与风水罗盘，几何和铭文都是程序生成，不依赖外部 3D 模型。

## 版本

- [`v1.0.0`](https://github.com/makerjackie/taiji-armillary/releases/tag/v1.0.0) 青铜器物造型
- [`v2.0.0`](https://github.com/makerjackie/taiji-armillary/releases/tag/v2.0.0) 罗盘各层独立旋转

## 运行

```bash
npm install
npm run dev
```

构建：

```bash
npm run build
npm run preview
```

## 技术

- Vite + TypeScript
- Three.js（PBR 青铜材质、Canvas 铭文贴图、Bloom）
