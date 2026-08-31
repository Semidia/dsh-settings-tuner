// dsh-settings-tuner — Host 半区
// 提供 RPC 方法读取/写入 profile 配置中「未暴露到 settings 系统」的参数
// 已暴露到 settings 系统的参数由 Client 半区直接通过 settings API 读写。
//
// YAML 编辑采用「行级精确匹配」：
// - 只匹配缩进为 0 的顶层 `- id: <插件>` 条目（跳过注释、insert 块、嵌套条目）
// - 在目标条目内按缩进定位 `config:` 段（缩进 2）及其子键（缩进 4）
// - 避免正则全文匹配误伤注释里的 `id: xxx` 字样

import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'

const name = 'dsh-settings-tuner'
const inject = ['connection']
const RPC_CHANNEL = '/dsh-settings-tuner'

// ── 动态路径解析（避免硬编码，支持环境变量覆盖）──────────────────────────
// DSH_HOME: profile 家目录（启动器/环境注入）
// DSH_HARNESS_ROOT: harness 部署根（可显式覆盖；默认用进程 cwd——启动器以
//   -WorkingDirectory $root 启动 web，所以运行中的 cwd 就是 harness 根）
// DSH_PROFILE_DIR: 显式覆盖 profile 目录（一般无需）
const DSH_HOME = process.env.DSH_HOME || 'C:\\Users\\Administrator\\.dsh'
const HARNESS_ROOT = process.env.DSH_HARNESS_ROOT || process.cwd()
const PROFILE_DIR = process.env.DSH_PROFILE_DIR || join(DSH_HOME, 'profiles', 'web')
const PATCH_FILE = join(PROFILE_DIR, 'cordis.patch.yml')

// 可编辑的未暴露参数（插件 id → 参数路径 → 约束）
const MANAGED_CONFIG = {
  'tool-web': {
    searchTimeoutMs: { default: 30000, min: 1000, max: 600000, label: 'Web 搜索超时(ms)' },
    fetchTimeoutMs: { default: 30000, min: 1000, max: 600000, label: 'Web 抓取超时(ms)' },
    searchMaxResults: { default: 5, min: 1, max: 50, label: '搜索最大结果数' },
    fetchMaxOutputChars: { default: 20000, min: 1000, max: 1000000, label: '抓取最大输出字符' }
  },
  'tool-fs-search': {
    timeoutMs: { default: 30000, min: 1000, max: 600000, label: '文件搜索超时(ms)' },
    globMaxResults: { default: 100, min: 1, max: 10000, label: 'glob 最大结果数' },
    grepMaxMatches: { default: 250, min: 1, max: 10000, label: 'grep 最大匹配数' }
  }
}

// ── preset 平面压缩配置 ───────────────────────────────────────────────────
// 压缩后端在 agent preset 的 composition 里（compaction 组 → compaction-basic），
// 不在顶层组合树，settings 系统够不到。此路径通过环境变量可覆盖，默认指向
// 用户自定义 preset（cordis-custom），升级不丢。
const DSH_AGENT_PRESET_DIR = process.env.DSH_AGENT_PRESET_DIR || join(DSH_HOME, '.agent-presets')
const PRESET_ID = process.env.DSH_AGENT_PRESET_ID || 'cordis-custom'
const PRESET_COMPOSITION = join(DSH_AGENT_PRESET_DIR, PRESET_ID, 'agent.cordis.yml')
// js-yaml 在 harness 根 node_modules，不在 profile 目录；基于 HARNESS_ROOT 解析
const _require = createRequire(join(HARNESS_ROOT, 'package.json'))
const jsYaml = _require('js-yaml')
const JsExprType = new jsYaml.Type('tag:yaml.org,2002:js', {
  kind: 'scalar',
  resolve: (d) => typeof d === 'string',
  construct: (d) => ({ __jsExpr: d }),
  predicate: (d) => d && d.__jsExpr !== undefined,
  represent: (d) => d.__jsExpr
})
const PRESET_SCHEMA = jsYaml.JSON_SCHEMA.extend([JsExprType])
const COMPACTION_KEYS = ['auto', 'thresholdRatio', 'retainRatio', 'maxTokens', 'maxOverflowRetries']

/** 读取 preset composition 里 compaction-basic 的 config（只读解析，安全）。 */
function readPresetCompaction() {
  if (!existsSync(PRESET_COMPOSITION)) {
    return { ok: true, value: { found: false, message: `preset composition 不存在: ${PRESET_COMPOSITION}` } }
  }
  try {
    const doc = jsYaml.load(readFileSync(PRESET_COMPOSITION, 'utf8'), { schema: PRESET_SCHEMA })
    const compaction = Array.isArray(doc) ? doc.find((e) => e && e.id === 'compaction') : undefined
    const basic = compaction && Array.isArray(compaction.config)
      ? compaction.config.find((c) => c && c.id === 'compaction-basic')
      : undefined
    const config = basic && basic.config ? basic.config : {}
    const value = {}
    for (const key of COMPACTION_KEYS) {
      value[key] = config[key] !== undefined ? config[key] : undefined
    }
    return { ok: true, value: { found: true, preset: PRESET_ID, file: PRESET_COMPOSITION, config: value } }
  } catch (error) {
    return { ok: false, error: { message: '读取 preset 压缩配置失败: ' + (error.message || error) } }
  }
}

/** 行级写入：只替换 compaction-basic 的 config 键，保留 !!js 表达式与其余结构。 */
function writePresetCompaction(payload) {
  const patch = payload && typeof payload === 'object' ? payload : {}
  const next = {}
  const meta = { auto: 'boolean', thresholdRatio: 'number', retainRatio: 'number', maxTokens: 'number', maxOverflowRetries: 'number' }
  for (const key of COMPACTION_KEYS) {
    if (patch[key] === undefined) continue
    if (meta[key] === 'boolean' && typeof patch[key] !== 'boolean') {
      return { ok: false, error: { message: `${key} 必须是布尔值` } }
    }
    if (meta[key] === 'number' && (typeof patch[key] !== 'number' || !Number.isFinite(patch[key]))) {
      return { ok: false, error: { message: `${key} 必须是数字` } }
    }
    next[key] = patch[key]
  }
  if (Object.keys(next).length === 0) {
    return { ok: false, error: { message: '没有可写入的压缩参数' } }
  }
  if (!existsSync(PRESET_COMPOSITION)) {
    return { ok: false, error: { message: `preset composition 不存在: ${PRESET_COMPOSITION}` } }
  }
  const backupDir = join(PROFILE_DIR, 'backups')
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = join(backupDir, `agent.cordis.yml.${stamp}.bak`)
  try {
    copyFileSync(PRESET_COMPOSITION, backupPath)
    const lines = readFileSync(PRESET_COMPOSITION, 'utf8').split('\n')
    // 定位 compaction 组条目
    let compStart = -1
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim()
      if (t === '- id: compaction') { compStart = i; break }
    }
    if (compStart === -1) return { ok: false, error: { message: 'preset composition 里找不到 compaction 组' } }
    // 在 compaction 组内定位 compaction-basic
    let basicStart = -1
    for (let i = compStart + 1; i < lines.length; i++) {
      const ind = lines[i].length - lines[i].trimStart().length
      if (ind === 0 && lines[i].trim().startsWith('- ')) break // 出组
      if (lines[i].trim() === '- id: compaction-basic') { basicStart = i; break }
    }
    if (basicStart === -1) return { ok: false, error: { message: 'preset composition 里找不到 compaction-basic' } }
    // 定位 basic 的 config: 段
    let cfgStart = -1
    for (let i = basicStart + 1; i < lines.length; i++) {
      const ind = lines[i].length - lines[i].trimStart().length
      if (ind <= 4 && lines[i].trim()) break // 出 basic 条目
      if (lines[i].trim() === 'config:') { cfgStart = i; break }
    }
    if (cfgStart === -1) return { ok: false, error: { message: 'compaction-basic 缺 config 段' } }
    const cfgIndent = 8
    // 先收集 config 段现有键的行号
    const keyLines = new Map()
    for (let i = cfgStart + 1; i < lines.length; i++) {
      const ind = lines[i].length - lines[i].trimStart().length
      if (!lines[i].trim()) continue
      if (ind < cfgIndent) break
      const m = lines[i].trim().match(/^([^:]+):\s*(.*)$/)
      if (m && COMPACTION_KEYS.includes(m[1].trim())) keyLines.set(m[1].trim(), i)
    }
    const pad = ' '.repeat(cfgIndent)
    const writeRows = []
    for (const key of Object.keys(next)) {
      const raw = typeof next[key] === 'boolean' ? (next[key] ? 'true' : 'false') : String(next[key])
      if (keyLines.has(key)) {
        lines[keyLines.get(key)] = pad + key + ': ' + raw
      } else {
        writeRows.push(pad + key + ': ' + raw)
      }
    }
    if (writeRows.length > 0) {
      // 追加到 config 段末尾（cfgStart 之后第一个缩进 < 8 的空行前）
      let insertAt = cfgStart + 1
      while (insertAt < lines.length) {
        const ind = lines[insertAt].length - lines[insertAt].trimStart().length
        if (lines[insertAt].trim() === '' || ind < cfgIndent) break
        insertAt++
      }
      lines.splice(insertAt, 0, ...writeRows)
    }
    writeFileSync(PRESET_COMPOSITION, lines.join('\n'), 'utf8')
    return { ok: true, message: `已写入 preset 压缩配置（${Object.keys(next).join(', ')}），下次会话生效；备份: ${backupPath}` }
  } catch (error) {
    try { if (existsSync(backupPath)) copyFileSync(backupPath, PRESET_COMPOSITION) } catch { }
    return { ok: false, error: { message: '写入 preset 压缩配置失败: ' + (error.message || error) } }
  }
}

function log(msg) {
  try { appendFileSync(join(PROFILE_DIR, 'dsh-settings-tuner.log'), `[${new Date().toISOString()}] ${msg}\n`) } catch { }
}

function backupPatchFile() {
  const backupDir = join(PROFILE_DIR, 'backups')
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = join(backupDir, `cordis.patch.yml.${stamp}.bak`)
  copyFileSync(PATCH_FILE, backupPath)
  return backupPath
}

function validateValue(pluginId, key, value) {
  const meta = MANAGED_CONFIG[pluginId]?.[key]
  if (!meta) throw new Error(`未知参数 ${pluginId}.${key}`)
  if (meta.type === 'boolean') {
    if (typeof value !== 'boolean') throw new Error(`${meta.label} 必须是布尔值`)
    return
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${meta.label} 必须是数字`)
  if (value < meta.min || value > meta.max) throw new Error(`${meta.label} 必须在 ${meta.min}~${meta.max} 之间`)
}

// ── 行级 YAML 解析 ─────────────────────────────────────────────────────────

function lineIndent(line) {
  const m = line.match(/^\s*/)
  return m ? m[0].length : 0
}

function isSkipLine(line) {
  const t = line.trim()
  return !t || t.startsWith('#')
}

/** 查找顶层 `- id: <pluginId>` 条目的行范围（缩进 0），跳过注释与 insert 块 */
function findTopLevelEntry(lines, pluginId) {
  for (let i = 0; i < lines.length; i++) {
    if (isSkipLine(lines[i])) continue
    if (lineIndent(lines[i]) !== 0) continue
    const t = lines[i].trim()
    if (!t.startsWith('- ')) continue
    const idMatch = t.match(/^- id:\s*(.+)$/)
    if (!idMatch) continue
    const id = idMatch[1].trim().replace(/['"]/g, '')
    if (id !== pluginId) continue
    // 找条目结束：下一行缩进 0 的 `- ` 条目
    let end = lines.length
    for (let j = i + 1; j < lines.length; j++) {
      if (isSkipLine(lines[j])) continue
      if (lineIndent(lines[j]) === 0 && lines[j].trim().startsWith('- ')) { end = j; break }
    }
    return { start: i, end }
  }
  return { start: -1, end: -1 }
}

/** 在条目内查找 `config:` 段（缩进 2）的行范围 */
function findConfigSection(lines, entryStart, entryEnd) {
  for (let i = entryStart; i < entryEnd; i++) {
    if (isSkipLine(lines[i])) continue
    if (lineIndent(lines[i]) !== 2) continue
    if (lines[i].trim() !== 'config:') continue
    let secEnd = entryEnd
    for (let j = i + 1; j < entryEnd; j++) {
      if (isSkipLine(lines[j])) continue
      if (lineIndent(lines[j]) <= 2) { secEnd = j; break }
    }
    return { start: i, end: secEnd }
  }
  return { start: -1, end: -1 }
}

/** 在 config 段内查找 key 的值（缩进 4），解析 YAML 标量（数字/布尔/字符串） */
function findConfigKey(lines, cfgStart, cfgEnd, key) {
  for (let i = cfgStart + 1; i < cfgEnd; i++) {
    if (isSkipLine(lines[i])) continue
    if (lineIndent(lines[i]) !== 4) continue
    const m = lines[i].trim().match(/^([^:]+):\s*(.*)$/)
    if (!m || m[1].trim() !== key) continue
    let raw = m[2].trim()
    if (/^true$/i.test(raw)) return { line: i, value: true }
    if (/^false$/i.test(raw)) return { line: i, value: false }
    const num = Number(raw)
    if (raw !== '' && Number.isFinite(num)) return { line: i, value: num }
    return { line: i, value: raw.replace(/^['"]|['"]$/g, '') }
  }
  return null
}

/** 读取某个插件某 key 的当前值（行级解析） */
function parseConfigValue(content, pluginId, key) {
  const lines = content.split('\n')
  const entry = findTopLevelEntry(lines, pluginId)
  if (entry.start === -1) return void 0
  const cfg = findConfigSection(lines, entry.start, entry.end)
  if (cfg.start === -1) return void 0
  const found = findConfigKey(lines, cfg.start, cfg.end, key)
  return found ? found.value : void 0
}

/** 读取当前配置值 */
function readConfig() {
  const result = {}
  for (const [pluginId, params] of Object.entries(MANAGED_CONFIG)) {
    result[pluginId] = {}
    for (const [key, meta] of Object.entries(params)) {
      result[pluginId][key] = meta.default
    }
  }
  try {
    if (existsSync(PATCH_FILE)) {
      const content = readFileSync(PATCH_FILE, 'utf8')
      for (const [pluginId, params] of Object.entries(MANAGED_CONFIG)) {
        for (const key of Object.keys(params)) {
          const val = parseConfigValue(content, pluginId, key)
          if (val !== void 0) result[pluginId][key] = val
        }
      }
    }
  } catch (error) {
    log('readConfig 解析失败: ' + error.message)
  }
  return result
}

/** 行级写入：更新或追加 config 覆盖条目 */
function writeConfig(pluginId, key, value) {
  validateValue(pluginId, key, value)
  const backupPath = backupPatchFile()
  try {
    const content = existsSync(PATCH_FILE) ? readFileSync(PATCH_FILE, 'utf8') : ''
    let lines = content.split('\n')
    const entry = findTopLevelEntry(lines, pluginId)

    if (entry.start === -1) {
      // 无条目：追加（去掉末尾空行）
      while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()
      lines.push('', '- id: ' + pluginId, '  config:', '    ' + key + ': ' + value, '')
    } else {
      const cfg = findConfigSection(lines, entry.start, entry.end)
      if (cfg.start !== -1) {
        const found = findConfigKey(lines, cfg.start, cfg.end, key)
        if (found) {
          lines[found.line] = lines[found.line].replace(/^(\s*[^:]+:\s*)\S+/, '$1' + value)
        } else {
          // 在 config 段末尾（cfg.end 前）追加 key，缩进 4
          lines.splice(cfg.end, 0, '    ' + key + ': ' + value)
        }
      } else {
        // 无 config 段：在条目最后一个缩进 2 的属性后追加
        let insertAt = entry.end
        for (let i = entry.start + 1; i < entry.end; i++) {
          if (!isSkipLine(lines[i]) && lineIndent(lines[i]) === 2) insertAt = i + 1
        }
        lines.splice(insertAt, 0, '  config:', '    ' + key + ': ' + value)
      }
    }
    writeFileSync(PATCH_FILE, lines.join('\n'), 'utf8')

    // 写入后验证：dump-config 确认 YAML 可解析；失败回滚
    const verify = verifyPatch()
    if (!verify.ok) {
      try { copyFileSync(backupPath, PATCH_FILE) } catch { }
      log('写入后验证失败，已回滚: ' + verify.error)
      return { ok: false, error: { message: '写入后配置校验失败，已回滚（' + verify.error + '）' } }
    }
    log('写入 ' + pluginId + '.' + key + ' = ' + value + '，备份: ' + backupPath)
    return { ok: true, backupPath, message: '已写入 ' + pluginId + '.' + key + ' = ' + value + '（需重启生效）' }
  } catch (error) {
    log('writeConfig 失败: ' + error.message)
    return { ok: false, error: { message: '写入失败: ' + error.message } }
  }
}

/** 运行 dump-config 验证 patch 文件可解析 */
function verifyPatch() {
  try {
    const out = execSync('npx --yes dsh --profile web --dump-config', {
      cwd: HARNESS_ROOT,
      timeout: 30000,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NO_PROXY: '*' }
    }).toString()
    if (out.includes('failed to parse') || out.includes('ERR_MODULE_NOT_FOUND')) {
      return { ok: false, error: out.slice(0, 200) }
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: String(error.message || error).slice(0, 200) }
  }
}

function apply(ctx) {
  ctx.connection.rpc.handle(RPC_CHANNEL, async (endpoint, payload) => {
    if (endpoint === 'config/read') {
      return { ok: true, value: readConfig() }
    }
    if (endpoint === 'config/write') {
      const { pluginId, key, value } = payload || {}
      if (!pluginId || !key) return { ok: false, error: { message: '缺少 pluginId 或 key' } }
      return writeConfig(pluginId, key, value)
    }
    if (endpoint === 'preset-compact/read') {
      return readPresetCompaction()
    }
    if (endpoint === 'preset-compact/write') {
      const { config } = payload || {}
      return writePresetCompaction(config)
    }
    return { ok: false, error: { message: '未知端点 ' + JSON.stringify(endpoint) } }
  }, { authority: 'loopback' })
}

export { apply, inject, name }
export default { apply, inject, name }