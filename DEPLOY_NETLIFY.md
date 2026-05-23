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

## ffmpeg 转码说明

- 语音转写接口会先将前端上传的 `webm/opus` 录音写入 Netlify Serverless 的 `/tmp`，再调用 ffmpeg 转换为 `16k/单声道/wav`，最后发送给腾讯云 SentenceRecognition。
- 若 Netlify 打包阶段出现 `ffmpeg-static` 相关问题，可在 Netlify 环境变量中设置 `FFMPEG_PATH=/var/task/node_modules/ffmpeg-static/ffmpeg`（或你实际的可执行路径），并重新部署。

## ffmpeg-static / Netlify 配置变更后的重部署要求

如果你修改了 `ffmpeg-static` 依赖版本、`netlify.toml` 的 `[functions]` 配置（例如 `included_files` 或 `external_node_modules`），不要只点普通 Deploy。

必须在 Netlify 执行：

- **Deploys**
- **Trigger deploy**
- **Clear cache and deploy site**

这样才能确保函数打包缓存被清空，`ffmpeg-static` 二进制被重新正确打入运行时。
