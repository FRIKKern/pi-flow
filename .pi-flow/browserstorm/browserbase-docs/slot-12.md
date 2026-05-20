# n8n quickstart — Research (Browserstorm 12/20)

**Source:** [integrations/n8n/quickstart.md](https://docs.browserbase.com/integrations/n8n/quickstart.md)  
**pi-flow context:** workflow automation

---

## Summary

Key points from documentation:

- **Google**: [Google AI Studio](https://aistudio.google.com/apikey)
- **OpenAI**: [OpenAI Platform](https://platform.openai.com/api-keys)
- **Anthropic**: [Anthropic Console](https://console.anthropic.com/)
- Starting URL: `https://news.ycombinator.com`
- Instruction: `Find the top 3 stories and return their titles and URLs`
- Starting URL: `https://example.com/contact`

### Sections

**Browser options** — | Option | Type | Default | Description | | --------------- | ------- | ------- | ---------------------------------------------------------------------------------------------------------- | | Verified | boolean | `false` | Enable Verified browser sessions | | Block Ads | boolean | `true` | Block ads during browsing | | Record Session | boolean | `true` | Record the browser session for replay in t

**Session options** — | Option | Type | Default | Description | | ----------- | ------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | | Region | select | `us-west-2` | Region where the browser runs. Options: `us-west-2` (Oregon), `us-east-1` (Virginia), `eu-central-1` (Frankfurt), and `ap-southeast-1` 

**Agent options** — | Option | Type | Default | Description | | ---------------- | ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | | Max Steps | number | `20` | Maximum number of steps

**Example workflows** — **Agent: data extraction** * Starting URL: `https://news.ycombinator.com` * Instruction: `Find the top 3 stories and return their titles and URLs` **Agent: form filling (with variables)** * Starting URL: `https://example.com/contact` * Instruction: `Fill out the contact form with name %name% and email %email%, then submit` * Variables: `name = John Doe`, `email = john@example.com` **Agent: navigat

## pi-flow mapping

n8n for no-code workflows; pi-flow agentstorm replaces parallel n8n for research bursts.

---

## References

- [n8n quickstart](https://docs.browserbase.com/integrations/n8n/quickstart.md)
