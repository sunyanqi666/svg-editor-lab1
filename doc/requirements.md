# Phase 1 需求复核与验收对应表

依据：用户提供的 `phase_cli_1.md`。本轮优化只强化 Phase 1，不引入 box、ShapeProvider、插件加载或额外编辑命令。

## 功能逐项映射

| 任务书位置 | 要求 | 实现位置 | 验证 |
| --- | --- | --- | --- |
| §2 | svg>、逐行 REPL、整行 # 注释、双引号、浮点坐标 | cli/main、Tokenizer、Shape | cli、acceptance、compliance 测试 |
| §2 | id 大小写敏感且唯一，缺失自动补全并警告 | Document、Group、SvgCodec | model、svg、compliance 测试 |
| §2 | error: 单行；失败不改变状态和历史 | CommandRouter、Session、EditCommand | cli、history、compliance 测试 |
| §3 | init/read/save/canvas | CommandRouter、SvgFileStore、Document | svg、compliance 测试 |
| §3、§4.1 | 六种 create；全部支持 in；省略样式不写属性 | ShapeFactory、CreateCommand | model、svg、compliance 测试 |
| §3 | delete/move/scale/set | 各编辑命令和 Shape 多态 | history、compliance 测试 |
| §3 | group/ungroup/addto/front/back | 各层级命令和 Group | groups、history、compliance 测试 |
| §3、§5 | tree/show/help，内联关键属性，查询不入栈 | Presenter、CommandRouter | cli、acceptance、compliance 测试 |
| §4.1 | set 白名单，容器公共样式、text 内容 | Shape、Text | model、compliance 测试 |
| §4.2 | 指定场景错误信息；根级 g 不可解散 | 命令路由、模型、各命令 | compliance 测试按原文比较 |
| §4.3 | 一编辑一撤销单元、新编辑清空 redo、IO 历史屏障 | EditCommand、History、Session | history、svg、compliance 测试 |
| §6、§6.1 A | 完整典型会话和两节点流程图 | fixtures、真实 CLI 子进程 | acceptance、demo 回放 |

## 架构和交付映射

| 要求 | 证据 |
| --- | --- |
| TypeScript、面向对象、字段封装、一类一文件 | src 代码、TypeScript 严格编译、架构检查 |
| 必须 Command；容器与叶子统一操作 | EditCommand/History 和 Shape/Group；类关系图 |
| 只有命令路由和图形工厂两处按名字分派 | CommandRouter、ShapeFactory；后续重构点见 doc/README |
| 分步 Git、远程仓库、最终 final 标签 | Git 提交历史和 GitHub main/final |
| doc/README 四部分齐全 | 架构方案、过程记录、一致性自查、质量保证 |
| 模块图、依赖方向、变化点 | architecture.puml、doc/README |

## 本轮复核发现及处理计划

1. `save` 无参数应严格使用**读入时的路径**。初版把显式 save 的目标记成默认路径，会使 read A / save B / save 写回 B；修正为仍写回 A。没有成功 read 的新文档需要显式提供保存路径。
2. 父节点 setter 原先公开，调用方可绕过容器维护；缩小到受保护的内部操作。容器插入和 Document.add 也应拒绝重复 id、非法索引和外部父容器，并在脱离原父节点前完成校验。
3. Session 的读接口暴露可修改的活动文档；改为返回独立快照，外部文档替换也复制输入，避免绕开历史。
4. 参数数量错误只提示 invalid number，缺少具体语法；集中参数数量校验。保留所有既定场景的原错误文本，只对参数错误补 usage。
5. help 追加六种图形的参数说明，直接复用工厂注册表，不新增类型分派表或命令。
6. 增加深层树、跨父节点恢复、多步 undo/redo、错误历史保持、原文错误信息和 save 默认路径的验收。
7. 增加类关系图、无仓库写入的 demo、GitHub Actions（Node 22/24 的同一套本地检查）。

## 保留的阶段边界与解释

- 根级 g 拒绝 ungroup，尽管一般图形软件通常允许；以 §4.2 的明确规则为准。
- 容器 scale 递归缩放几何位置与尺寸；不把线宽或文字字号增加到 CLI set 白名单。
- 跨父容器 group 按原文档遍历顺序，放在第一个目标原位置；文档没有规定跨父容器组的位置，此为明确记录的实现决策。
- help 在无文档时可用；其他需要活动文档的命令先检查文档。显示/失败命令不改变历史。
- tree 的属性采用完整 width/height 名称；成功摘要和 undo/redo 摘要不逐字复制示例叙述，包含同等操作信息。错误表中本阶段适用的内容逐字验证。
- 对于后续 box 的 cannot ungroup composite shape 情景，本阶段不制造假 box 来通过测试；未知类型仍按 §3 拒绝。
- 保留快照撤销，不做无需求驱动的差量历史重写。

本表的测试条目随本轮实现逐项落地；最终结果记入 doc/README。
