# Netlify 免费部署说明

按以下步骤将项目通过 GitHub 自动部署到 Netlify：

1. 进入 Netlify（https://app.netlify.com/）。
2. 点击 **Add new site**。
3. 选择 **Import an existing project**。
4. 选择 **GitHub** 作为 Git Provider。
5. 在仓库列表里选择 `pancunzhi1124-pixel/xiaohongshu-interview-platform`。
6. 在部署配置中将 **Production branch** 设为 `deploy-free-netlify`。
7. **Build command** 填写：`npm run build`。
8. 如果 Netlify 自动识别 Next.js，就使用自动配置（其余保持默认）。
9. 配置以下环境变量（用于 AI 模拟面试语音转写）：
   - `TRANSCRIBE_PROVIDER=tencent`
   - `TENCENT_SECRET_ID=腾讯云 SecretId`
   - `TENCENT_SECRET_KEY=腾讯云 SecretKey`
   - `TENCENT_APP_ID=腾讯云 APPID`
   - `TENCENT_ASR_REGION=ap-beijing`
   - `TENCENT_ASR_ENGINE=16k_zh`
10. 点击 **Deploy** 开始部署。
11. 部署成功后，Netlify 会提供一个免费的 `.netlify.app` 域名用于访问。

## 说明

- 本分支使用腾讯云 ASR 进行语音转写，环境变量更新后需要重新部署以生效。
- 已保留现有 Vercel 部署能力（未删除或覆盖任何 Vercel 相关配置）。
