// 独立验收 dsh-settings-tuner 的行级 YAML 编辑逻辑
// 覆盖：空文件、已有条目、复杂 YAML（注释/insert 块/嵌套）、注释误匹配防护

function lineIndent(line) {
  const m = line.match(/^\s*/)
  return m ? m[0].length : 0
}

function isSkipLine(line) {
  const t = line.trim()
  return !t || t.startsWith('#')
}

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
    let end = lines.length
    for (let j = i + 1; j < lines.length; j++) {
      if (isSkipLine(lines[j])) continue
      if (lineIndent(lines[j]) === 0 && lines[j].trim().startsWith('- ')) { end = j; break }
    }
    return { start: i, end }
  }
  return { start: -1, end: -1 }
}

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

function findConfigKey(lines, cfgStart, cfgEnd, key) {
  for (let i = cfgStart + 1; i < cfgEnd; i++) {
    if (isSkipLine(lines[i])) continue
    if (lineIndent(lines[i]) !== 4) continue
    const m = lines[i].trim().match(/^([^:]+):\s*(\S+)/)
    if (m && m[1].trim() === key) return { line: i, value: Number(m[2]) }
  }
  return null
}

function parseConfigValue(content, pluginId, key) {
  const lines = content.split('\n')
  const entry = findTopLevelEntry(lines, pluginId)
  if (entry.start === -1) return void 0
  const cfg = findConfigSection(lines, entry.start, entry.end)
  if (cfg.start === -1) return void 0
  const found = findConfigKey(lines, cfg.start, cfg.end, key)
  return found ? found.value : void 0
}

function writeConfigTo(content, pluginId, key, value) {
  let lines = content.split('\n')
  const entry = findTopLevelEntry(lines, pluginId)
  if (entry.start === -1) {
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()
    lines.push('', '- id: ' + pluginId, '  config:', '    ' + key + ': ' + value, '')
  } else {
    const cfg = findConfigSection(lines, entry.start, entry.end)
    if (cfg.start !== -1) {
      const found = findConfigKey(lines, cfg.start, cfg.end, key)
      if (found) {
        lines[found.line] = lines[found.line].replace(/^(\s*[^:]+:\s*)\S+/, '$1' + value)
      } else {
        lines.splice(cfg.end, 0, '    ' + key + ': ' + value)
      }
    } else {
      let insertAt = entry.end
      for (let i = entry.start + 1; i < entry.end; i++) {
        if (!isSkipLine(lines[i]) && lineIndent(lines[i]) === 2) insertAt = i + 1
      }
      lines.splice(insertAt, 0, '  config:', '    ' + key + ': ' + value)
    }
  }
  return lines.join('\n')
}

let passed = 0, failed = 0
function check(label, actual, expected) {
  if (actual === expected) { console.log('  ✓ ' + label); passed++ }
  else { console.log('  ✗ ' + label); console.log('    实际: ' + JSON.stringify(actual)); console.log('    期望: ' + JSON.stringify(expected)); failed++ }
}
function contains(label, actual, needle, expect) {
  if (actual.includes(needle) === expect) { console.log('  ✓ ' + label); passed++ }
  else { console.log('  ✗ ' + label + ' (' + needle + ' 存在=' + actual.includes(needle) + ', 期望=' + expect + ')'); failed++ }
}

console.log('=== dsh-settings-tuner 行级 YAML 编辑测试 ===\n')

// 复杂 YAML：注释里含 `id: tool-web` 字样、insert 块、嵌套条目
const COMPLEX = `# 注释里有 id: tool-web 字样（不应被误匹配）
# 另一条注释 id: tool-fs-search
- insert:
    - id: dsh-i18n
      name: dsh-i18n

- id: dsh-zh-commands
  name: dsh-zh-commands

- id: tool-web
  disabled: true
  config:
    searchTimeoutMs: 30000

- id: tool-fs-search
  config:
    timeoutMs: 30000
    globMaxResults: 100
`

// 1. 读取：注释里的 id 不应影响
check('读取 tool-web.searchTimeoutMs', parseConfigValue(COMPLEX, 'tool-web', 'searchTimeoutMs'), 30000)
check('读取 tool-fs-search.timeoutMs', parseConfigValue(COMPLEX, 'tool-fs-search', 'timeoutMs'), 30000)
check('读取 tool-fs-search.globMaxResults', parseConfigValue(COMPLEX, 'tool-fs-search', 'globMaxResults'), 100)
check('读取不存在的 key', parseConfigValue(COMPLEX, 'tool-web', 'fetchTimeoutMs'), void 0)
check('读取不存在的插件', parseConfigValue(COMPLEX, 'tool-nonexist', 'timeoutMs'), void 0)

// 2. 写入：更新已有 key
let c2 = writeConfigTo(COMPLEX, 'tool-web', 'searchTimeoutMs', 90000)
check('更新 tool-web.searchTimeoutMs', parseConfigValue(c2, 'tool-web', 'searchTimeoutMs'), 90000)
contains('保留 tool-web.disabled', c2, 'disabled: true', true)
contains('注释未被破坏', c2, '注释里有 id: tool-web 字样', true)
contains('insert 块未被破坏', c2, 'name: dsh-i18n', true)

// 3. 写入：config 段追加新 key
let c3 = writeConfigTo(COMPLEX, 'tool-web', 'fetchTimeoutMs', 45000)
check('追加 tool-web.fetchTimeoutMs', parseConfigValue(c3, 'tool-web', 'fetchTimeoutMs'), 45000)
check('保留旧 key', parseConfigValue(c3, 'tool-web', 'searchTimeoutMs'), 30000)

// 4. 写入：无 config 段条目追加 config
const NO_CONFIG = '- id: tool-web\n  disabled: true\n'
let c4 = writeConfigTo(NO_CONFIG, 'tool-web', 'searchTimeoutMs', 60000)
check('无 config 段追加', parseConfigValue(c4, 'tool-web', 'searchTimeoutMs'), 60000)
contains('保留 disabled', c4, 'disabled: true', true)

// 5. 写入：空文件追加
let c5 = writeConfigTo('', 'tool-fs-search', 'timeoutMs', 60000)
check('空文件追加', parseConfigValue(c5, 'tool-fs-search', 'timeoutMs'), 60000)

// 6. 多轮写入不破坏结构
let c6 = writeConfigTo('', 'tool-fs-search', 'timeoutMs', 60000)
c6 = writeConfigTo(c6, 'tool-fs-search', 'globMaxResults', 200)
check('多轮 timeoutMs', parseConfigValue(c6, 'tool-fs-search', 'timeoutMs'), 60000)
check('多轮 globMaxResults', parseConfigValue(c6, 'tool-fs-search', 'globMaxResults'), 200)

// 7. insert 块里的嵌套条目不影响顶层匹配
const INSERT_TOP = '- insert:\n    - id: tool-web\n      name: x\n'
check('insert 嵌套不被当顶层', parseConfigValue(INSERT_TOP, 'tool-web', 'searchTimeoutMs'), void 0)
let c7 = writeConfigTo(INSERT_TOP, 'tool-web', 'searchTimeoutMs', 5000)
contains('追加顶层条目', c7, '- id: tool-web\n  config:', true)

console.log('\n=== 结果：' + passed + ' 通过，' + failed + ' 失败，共 ' + (passed + failed) + ' 项 ===')
if (failed > 0) process.exit(1)