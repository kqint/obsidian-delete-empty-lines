# Obsidian Delete Empty Lines

用于删除或压缩笔记中的空行，支持处理整篇文档或仅处理选中内容。

[English](./README.md)

## 功能

- 处理全文空行
- 仅处理选中区域
- 可配置最大连续空行数
- 可选是否将“仅空格/制表符”的行视为空行
- 国际化界面（`English` 与 `简体中文`）

## 命令

- 压缩空行（全文，保留 {count} 行）
- 压缩空行（选中区域，保留 {count} 行）

命令中的 `{count}` 会根据设置动态更新。

## 右键菜单

- 有选中文本时：显示选中区域处理命令
- 未选中文本时：显示全文处理命令


## 安装

### 手动安装

1. 下载最新发布文件。
2. 将 `main.js`、`manifest.json` 和 `locales/` 目录复制到：
   `.obsidian/plugins/delete-empty-lines/`
3. 重启 Obsidian，并在社区插件中启用本插件。


## 国际化

语言文件位于 `locales/`：

- `locales/en.json`
- `locales/zh.json`

如需新增语言：

1. 复制 `locales/en.json`，例如为 `locales/ja.json`。
2. 翻译其中所有值。
3. 在插件设置界面中加入对应语言选项。


## 许可证

[MIT](./LICENSE)
