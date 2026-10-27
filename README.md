# SVG Editor · Lab1 Phase 1

使用 TypeScript 编写的面向对象 SVG 命令行编辑器。支持六种图形、嵌套分组、19 条命令和完整编辑撤销重做。

远程仓库：https://github.com/sunyanqi666/svg-editor-lab1（私有）。提交作业时使用 `final` 标签。

## 安装与运行

需要 Node.js 22 或更高版本和 npm。

```sh
npm ci
npm run cli
```

终端出现 `svg>` 后输入命令；`help` 查看全部命令，Ctrl+D 退出。

```text
init 800 600
create g node
create rect r1 100 100 160 60 #4a90d9 in node
create text title 120 135 "开始" in node
move node 50 0
undo
save demo.svg
```

用浏览器打开生成的 `demo.svg` 即可预览。

## 验证和案例回放

```sh
npm test
npm run check:architecture
npm run check
npm run demo
npm run cli < fixtures/flowchart.commands
```

`npm run check` 一次运行编译、全部测试和架构检查；`npm run demo` 回放流程图与跨容器撤销两组案例，在临时目录校验 SVG 后自动清理，不改动工程文件。

最后一条会生成或覆盖 `fixtures/flowchart.svg`，可直接在浏览器中打开。`fixtures/other.svg` 是含缺失 id 的外部 SVG 测试案例。

## 支持的命令

| 类别 | 命令 |
| --- | --- |
| 文档 | `init [w] [h]`、`read <file.svg>`、`save [file.svg]`、`canvas [w] [h]` |
| 图形 | `create <type> <id> [params…] [in <containerId>]`、`delete <id>`、`move <id> <dx> <dy>`、`scale <id> <factor>`、`set <id> <attr> <value>` |
| 层级 | `group <newGid> <id1> [id2…]`、`ungroup <gid>`、`addto <gid> <id>`、`front <id>`、`back <id>` |
| 查看 | `tree [id]`、`show <id>`、`help` |
| 历史 | `undo`、`redo` |

| 创建类型 | 参数（id 之后） |
| --- | --- |
| rect | `x y width height [fill]` |
| circle | `cx cy r [fill]` |
| ellipse | `cx cy rx ry [fill]` |
| line | `x1 y1 x2 y2 [stroke]` |
| text | `x y "content"` |
| g | 无；可以通过 `in`、`addto` 或 `group` 添加子图形 |

所有创建命令均可追加 `in <containerId>`。id 全局唯一且大小写敏感；坐标可以是浮点数，x 向右、y 向下。

`set` 支持 `fill`、`stroke`、`stroke-width`、各图形的几何属性，以及 text 的 `text`；其他属性报错。移动使用增量；缩放会把位置和尺寸同乘正数因子。容器递归操作子孙。

`#` 开头的整行是注释；颜色中的 `#` 不会被当作注释。不支持行尾注释。双引号用于空格参数，文本中使用 `\"` 和 `\\` 表示引号和反斜杠。脚本模式不输出提示符。

## 文件与历史规则

- 保存为标准 SVG XML；不填写的 fill/stroke 不额外生成，遵循 SVG 默认值。
- 读入前先保留所有显式 id，再按标签名与序号分配缺失 id 并警告，避免与后面的显式 id 撞名。重复显式 id 拒绝读入。
- `save` 无路径时严格使用最近一次成功**读取**的路径；显式另存到其他路径不会改变该目标。`init` 清除读取路径。新建且未读取过文件的文档，每次保存都须提供路径。
- 成功执行 `init`、`read`、`save` 或修改画布尺寸后，旧历史被清空，undo/redo 禁用至下一次成功编辑；查询 `canvas` 不影响历史。
- 显示命令和失败命令不改变历史；撤销后成功执行新编辑会清空 redo。每条编辑命令是一个撤销单元。
- 删除容器会删除整棵子树；撤销恢复完整结构和顺序。按任务书规定，svg 直接子节点中的 g 不允许 ungroup，嵌套 g 可以解散。
- front 把图形移到同级 SVG 节点末尾（最上层），back 移到开头（最下层）。

## 外部 SVG 的支持边界

本项目实现任务书要求的六种图形和属性，不是通用 SVG 编辑器。

- 支持数字或 px 画布尺寸、匹配画布的 `viewBox="0 0 width height"`、嵌套 g、XML 文本转义、注释和 CDATA 文本。
- 额外保留 `font-size`（数字/px）、`text-anchor`、`font-family` 和 `font-weight`；这些属性可通过外部 SVG 导入，CLI 的 set 仍遵守任务书白名单。
- 支持 `translate` 和正数等比 `scale`，读入时展开到叶子几何坐标，并调整导入变换涉及的文字大小和线宽。保存后不保留原 transform 写法，但保持对应渲染效果。
- 未知元素、style/CSS、路径、旋转、非等比缩放、百分比长度、其他 viewBox、嵌套文字标签和文档类型声明均报错，不静默丢弃。
- `box` 和插件系统不属于当前阶段，创建时返回 unknown shape type。
- 快照撤销适用于实验规模，每条编辑的时间和历史内存开销为 O(n)；未做大文档性能承诺。

参数数量错误会显示对应命令的 `usage:`；输入数字错误也会附上语法。任务书指定的语义错误仍保留原文格式。`help` 除全部 19 条命令外，还列出六种图形的创建参数。

## 自动检查与作业材料

GitHub Actions 在 main 推送、面向 main 的 PR 或手动触发时，分别使用 Node.js 22 和 24 执行安装、`npm run check` 和两组演示回放。流水线只读取仓库，不自动修改代码、标签或发布内容。

- [架构方案、过程记录、一致性自查和质量保证](doc/README.md)
- [需求与测试逐项对应表](doc/requirements.md)
- [模块依赖图](doc/architecture.puml)
- [关键类关系图](doc/classes.puml)
- [GitHub Actions 运行记录](https://github.com/sunyanqi666/svg-editor-lab1/actions)

保持原阶段提交历史，优化另作分步提交；`final` 标记当前最终交付提交。
