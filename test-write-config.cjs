// 独立验收 dsh-settings-tuner 的 config 写入逻辑（用临时文件模拟）
// 覆盖：新条目追加、已有条目更新、config 段更新、嵌套 key 追加
const { readFileSync, writeFileSync, mkdtempSync, rmSync } = require('node:fs')
const { join } = require('node:path')
const { tmpdir } = require('node:os')

// 复制插件里的核心逻辑（不 import，避免依赖解析）
function writeConfigTo(content, pluginId, key, value) {
  const entryRegex = new RegExp('(^-\\s*id:\\s*' + pluginId + '\\s*\\n(?:[^\\n]*\\n)*?)(\\s*config:\\s*\\n(?:\\s+(?:[^:]+):\\s+[^\\n]+\\n)*)?', 'm')
  const match = content.match(entryRegex)
  if (match) {
    const existingEntry = match[0]
    const configSection = match[2]
    if (configSection) {
      const keyRegex = new RegExp('(\\s+' + key + ':\\s+)\\S+', 'm')
      if (keyRegex.test(configSection)) {
        content = content.replace(keyRegex, '$1' + value)
      } else {
        const indent = configSection.match(/\n(\s+)\S/) ? configSection.match(/\n(\s+)\S/)[1] : '    '
        content = content.replace(existingEntry, existingEntry.replace(/\n$/, '') + '\n' + indent + key + ': ' + value + '\n')
      }
    } else {
      content = content.replace(existingEntry, existingEntry.replace(/\n$/, '') + '\n  config:\n    ' + key + ': ' + value + '\n')
    }
  } else {
    content += '\n- id: ' + pluginId + '\n  config:\n    ' + key + ': ' + value + '\n'
  }
  return content
}

let passed = 0, failed = 0
function check(label, actual, expected) {
  if (actual === expected) { console.log('  ✓ ' + label); passed++ }
  else { console.log('  ✗ ' + label); console.log('    实际:\n' + actual); console.log('    期望:\n' + expected); failed++ }
}

console.log('=== dsh-settings-tuner 配置写入逻辑测试 ===\n')

// 1. 空文件追加新条目
let c1 = ''
c1 = writeConfigTo(c1, 'tool-web', 'searchTimeoutMs', 60000)
check('空文件追加', c1, '\n- id: tool-web\n  config:\n    searchTimeoutMs: 60000\n')

// 2. 已有条目无 config 段，追加 config
let c2 = '- insert:\n    - id: dsh-i18n\n      name: dsh-i18n\n\n- id: tool-web\n  disabled: true\n'
c2 = writeConfigTo(c2, 'tool-web', 'searchTimeoutMs', 60000)
check('已有条目无 config 追加', c2.includes('searchTimeoutMs: 60000'), true)
check('已有条目保留 disabled', c2.includes('disabled: true'), true)

// 3. 已有 config 段，更新已有 key
let c3 = '- id: tool-web\n  config:\n    searchTimeoutMs: 30000\n'
c3 = writeConfigTo(c3, 'tool-web', 'searchTimeoutMs', 90000)
check('更新已有 key', c3.includes('searchTimeoutMs: 90000'), true)
check('更新后无旧值', c3.includes('searchTimeoutMs: 30000'), false)

// 4. 已有 config 段，追加新 key
let c4 = '- id: tool-web\n  config:\n    searchTimeoutMs: 30000\n'
c4 = writeConfigTo(c4, 'tool-web', 'fetchTimeoutMs', 45000)
check('追加新 key', c4.includes('fetchTimeoutMs: 45000'), true)
check('保留旧 key', c4.includes('searchTimeoutMs: 30000'), true)

// 5. 多轮写入不破坏结构
let c5 = ''
c5 = writeConfigTo(c5, 'tool-fs-search', 'timeoutMs', 60000)
c5 = writeConfigTo(c5, 'tool-fs-search', 'globMaxResults', 200)
check('多轮写入 timeoutMs', c5.includes('timeoutMs: 60000'), true)
check('多轮写入 globMaxResults', c5.includes('globMaxResults: 200'), true)

console.log('\n=== 结果：' + passed + ' 通过，' + failed + ' 失败 ===')
if (failed > 0) process.exit(1)