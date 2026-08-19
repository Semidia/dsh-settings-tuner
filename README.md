# dsh-settings-tuner

DeepSeek Harness 系统参数调整插件：在设置页提供超时、并行、重试、模型、Web 搜索、权限等参数的调整 UI，全中文界面。

## 功能

- **设置页「系统参数」**，分组调整：
  - **代理循环**：maxParallelToolCalls（最大并行工具数）
  - **命令行**：timeoutMs / maxTimeoutMs / maxOutputBytes（命令超时与输出限制）
  - **DeepSeek 模型**：maxTokens / reasoningEffort / thinking / streamIdleTimeoutMs / retryPolicy（重试次数与退避）
  - **第三方渠道重试（pi-ai）**：按渠道（yunzhou / jiyuanlvdong / dsfuli 等 llm-pi-ai providers）独立调整 retryPolicy —— 请求重试次数、重试初始延迟、重试最大延迟、重试抖动比率，**立即生效**（settings 热更新，无需重启）
  - **智能路由重试（smart-route）**：虚拟 provider 整体 retryPolicy（链上多渠道失败后重试整次请求），**立即生效**
  - **全局重试（批量应用）**：一次性把重试次数/初始延迟/最大延迟/抖动应用到 DeepSeek 官方 + 全部 pi-ai 渠道 + 智能路由，免去逐个调整
  - **默认模型**：provider / model / reasoningEffort
  - **Web 搜索**：maxTokens / maxUses
  - **权限预设**：defaultPreset
  - **智能体预设**：default
- **未暴露参数**（写入 profile 配置，需重启）：Web 搜索/抓取超时、文件搜索超时、glob/grep 结果数
- **UI**：中文标签、覆盖标记（●）、立即生效/需重启徽标、搜索过滤、分组折叠、应用/恢复默认按钮、前后端双重校验。

## 架构

- **Host 半区**（`lib/index.js`）：提供 RPC `config/read` / `config/write`，编辑 profile 的 `cordis.patch.yml` 中未暴露到 settings 系统的参数。**行级精确匹配** YAML（只匹配缩进 0 的顶层条目，跳过注释/insert 块/嵌套），写入后自动运行 `dsh --profile web --dump-config` 验证，失败从备份回滚。路径动态解析：`DSH_HOME` 环境变量定位 profile，`process.cwd()`（启动器以 harness 根为工作目录）定位部署根，可用 `DSH_HARNESS_ROOT` / `DSH_PROFILE_DIR` 覆盖。
- **Client 半区**（`lib/client.js`）：设置页 UI。已暴露参数通过 `connection.api.settings` 直接读写（`installSettingsSection` 注册的命名空间改后即时生效）；未暴露参数通过 Host RPC 写入配置。

## 安装

```powershell
# 1. 建 junction
New-Item -ItemType Junction -Path "$env:USERPROFILE\.dsh\profiles\web\node_modules\dsh-settings-tuner" -Target "本插件源码路径"

# 2. 在 cordis.patch.yml 加 insert 条目
# - insert:
#     - id: dsh-settings-tuner
#       name: 'dsh-settings-tuner'

# 3. 重启 dsh web
```

## 开发

```bash
# 语法检查
node --check lib/index.js
node --check lib/client.js

# 行级 YAML 编辑逻辑测试（18 项）
node test-line-yaml.cjs

# 配置写入逻辑测试（9 项）
node test-write-config.cjs
```

## 许可

MIT