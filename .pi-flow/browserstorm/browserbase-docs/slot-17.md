# Stripe agentic payments — Research (Browserstorm 17/20)

**Source:** [integrations/stripe/quickstart.md](https://docs.browserbase.com/integrations/stripe/quickstart.md)  
**pi-flow context:** virtual cards

---

## Summary

Key points from documentation:

- Stripe [API key](https://dashboard.stripe.com/apikeys)
- Browserbase [API key](https://browserbase.com/settings/)
- (Optional) LLM API key for [Stagehand](https://www.stagehand.dev/)
- Create multiple virtual cards for different departments or spending categories
- Integrate with expense management systems
- Set up automated subscription payments

### Sections

**1. Set up your environment** — Install the required dependencies and set up your API keys. Create a .env file with your API keys (securely store keys for Stripe, Browserbase, and optional AI models for Stagehand): * Stripe [API key](https://dashboard.stripe.com/apikeys) * Browserbase [API key](https://browserbase.com/settings/) * (Optional) LLM API key for [Stagehand](https://www.stagehand.dev/)

**2. Create a Stripe cardholder** — You must create a cardholder before issuing virtual cards. The cardholder will have a verified billing address and be eligible to receive virtual cards. Save the cardholder ID from the console output for the next step.

**3. Create a virtual card** — Once you have a cardholder, you can create a virtual card under their name. This step generates a virtual card with a predefined spending limit. Stripe lets you customize the card's spending controls, including daily, monthly, or per-transaction limits. Find more information on spending controls in the [Stripe docs](https://docs.stripe.com/issuing/controls/spending-controls). This function returns

**4. Retrieve virtual card details** — After creating a virtual card, you'll need to retrieve its details (card number, expiration date, and CVC) to use it for transactions. You can use the returned data to automatically enter the card details when needed.

## pi-flow mapping

Stripe virtual cards for agent checkout; optional alongside Browserbase sessions.

---

## References

- [Stripe agentic payments](https://docs.browserbase.com/integrations/stripe/quickstart.md)
