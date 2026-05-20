# pi-acp — Research (Browserstorm 9/20)

**Package:** [pi-acp](https://www.npmjs.com/package/pi-acp)  
**Repository:** [svkozak/pi-acp](https://github.com/svkozak/pi-acp)  
**pi-flow context:** pi-flow targets **terminal / cmux / paperflow** boss sessions, not editor ACP clients

---

## Summary

`pi-acp` (**0.0.27**) bridges **Agent Client Protocol (ACP)** JSON-RPC over stdio between an editor (e.g. **Zed**) and `pi --mode rpc`. It streams assistant output, maps tool calls (with structured `edit` diffs), and persists session mappings at `~/.pi/pi-acp/session-map.json`.

**Recommendation:** **Skip as a pi-flow dependency.** Use only when operators want Zed (or another ACP client) as the primary Pi UI — orthogonal to paperflow, agentstorm, and Browserbase researcher routing.

---

## Architecture

```text
ACP client (Zed)  ←stdio→  pi-acp  ←spawns→  pi --mode rpc
```

| Feature | Notes |
|---------|--------|
| Streaming | `agent_message_chunk` |
| Tools | `tool_call` / `tool_call_update`; file locations for Zed |
| Sessions | Pi: `~/.pi/agent/sessions/`; ACP map: `~/.pi/pi-acp/session-map.json` |
| Skills | `/skill:name` when enabled in Pi settings |
| Prerequisites | Node **22+**, `pi` on PATH, `@earendil-works/pi-coding-agent` |

---

## Fit for pi-flow

| Use case | pi-acp |
|----------|--------|
| cmux + paperflow + `/pf-storm` | **No** |
| Zed-driven Pi with pi-flow package installed | **Optional** (user configures `agent_servers`) |
| Bundled in `package.json` | **No** |

---

## Recommendation

| Verdict | Action |
|---------|--------|
| **pi-flow** | Do not add to dependencies |
| **If used alongside pi-flow** | Pin `pi-acp@0.0.27` + `@earendil-works/pi-coding-agent@0.75.3` |

---

## References

- [ACP introduction](https://agentclientprotocol.com/overview/introduction)
- [pi-acp](https://github.com/svkozak/pi-acp)
