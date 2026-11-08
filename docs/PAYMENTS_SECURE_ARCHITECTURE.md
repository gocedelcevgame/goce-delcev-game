# Production payments: required architecture

The browser app is not a payment authority. NEVER store merchant API keys, webhook secrets or verified entitlements in public GitHub source.

1. Adult opens a merchant-hosted checkout (provider approval and local availability required).
2. Backend creates an order with a random session id, price, currency, title and server-assigned product id.
3. Provider sends webhook to HTTPS backend. Verify the signed event using server-only secret; check event type, product, amount, currency, unique order, payment status and refund status.
4. Server writes a single-use or revocable entitlement to a secure datastore; associate with minimal personally identifiable data.
5. App requests entitlement from backend, which verifies authenticated session. Never trust `localStorage`, a SHA-256 hash exposed in public JavaScript or query strings for payment evidence.
6. Provide receipts, refunds, support, privacy controls and parental-consent safeguards per applicable laws.
7. Until backend is operating, contact details can be shown but **no working purchase is claimed**.

Configuration is intentionally unfilled. Do not put tokens or secrets in this repository.
