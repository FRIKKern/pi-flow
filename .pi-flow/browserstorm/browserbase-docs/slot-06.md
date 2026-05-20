# Hermes Agent + Browse CLI — Research (Browserstorm 6/20)

**Source:** [integrations/hermes-agent/setup.md](https://docs.browserbase.com/integrations/hermes-agent/setup.md)  
**pi-flow context:** Alternative agent host

---

## Summary

### Sections

**Recommended: Hermes Browserbase cloud mode** — This is the preferred path because Hermes already supports Browserbase as a built-in cloud browser provider. Create a Browserbase account, then copy your API key from the [Overview dashboard](https://www.browserbase.com/overview). Add the following to `~/.hermes/.env`: If you have not enabled browser tools yet, run: Then enable **Browser Automation** in the Hermes setup flow. Once configured, Herm

**Helpful Browserbase settings** — Hermes also supports Browserbase-specific environment variables for common cloud browser behavior:

**Alternative: Browse CLI** — If your workflow is centered on `browse` commands instead of Hermes' native browser tools, use the Browse CLI. Example commands: For the full CLI workflow reference, see the [Browse CLI guide](/integrations/skills/browserbase-cli).

## pi-flow mapping

Hermes is an alternative host — pi-flow uses Pi + pi-mcp-adapter, not Hermes.

---

## References

- [Hermes Agent + Browse CLI](https://docs.browserbase.com/integrations/hermes-agent/setup.md)
