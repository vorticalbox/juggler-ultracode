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
| Strategy | `ultracode` | Orchestrator brief (plan → parallel Explore/Research → implement → parallel Verify → run tests). Approvals as Default; permission toggles stay visible. |
| Sub-agent tool | `Verify` | Read-only adversarial reviewer (read tools + `bash`, no network, no edits). Runs in parallel with other read-only sub-agents. Owns the hidden `ultracode-verify` strategy. |

## Limits (set by Juggler, not this extension)

- Sub-agents only read; the main thread is the only writer, so edits are serial.
- A delegated thread cannot delegate again (no nested fan-out).
- Native Claude Code `Agent`/`Workflow` stay disabled by the `claudecode`
  provider; this uses Juggler's own sub-threads instead, so it works with any
  provider.
- `Verify` is offered in every strategy while the extension is enabled; disable
  the capability in Settings → Extensions if you only want it under Ultracode.
