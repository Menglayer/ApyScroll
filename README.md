# 收益与复利曲线计算器

一个可直接部署到 GitHub Pages 的单页面项目，支持输入本金、是否锁仓、APR、APY，输出收益、最终资产、复利曲线，并可实时查看每秒资金跳动。

## 功能

- 输入：本金、是否锁仓、APR、APY（可切换按 APR 或 APY 作为计算基准）
- 补充参数：周期（年）
- 结果：收益、最终资产、实时资产（每秒更新）
- 支持多个配置方案并行对比
- 复利曲线图（多方案同图展示）
- 本地持久化（刷新页面不丢配置）

## 本地运行

直接双击 `index.html` 即可打开，或使用任意静态服务器。

## 部署到 GitHub Pages

1. 新建 GitHub 仓库并上传本项目文件。
2. 默认分支命名为 `main`。
3. 进入仓库 `Settings -> Pages`，将 Source 设置为 **GitHub Actions**。
4. push 到 `main` 后，工作流 `.github/workflows/deploy-pages.yml` 会自动部署。

部署完成后可在 Actions 日志中的 `page_url` 访问页面。

## 计算说明

- APR 复利终值：`final = principal * (1 + apr/n)^(n*t)`
- APY 转 APR：`apr = n * ((1 + apy)^(1/n) - 1)`
- 实时资产：按复利公式随时间增长，每秒刷新一次（为了可见跳动，默认 1 秒模拟 1 天进度）
