# x402 pay-per-use sessions — Research (Browserstorm 14/20)

**Source:** [integrations/x402/quickstart.md](https://docs.browserbase.com/integrations/x402/quickstart.md)  
**pi-flow context:** crypto pay-per-session

---

## Summary

### Sections

**Quick start** — Run the following with your wallet's private key (requires USDC on Base):

**Create session** — Creates a new browser session with prepaid time. **Request Body:** When you first make a request, you'll receive a 402 Payment Required response with payment details: After sending the payment header, you'll receive your session details:

**Get session status** — Check the status of an active session. **Response:**

**Extend session** — Add more time to an active session. **Request Body:** Extending a session requires another x402 payment for the additional time.

## pi-flow mapping

x402 = crypto pay-per-session without API keys; niche vs standard `browserbase.env`.

---

## References

- [x402 pay-per-use sessions](https://docs.browserbase.com/integrations/x402/quickstart.md)
