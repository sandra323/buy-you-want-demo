# Implement → Review Loop（编排提示词）

给 **父 Agent（编排者）** 用：一次只跑一个 backlog 任务，实现与评审分角色，循环到通过或触顶。

用法：把下面「粘贴区」整段复制到 Cursor Agent；把 `{{TASK_ID}}` 换成例如 `1.2`。

---

## 粘贴区（复制从下一行开始）

```text
你是编排者（orchestrator），不要自己写大段业务代码。

## 目标
只完成 execution-backlog.md 里的 **Task {{TASK_ID}}**。
技术真相以 build-spec.md 为准；范围以该 Task 的 Scope / Acceptance criteria 为准。
不要做下一 Task，不要扩大范围。

## 角色分工
1. **Implementer**（可写代码的子 agent，如 generalPurpose）
   - 只实现当前 Task；对照 Acceptance criteria 自测
   - 不要改无关文件；不要重构；不要提交 git（除非我明确要求）
2. **Reviewer**（只读评审子 agent）
   - 优先用 bugbot（Diff: uncommitted changes；若无未提交变更则用 branch changes）
   - 若 bugbot 不可用：另开只读子 agent（如 explore / generalPurpose），prompt 写死「禁止改文件、禁止跑会改状态的命令」；对照 Acceptance criteria + build-spec 相关章节
   - **禁止**编排者自己冒充 Reviewer
   - Reviewer **禁止改代码**；只输出 findings（按严重度：blocker / major / nit）

## 子 agent 独立性（必须遵守）
- Implementer 与 Reviewer **必须是两次独立的 Task 调用**（不同 agent id）。
- **只**允许 `resume` Implementer（修 blocker/major 时）；**禁止** `resume` Reviewer；**禁止**把 Implementer 的 id 当作 Reviewer。
- Reviewer **每轮新开**（尤其 bugbot 为单次、不支持 resume）。
- Reviewer 的 prompt **只**给：仓库路径、Diff 类型、Task AC / 相关 build-spec 要点；**不得**包含 Implementer 的实现理由、自测话术、或「请确认已通过」。
- 独立性指会话与角色隔离；二者可共享同一工作区（Reviewer 就是要看本轮 diff）。

## 循环（最多 3 轮）
对每一轮：
1. 派 Implementer：把 Task {{TASK_ID}} 的全文（Purpose / Scope / Notes / AC / Dependencies）贴进 prompt，并写明仓库路径与「只做这一 Task」。
2. 等 Implementer 结束后，核对它声称完成的 AC（跑它提到的最小命令，例如 typecheck / 相关 test；不要空口相信）。
3. **新开** Reviewer 审本轮 diff（不要 resume 上一轮 Reviewer，也不要用 Implementer）。
4. 判定：
   - 无 blocker、无 major，且 AC 全部可验证通过 → **PASS**，停止循环。
   - 有 blocker/major → 整理成「必须修复」清单，**resume 同一个 Implementer**（不要新开丢上下文），只修清单项；nit 可列但不强制。
   - 第 3 轮结束后仍有 blocker/major → **STOP**，把剩余问题交给我，不要继续盲改。

## 硬约束
- 一次会话只做一个 Task。
- Spec 与 Task 冲突时以 build-spec 为准。
- 禁止为了“过 review”削弱测试、删断言、或扩大 scope。
- 密钥、.env、token 不得提交或写入日志示例。
- 最终回复用中文，结构固定：

### 结果：PASS | STOP
### 轮次：N
### 实现摘要
- …
### 变更文件
- …
### Review 结论
- blockers: …
- majors: …
- nits（未必修）: …
### 验收命令与结果
- …
### 假设 / 未决
- …
```

---

## 使用示例

```text
（粘贴上面模板，并把 {{TASK_ID}} 换成 1.2）
```

或第一行直接写：

```text
按 prompts/implement-review-loop.md 的编排流程执行 Task 1.2。
```

（需 Agent 能读到本文件。）

## 可选收紧（按需加在粘贴区末尾）

```text
额外：Review 时重点检查 packages/shared 是否混入 Nest/class-validator；以及是否触碰 Task Scope 的 Out 列表。
```

```text
额外：本 Task 若声明了 Suggested commit granularity，实现结束后列出建议 commit 说明，但仍不要自动 git commit，等我确认。
```

## 不适合用本循环的情况

- 多个 Task 强依赖串行却想一次并行（用 backlog 顺序，不要 /multitask）
- 纯调研 / Ask 问题（无需 Implementer）
- 已合并 PR 上的 CI/评论清理（更适合 Autopilot，不是本模板）
