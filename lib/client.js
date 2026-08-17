window.__ModuleLoader__.load({
  id: "dsh-settings-tuner",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");

    const inject = ["slots", "connection"];
    const RPC_CHANNEL = "/dsh-settings-tuner";

    // ── 样式（幽灵式 + 品牌蓝，符合设计风格库 S-01/S-02）────────────────────
    const CSS = `
      .dst-search{margin-bottom:14px}
      .dst-search input{width:100%;padding:7px 12px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.35));border-radius:8px;background:var(--dsw-alias-bg-layer-2,#17171f);color:var(--dsw-alias-label-primary,#eee);font-size:12px;font-family:var(--dsw-font-family)}
      .dst-search input:focus{outline:none;border-color:var(--dsw-alias-button-primary-fill,#5AA7F2)}
      .dst-warn{border:1px solid rgba(229,83,75,.4);border-radius:8px;padding:8px 12px;font-size:11px;color:var(--dsw-alias-label-error,#e5534b);background:rgba(229,83,75,.08);margin-bottom:12px;line-height:1.6}
      .dst-section{margin-bottom:14px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.35));border-radius:10px;overflow:hidden}
      .dst-section-head{display:flex;align-items:center;gap:8px;padding:10px 14px;cursor:pointer;background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.04))}
      .dst-section-head:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.08))}
      .dst-section-title{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary,#eee);flex:1}
      .dst-badge{font-size:10px;padding:2px 8px;border-radius:999px;white-space:nowrap}
      .dst-badge.immediate{color:var(--dsw-alias-state-success,#3fb950);border:1px solid rgba(63,185,80,.4)}
      .dst-badge.restart{color:var(--dsw-alias-label-tertiary,#888);border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.35))}
      .dst-chev{font-size:10px;color:var(--dsw-alias-label-secondary,#999);transition:transform .2s;flex:none}
      .dst-chev.open{transform:rotate(180deg)}
      .dst-rows{padding:4px 14px 10px}
      .dst-row{display:flex;align-items:center;gap:10px;padding:8px 0;flex-shrink:0}
      .dst-row+.dst-row{border-top:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.15))}
      .dst-info{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
      .dst-label{font-size:13px;font-weight:500;color:var(--dsw-alias-label-primary,#eee)}
      .dst-label.override{color:var(--dsw-alias-button-primary-fill,#5AA7F2)}
      .dst-desc{font-size:11px;color:var(--dsw-alias-label-secondary,#999)}
      .dst-input{width:88px;padding:4px 8px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.35));border-radius:6px;background:var(--dsw-alias-bg-layer-2,#17171f);color:var(--dsw-alias-label-primary,#eee);font-size:12px;text-align:right;font-variant-numeric:tabular-nums;flex:none}
      .dst-input:focus{outline:none;border-color:var(--dsw-alias-button-primary-fill,#5AA7F2)}
      .dst-input.invalid{border-color:var(--dsw-alias-label-error,#e5534b)}
      .dst-select{padding:4px 8px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.35));border-radius:6px;background:var(--dsw-alias-bg-layer-2,#17171f);color:var(--dsw-alias-label-primary,#eee);font-size:12px;flex:none}
      .dst-btn{appearance:none;font:inherit;cursor:pointer;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.35));border-radius:8px;padding:4px 10px;font-size:11px;color:var(--dsw-alias-label-secondary,#bbb);background:transparent;white-space:nowrap;flex:none}
      .dst-btn:hover{color:var(--dsw-alias-label-primary,#eee);border-color:var(--dsw-alias-label-dimmed,rgba(128,128,128,.6));background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.08))}
      .dst-btn:active{background:var(--dsw-alias-interactive-bg-active,rgba(128,128,128,.16))}
      .dst-btn.primary{color:var(--dsw-alias-button-primary-text,#fff);background:var(--dsw-alias-button-primary-fill,#5AA7F2);border-color:var(--dsw-alias-button-primary-fill,#5AA7F2)}
      .dst-btn.primary:hover{filter:brightness(1.1)}
      .dst-btn:disabled{opacity:.5;cursor:default}
      .dst-status{font-size:11px;color:var(--dsw-alias-label-secondary,#999);padding:8px 0;text-align:center;min-height:16px}
      .dst-status.ok{color:var(--dsw-alias-state-success,#3fb950)}
      .dst-status.err{color:var(--dsw-alias-label-error,#e5534b)}
    `;

    function injectCss() {
      if (typeof document === "undefined") return;
      if (document.querySelector('style[data-plugin-css="dsh-settings-tuner"]')) return;
      var tag = document.createElement("style");
      tag.setAttribute("data-plugin-css", "dsh-settings-tuner");
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    // ── 参数定义（中文标签）─────────────────────────────────────────────────
    var SECTIONS = [
      { ns: "agent-loop", label: "代理循环", immediate: true, params: [
        { key: "maxParallelToolCalls", label: "最大并行工具数", desc: "每步最大并行工具调用数", type: "number", default: 10, min: 1, max: 100 }
      ] },
      { ns: "shell", label: "命令行", immediate: true, params: [
        { key: "timeoutMs", label: "命令默认超时", desc: "bash/pwsh 命令默认超时（毫秒）", type: "number", default: 120000, min: 1000, max: 600000 },
        { key: "maxTimeoutMs", label: "命令最大超时", desc: "bash/pwsh 命令超时上限（毫秒）", type: "number", default: 600000, min: 1000, max: 3600000 },
        { key: "maxOutputBytes", label: "最大输出字节", desc: "命令输出截断上限（字节）", type: "number", default: 64000, min: 1024, max: 1048576 }
      ] },
      { ns: "llm-deepseek", label: "DeepSeek 模型", immediate: true, params: [
        { key: "maxTokens", label: "最大输出 Token", desc: "单次回答最大生成 token 数", type: "number", default: 4096, min: 1, max: 1000000 },
        { key: "reasoningEffort", label: "推理强度", desc: "深度思考强度", type: "select", default: "high", options: ["off", "high", "max"] },
        { key: "thinking", label: "深度思考", desc: "是否启用深度思考模式", type: "select", default: "enabled", options: ["enabled", "disabled"] },
        { key: "streamIdleTimeoutMs", label: "流式空闲超时", desc: "流式响应空闲超时（毫秒）", type: "number", default: 30000, min: 1000, max: 600000 },
        { key: "retryPolicy.maxRetries", label: "请求重试次数", desc: "模型请求最大重试次数", type: "number", default: 2, min: 0, max: 10 },
        { key: "retryPolicy.backoff.initialDelayMs", label: "重试初始延迟", desc: "首次重试前等待（毫秒）", type: "number", default: 500, min: 0, max: 60000 },
        { key: "retryPolicy.backoff.maxDelayMs", label: "重试最大延迟", desc: "重试最大等待（毫秒）", type: "number", default: 10000, min: 100, max: 600000 },
        { key: "retryPolicy.backoff.jitterRatio", label: "重试抖动比率", desc: "0~1，避免惊群", type: "number", default: 0.1, min: 0, max: 1, step: 0.05 }
      ] },
      { ns: "agent-default-model", label: "默认模型", immediate: true, params: [
        { key: "provider", label: "默认提供商", desc: "新会话默认模型提供商", type: "string", default: "" },
        { key: "model", label: "默认模型", desc: "新会话默认模型", type: "string", default: "" },
        { key: "reasoningEffort", label: "默认推理强度", desc: "新会话默认推理强度", type: "string", default: "" }
      ] },
      { ns: "web-search-deepseek", label: "Web 搜索", immediate: true, params: [
        { key: "maxTokens", label: "搜索最大 Token", desc: "搜索请求最大生成 token", type: "number", default: 4096, min: 1, max: 1000000 },
        { key: "maxUses", label: "最大使用次数", desc: "搜索工具最大使用次数", type: "number", default: 5, min: 1, max: 100 }
      ] },
      { ns: "permission", label: "权限预设", immediate: true, params: [
        { key: "defaultPreset", label: "默认权限预设", desc: "新会话默认权限预设", type: "string", default: "" }
      ] },
      { ns: "agent-presets", label: "智能体预设", immediate: true, params: [
        { key: "default", label: "默认预设", desc: "新会话默认 agent 预设", type: "string", default: "standard" }
      ] }
    ];

    // 未暴露参数（通过 RPC 编辑 profile config，需重启）
    var UNEXPOSED = [
      { pluginId: "tool-web", key: "searchTimeoutMs", label: "Web 搜索超时", desc: "web_search 工具超时（毫秒），需重启生效", type: "number", default: 30000, min: 1000, max: 600000 },
      { pluginId: "tool-web", key: "fetchTimeoutMs", label: "Web 抓取超时", desc: "web_fetch 工具超时（毫秒），需重启生效", type: "number", default: 30000, min: 1000, max: 600000 },
      { pluginId: "tool-fs-search", key: "timeoutMs", label: "文件搜索超时", desc: "glob/grep 搜索超时（毫秒），需重启生效", type: "number", default: 30000, min: 1000, max: 600000 },
      { pluginId: "tool-fs-search", key: "globMaxResults", label: "glob 最大结果数", desc: "glob 搜索最大返回数，需重启生效", type: "number", default: 100, min: 1, max: 10000 },
      { pluginId: "tool-fs-search", key: "grepMaxMatches", label: "grep 最大匹配数", desc: "grep 最大匹配行数，需重启生效", type: "number", default: 250, min: 1, max: 10000 }
    ];

    function setPath(obj, path, value) {
      var parts = path.split(".");
      var cur = obj;
      for (var i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]] || typeof cur[parts[i]] !== "object") cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = value;
    }

    function getPath(obj, path) {
      var parts = path.split(".");
      var cur = obj;
      for (var i = 0; i < parts.length; i++) {
        if (cur === void 0 || cur === null) return void 0;
        cur = cur[parts[i]];
      }
      return cur;
    }

    function apply(ctx) {
      injectCss();
      var connection = ctx.get("connection");
      if (!connection || !connection.api) return;
      var api = connection.api;
      var rpc = connection.rpc;

      function SettingsTunerPage(props) {
        var _s = React.useState({}), values = _s[0], setValues = _s[1];
        var _st = React.useState(""), status = _st[0], setStatus = _st[1];
        var _q = React.useState(""), query = _q[0], setQuery = _q[1];
        var _c = React.useState({}), collapsed = _c[0], setCollapsed = _c[1];
        var _u = React.useState({}), unexposed = _u[0], setUnexposed = _u[1];

        React.useEffect(function() { loadAll(); }, []);

        function loadAll() {
          setStatus("加载中…");
          api.settings.describe({}).then(function(res) {
            if (res && res.result && res.result.ok) {
              var nss = res.result.value.namespaces || [];
              var next = {};
              for (var i = 0; i < SECTIONS.length; i++) {
                var sec = SECTIONS[i];
                var ns = nss.find(function(n) { return n.ns === sec.ns; });
                for (var j = 0; j < sec.params.length; j++) {
                  var p = sec.params[j];
                  var val = ns && ns.value ? getPath(ns.value, p.key) : void 0;
                  next[sec.ns + "." + p.key] = val !== void 0 && val !== null ? val : p.default;
                }
              }
              setValues(next);
            }
            setStatus("");
          }).catch(function() { setStatus(""); });

          rpc.call(RPC_CHANNEL, "config/read", {}).then(function(res) {
            if (res && res.ok && res.value) setUnexposed(res.value);
          }).catch(function() {});
        }

        function applyExposed(sec, p) {
          var val = values[sec.ns + "." + p.key];
          if (p.type === "number") {
            if (typeof val !== "number" || !Number.isFinite(val)) { setStatus("错误：" + p.label + " 必须是数字"); return; }
            if (val < p.min || val > p.max) { setStatus("错误：" + p.label + " 必须在 " + p.min + "~" + p.max + " 之间"); return; }
          }
          var patch = {};
          if (p.key.indexOf("retryPolicy") === 0) {
            // retryPolicy 是 union 类型（需 mode 字段），必须提交完整对象
            // 从当前 UI 值重建：mode='normal' + 所有 retryPolicy.* 子字段 + 默认 retryableCodes
            var rp = { mode: "normal", retryableCodes: ["EMPTY_RESPONSE", "RATE_LIMIT", "SERVER", "TIMEOUT", "TRANSPORT"] };
            for (var k in values) {
              if (k.indexOf(sec.ns + ".retryPolicy.") === 0) {
                var subPath = k.slice(sec.ns.length + 1); // retryPolicy.xxx
                setPath(rp, subPath.slice("retryPolicy.".length), values[k]);
              }
            }
            patch.retryPolicy = rp;
          } else {
            setPath(patch, p.key, val);
          }
          setStatus("保存中…");
          api.settings.update({ ns: sec.ns, patch: patch }).then(function() {
            setStatus("已保存 ✓ " + p.label);
          }).catch(function(err) {
            setStatus("保存失败：" + String(err && err.message || err));
          });
        }

        function resetSection(sec) {
          var patch = {};
          if (sec.ns === "llm-deepseek" && sec.params.some(function(p) { return p.key.indexOf("retryPolicy") === 0; })) {
            // retryPolicy 分组：整体重置为带 mode 的默认对象
            patch.retryPolicy = {
              mode: "normal",
              maxRetries: 2,
              retryableCodes: ["EMPTY_RESPONSE", "RATE_LIMIT", "SERVER", "TIMEOUT", "TRANSPORT"],
              backoff: { initialDelayMs: 500, maxDelayMs: 10000, jitterRatio: 0.1 }
            };
          } else {
            for (var i = 0; i < sec.params.length; i++) {
              setPath(patch, sec.params[i].key, sec.params[i].default);
            }
          }
          setStatus("重置中…");
          api.settings.update({ ns: sec.ns, patch: patch }).then(function() {
            var next = Object.assign({}, values);
            for (var i = 0; i < sec.params.length; i++) {
              next[sec.ns + "." + sec.params[i].key] = sec.params[i].default;
            }
            setValues(next);
            setStatus("已恢复默认 ✓");
          }).catch(function(err) {
            setStatus("重置失败：" + String(err && err.message || err));
          });
        }

        function applyUnexposed(param, val) {
          if (typeof val !== "number" || !Number.isFinite(val)) { setStatus("错误：" + param.label + " 必须是数字"); return; }
          if (val < param.min || val > param.max) { setStatus("错误：" + param.label + " 必须在 " + param.min + "~" + param.max + " 之间"); return; }
          setStatus("写入中…");
          rpc.call(RPC_CHANNEL, "config/write", { pluginId: param.pluginId, key: param.key, value: val }).then(function(res) {
            if (res && res.ok) setStatus("已写入 ✓ 需重启生效");
            else setStatus("写入失败：" + (res && res.error && res.error.message || "未知错误"));
          }).catch(function(err) {
            setStatus("写入失败：" + String(err && err.message || err));
          });
        }

        var q = query.trim().toLowerCase();
        var filteredSections = SECTIONS.filter(function(sec) {
          if (!q) return true;
          return sec.label.toLowerCase().indexOf(q) >= 0 || sec.params.some(function(p) { return p.label.toLowerCase().indexOf(q) >= 0 || (p.desc || "").toLowerCase().indexOf(q) >= 0; });
        });
        var filteredUnexposed = UNEXPOSED.filter(function(p) {
          if (!q) return true;
          return p.label.toLowerCase().indexOf(q) >= 0 || (p.desc || "").toLowerCase().indexOf(q) >= 0;
        });

        return React.createElement("div", null,
          React.createElement("div", { className: "dst-warn" }, "注意：绿色「立即生效」参数保存后即时生效；灰色「需重启」参数写入配置后需重启 dsh web 生效。修改前请确认参数含义。"),
          React.createElement("div", { className: "dst-search" },
            React.createElement("input", { type: "text", placeholder: "搜索参数…", value: query, onChange: function(e) { setQuery(e.target.value); } })
          ),
          filteredSections.map(function(sec) {
            var isCollapsed = collapsed[sec.ns] === true;
            var changed = sec.params.some(function(p) { return String(values[sec.ns + "." + p.key]) !== String(p.default); });
            return React.createElement("div", { key: sec.ns, className: "dst-section" },
              React.createElement("div", { className: "dst-section-head", onClick: function() { var next = Object.assign({}, collapsed); next[sec.ns] = !isCollapsed; setCollapsed(next); } },
                React.createElement("span", { className: "dst-section-title" }, sec.label + (changed ? " ●" : "")),
                React.createElement("span", { className: "dst-badge " + (sec.immediate ? "immediate" : "restart") }, sec.immediate ? "立即生效" : "需重启"),
                React.createElement("button", { className: "dst-btn", onClick: function(e) { e.stopPropagation(); resetSection(sec); } }, "恢复默认"),
                React.createElement("span", { className: "dst-chev" + (isCollapsed ? "" : " open") }, "▼")
              ),
              isCollapsed ? null : React.createElement("div", { className: "dst-rows" },
                sec.params.map(function(p) {
                  var val = values[sec.ns + "." + p.key];
                  var isOverride = String(val) !== String(p.default);
                  var invalid = p.type === "number" && (typeof val !== "number" || !Number.isFinite(val) || val < p.min || val > p.max);
                  return React.createElement("div", { key: p.key, className: "dst-row" },
                    React.createElement("div", { className: "dst-info" },
                      React.createElement("span", { className: "dst-label" + (isOverride ? " override" : "") }, p.label + (isOverride ? " ●" : "")),
                      React.createElement("span", { className: "dst-desc" }, p.desc)
                    ),
                    p.type === "select"
                      ? React.createElement("select", { className: "dst-select", value: String(val), onChange: function(e) { var next = Object.assign({}, values); next[sec.ns + "." + p.key] = e.target.value; setValues(next); } }, p.options.map(function(o) { return React.createElement("option", { key: o, value: o }, o); }))
                      : React.createElement("input", { className: "dst-input" + (invalid ? " invalid" : ""), type: p.type === "string" ? "text" : "number", value: val === void 0 ? "" : val, min: p.min, max: p.max, step: p.step, onChange: function(e) { var next = Object.assign({}, values); next[sec.ns + "." + p.key] = p.type === "number" ? Number(e.target.value) : e.target.value; setValues(next); } }),
                    React.createElement("button", { className: "dst-btn primary", onClick: function() { applyExposed(sec, p); } }, "应用")
                  );
                })
              )
            );
          }),
          filteredUnexposed.length > 0 ? React.createElement("div", { className: "dst-section" },
            React.createElement("div", { className: "dst-section-head" },
              React.createElement("span", { className: "dst-section-title" }, "未暴露参数（需重启生效）"),
              React.createElement("span", { className: "dst-badge restart" }, "需重启")
            ),
            React.createElement("div", { className: "dst-rows" },
              filteredUnexposed.map(function(p) {
                var cur = unexposed[p.pluginId] ? unexposed[p.pluginId][p.key] : p.default;
                var val = cur !== void 0 ? cur : p.default;
                var invalid = typeof val !== "number" || !Number.isFinite(val) || val < p.min || val > p.max;
                return React.createElement("div", { key: p.pluginId + "." + p.key, className: "dst-row" },
                  React.createElement("div", { className: "dst-info" },
                    React.createElement("span", { className: "dst-label" }, p.label),
                    React.createElement("span", { className: "dst-desc" }, p.desc)
                  ),
                  React.createElement("input", { className: "dst-input" + (invalid ? " invalid" : ""), type: "number", value: val, min: p.min, max: p.max, onChange: function(e) { var next = Object.assign({}, unexposed); if (!next[p.pluginId]) next[p.pluginId] = {}; next[p.pluginId][p.key] = Number(e.target.value); setUnexposed(next); } }),
                  React.createElement("button", { className: "dst-btn primary", onClick: function() { applyUnexposed(p, val); } }, "应用")
                );
              })
            )
          ) : null,
          React.createElement("div", { className: "dst-status" + (status.indexOf("失败") >= 0 || status.indexOf("错误") >= 0 ? " err" : status.indexOf("成功") >= 0 || status.indexOf("保存") >= 0 || status.indexOf("写入") >= 0 ? " ok" : "") }, status)
        );
      }

      ctx.slots.inject("settings.section", function() {
        return ctx.slots.register({
          name: "settings.section",
          id: "dsh-settings-tuner",
          order: 25,
          label: "系统参数"
        }, function() { return React.createElement(SettingsTunerPage, null); });
      });
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});