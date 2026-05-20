# OpenClaw setup — Research (Browserstorm 7/20)

**Source:** [integrations/openclaw/setup.md](https://docs.browserbase.com/integrations/openclaw/setup.md)  
**pi-flow context:** OpenClaw browser plugin

---

## Summary

### Sections

**Recommended: built-in browser plugin** — This is the preferred path because it keeps you inside OpenClaw's first-class browser workflow while moving execution onto Browserbase infrastructure. Create a Browserbase account, then copy your API key from the [Overview dashboard](https://www.browserbase.com/overview). Add a Browserbase-backed profile in `~/.openclaw/openclaw.json`: Restart OpenClaw so the browser service picks up the new Brows

**Alternative: Browse CLI** — If your workflow is centered on `browse` commands instead of OpenClaw's native browser commands, use the Browse CLI. Example commands: For the full CLI workflow reference, see the [Browse CLI guide](/integrations/skills/browserbase-cli).

## pi-flow mapping

OpenClaw uses built-in browser plugin or Browse CLI; orthogonal to pi-flow cmux routing.

---

## References

- [OpenClaw setup](https://docs.browserbase.com/integrations/openclaw/setup.md)
