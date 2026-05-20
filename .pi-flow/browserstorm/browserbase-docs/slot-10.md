# Google ADK + Browserbase — Research (Browserstorm 10/20)

**Source:** [integrations/google-adk/setup.md](https://docs.browserbase.com/integrations/google-adk/setup.md)  
**pi-flow context:** ADK integration

---

## Summary

Key points from documentation:

- `keepAlive=true|false`
- `proxies=true|false`
- `verified=true|false`
- **start**: Create or reuse a Browserbase session
- **end**: Close the current Browserbase session
- **navigate**: Navigate to a URL

### Sections

**Prerequisites** — Get your Browserbase API key from the [Browserbase Dashboard](https://www.browserbase.com/overview). Then copy your API Key directly from the input. Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) for AI-powered browser automation with Stagehand. Only required if you're using the local MCP server.

**Setup methods** — **Recommended**: When using the remote hosted server, Browserbase covers the LLM costs for Gemini, the [best performing model](https://www.stagehand.dev/evals) in [Stagehand](https://www.stagehand.dev). For local development or when you need more control over the server configuration, use the STDIO transport method. When using STDIO, you'll need to provide your own Gemini API key and will incur LL

**Optional runtime query params** — You can append these query parameters to the MCP URL: * `keepAlive=true|false` * `proxies=true|false` * `verified=true|false`

**Verify installation** — Test your integration by running your agent: Monitor your browser sessions in real-time on the [Browserbase Dashboard](https://www.browserbase.com/sessions).

## pi-flow mapping

ADK path for Google-centric stacks; pi-flow has no ADK extension today.

---

## References

- [Google ADK + Browserbase](https://docs.browserbase.com/integrations/google-adk/setup.md)
