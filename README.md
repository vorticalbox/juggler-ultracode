# Ultracode for Juggler

An "ultracode" mode for Juggler: the model plans, fans investigation out to
parallel sub-agents, implements in small steps, and has independent sub-agents
verify the result before reporting.

```bash
juggler ext validate .
juggler ext link .
```

Then pick **Ultracode** from the strategy switcher (Shift+Tab). For the full
effect also set the model's effort to `max` in the model picker — extensions
cannot change it.

## What it adds

| Capability | Id | What it does |
|---|---|---|
| Strategy | `ultracode` | Orchestrator brief (plan → parallel Explore/Research → implement → parallel Verify → run tests). Approvals as YOLO: every tool call is auto-approved (questions and protected deletes still ask). |
| Sub-agent tool | `Verify` | Adversarial reviewer with read tools, edit tools and `bash`, but no network. Can make the fixes it is asked for. Owns the hidden `ultracode-verify` strategy. |

## Limits (set by Juggler, not this extension)

- Explore and Research only read. Verify can edit, so parallel Verify calls should use different files.
- A delegated thread cannot delegate again (no nested fan-out), so Verify cannot hand work to other sub-agents itself. The main thread has to do that hand-off.
- Native Claude Code `Agent`/`Workflow` stay disabled by the `claudecode`
  provider; this uses Juggler's own sub-threads instead, so it works with any
  provider.
- `Verify` is offered in every strategy while the extension is enabled; disable
  the capability in Settings → Extensions if you only want it under Ultracode.
