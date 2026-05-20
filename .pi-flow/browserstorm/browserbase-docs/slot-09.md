# Cost optimization — Research (Browserstorm 9/20)

**Source:** [optimizations/cost/cost-optimization.md](https://docs.browserbase.com/optimizations/cost/cost-optimization.md)  
**pi-flow context:** agentstorm billing

---

## Summary

Key points from documentation:

- Store the session ID from your initial session creation
- Use the `sessionId` query parameter when connecting to specify the existing session
- Continue using the same session for similar workloads
- **No minimum runtime waste**: Functions only bill for actual execution time
- **Zero infrastructure overhead**: No session management or keep-alive costs
- **Automatic cleanup**: Sessions are automatically terminated after function completion

### Sections

**Reusing sessions** — To optimize costs, consider reusing browser sessions since there's a one-minute minimum billing period for each session creation. For short tasks, reusing sessions helps avoid multiple minimum charges. For longer workflows, you can disconnect and reconnect to the same session as needed, maintaining efficiency while managing resource usage. To reuse a session: * Store the session ID from your initi

**Serverless execution model** — For short-lived, event-driven automations, [Functions](/platform/runtime/overview) provide a cost-effective alternative to manually managing sessions: * **No minimum runtime waste**: Functions only bill for actual execution time * **Zero infrastructure overhead**: No session management or keep-alive costs * **Automatic cleanup**: Sessions are automatically terminated after function completion * **

**Proxy optimization** — Proxy usage can impact costs. Implement these strategies to minimize proxy-related expenses:

**Selective proxy usage** — Proxies are a powerful tool if you need to access geo-restricted content, have load balancing requirements, or need anonymity, but if those aren't necessary, avoiding proxies saves on costs.&#x20; You can also implement domain-specific proxy routing. For more information, see [Proxy Configuration](/platform/identity/proxies#proxies-routing-rules).

## pi-flow mapping

1-minute minimum per session affects storm cost; close sessions promptly; see slot-08 concurrency.

---

## References

- [Cost optimization](https://docs.browserbase.com/optimizations/cost/cost-optimization.md)
