# Phase 0: Payload-First Security Specification — 3eatcru Platform & Commerce Core
## Versão 7.0 — Auditoria Consolidada (18 Coleções)

## 1. Core Data & Security Invariants

1. **Zero Self-Assigned Privilege (`/users/{userId}` & `/admins/{adminId}`)**:
   - No client SDK call can ever create, update, or delete `/users/{userId}` or `/admins/{adminId}` (except bootstrapped verified Super Admins managing `/admins/{adminId}`).
   - Even on the Express backend (`authContext`), `/users/{uid}` is mathematically barred from granting `hq_admin`.
2. **No Wildcard Domain Admin Elevation**:
   - `@3eatcru.com` and `@3eatcru.com.br` domain suffixes are NOT trusted for privilege elevation. Only verified Firebase Custom Claims (`role == 'hq_admin'`) or verified (`email_verified == true`) bootstrap Super Admin identities (`3eatcru@gmail.com`, `marcelokbite@gmail.com`) + `/admins/{uid}` grant HQ access.
3. **Private ERP vs Public Marketplace Split**:
   - `/products/{productId}` (containing `costPrice`, `wholesalePrice`, `supplierId`, `minStock`, and exact `stock`) is strictly private (`isAdmin()` or authorized tenant staff).
   - `/public_catalog/{productId}` exposes ONLY sanitized Marketplace fields (`id`, `tenantId`, `name`, `category`, `price`, `image`, `availableOnline`, `inStock`, `description`), requires `availableOnline == true` on both `get` and `list` (never blanket `isSignedIn()`), and is server-written (`allow write: if false;` on client SDK).
4. **Private HQ Governance vs Public Regional Banner Split**:
   - `/hq_settings/{settingId}` (`platformCommissionRate`, `maintenanceMode`, `globalBroadcastMessage`) is strictly `isAdmin()` for both read and write — zero public reads.
   - `/public_regional/{regionId}` holds only non-sensitive Marketplace banner strings.
5. **Single Authoritative Commerce Engine & Verified Payment Settlement**:
   - Orders (`/orders/{orderId}`), payment transactions (`/payment_transactions/{txId}`), stock deductions (`/products/{productId}`), public availability (`/public_catalog/{productId}`), and financial settlements/reversals (`/financials/{finId}`) are mutated exclusively via Express Admin SDK transactions (`executeCommercialOrder` / `transitionCommercialOrderStatus` / `paymentsRouter`).
   - Client sending `status: 'completed'` alone NEVER settles an order or writes `fin-sale-*`. Immediate POS settlement requires authenticated POS staff confirming physical cash (`cashConfirmedByOperator === true`) OR a server-verified `approved` `/payment_transactions/{txId}` matching `tenantId` and `amount`.
6. **Strict Driver Assignment & Multi-Tenant Route Isolation**:
   - Drivers (`driver` role) can ONLY read or update `/orders/{orderId}` and `/delivery_routes/{routeId}` explicitly assigned to `request.auth.uid` (`driverId == request.auth.uid` with non-empty `driverId`). Unassigned orders and cross-tenant `available` routes are never exposed via blanket client reads.
7. **Zero-Cost, Query-Enforced `allow list` Rules**:
   - Every `allow list` evaluates `resource.data` directly (`availableOnline == true`, `customerId == request.auth.uid`, `request.auth.uid in resource.data.staffUids`, or `driverId == request.auth.uid`) with **zero `get()` or `exists()` calls inside `allow list`**.
8. **ACID Table Reservations & State Protection**:
   - `/reservations/{id}` and `/tables/{id}` are synchronized via `reservationsRouter`. No client can directly release a table or spoof a reservation without server validation of `acceptsReservations !== false`.

---

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return `PERMISSION_DENIED`)

1. **Payload 1 — Privilege Escalation on `/users/{uid}`**:
   `{ "uid": "attacker-1", "role": "hq_admin", "tenantId": "tenant-1" }` -> Denied (`allow write: if false` on `/users/{userId}`).
2. **Payload 2 — Cross-Tenant Hijack on `/users/{uid}`**:
   `{ "uid": "attacker-1", "role": "tenant_owner", "tenantId": "rival-tenant" }` -> Denied (`allow write: if false` on `/users/{userId}`).
3. **Payload 3 — Unverified Admin Email Spoof on `/admins/{adminId}`**:
   Token `{ email: "3eatcru@gmail.com", email_verified: false }` writing `/admins/spoof` -> Denied (`isVerified()` requires `request.auth.token.email_verified == true`).
4. **Payload 4 — Competitor Scraping Private Cost & Margin on `/products/{productId}`**:
   Unauthenticated or rival tenant calling `get` / `list` on `/products/prod-1` -> Denied (restricted to `isAdmin()` or tenant owner/staff).
5. **Payload 5 — Blanket Signed-In Scraping of Offline Items in `/public_catalog`**:
   Authenticated consumer listing `/public_catalog` where `availableOnline == false` -> Denied (`resource.data.availableOnline == true`).
6. **Payload 6 — Client-Forged Payment Approval on `/payment_transactions/{txId}`**:
   `{ "id": "tx-fake", "status": "approved", "amount": 500 }` -> Denied (`allow create, update, delete: if false` on `/payment_transactions/{txId}`).
7. **Payload 7 — Cross-Customer or Unassigned Driver Order Scraping (`/orders`)**:
   Authenticated `driver-B` reading unassigned `/orders/ord-1` (`driverId == null`) -> Denied (`driverId` must exist, be non-empty, and match `request.auth.uid`).
8. **Payload 8 — Cross-Tenant Route Inspection (`/delivery_routes/{routeId}`)**:
   Rival tenant or unassigned user calling `get` on `/delivery_routes/rt-1` with `status == 'available'` -> Denied (`driverId == request.auth.uid || isStaffInArray(existing()) || isAdmin()`).
9. **Payload 9 — Fake Financial Ledger Injection on `/financials/{finId}`**:
   Client SDK attempting to inject `{ "id": "fin-fake", "type": "sale", "amount": 999999 }` -> Denied (`allow write: if false` on client SDK; manual `sale` also blocked `403` on `/api/financials`).
10. **Payload 10 — Shadow Field Injection on `/consumers/{consumerId}`**:
    `{ "id": "uid-1", "name": "Ana", "email": "ana@test.com", "isVipAdmin": true, "updatedAt": request.time }` -> Denied by `hasOnly(['id', 'name', 'email', 'phone', 'address', 'updatedAt'])`.
11. **Payload 11 — ID Poisoning (2KB Document ID)**:
    Creating `/consumers/aaaa...2000chars` -> Denied by `isValidId()` (`size() <= 128` and regex `^[a-zA-Z0-9_\-]+$`).
12. **Payload 12 — PII Leak on `/consumers/{consumerId}` or `/drivers/{driverId}`**:
    Authenticated `user-X` attempting `get` on `/consumers/user-Y` -> Denied (`request.auth.uid == consumerId || isAdmin()`).

---

## 3. Red Team Audit Matrix (All 18 Collections)

| Collection | Identity Spoofing | State Shortcutting | Resource / Value Poisoning | PII & Query Enforcer | Status |
|---|---|---|---|---|---|
| `/admins/{adminId}` | Blocked (`isBootstrappedAdmin()`) | N/A | `isValidId` + `isValidAdminDoc` | Restricted to `isAdmin()` | PASS |
| `/users/{userId}` | Blocked (Server-only write) | N/A | Client write `false` | Owner `get` only; no blanket `list` | PASS |
| `/tenants/{tenantId}` | Blocked (Server-only write) | N/A | Client write `false` | Owner/Staff `get` only | PASS |
| `/products/{productId}` | Blocked (Server-only write) | N/A | Client write `false` | Private ERP only (zero public read) | PASS |
| `/public_catalog/{productId}` | Blocked (Server-only write) | N/A | Client write `false` | `availableOnline == true` strictly enforced | PASS |
| `/orders/{orderId}` | Blocked (Server-only write) | Locked via `CommerceEngine` | Client write `false` | `customerId == uid`, `driverId == uid`, or `uid in staffUids` | PASS |
| `/payment_transactions/{txId}` | Blocked (Server-only write) | Locked via `paymentsRouter` | Client write `false` | Creator `get` or `isAdmin()` only | PASS |
| `/tables/{tableId}` | Blocked (Server-only write) | Locked via API | Client write `false` | `uid in staffUids` | PASS |
| `/reservations/{reservationId}` | Blocked (Server-only write) | Locked via `reservationsRouter` | Client write `false` | `customerId == uid`, `uid in staffUids`, or `isAdmin()` | PASS |
| `/financials/{finId}` | Blocked (Server-only write) | Immutable ledger | Client write `false` | Admin / Server API only | PASS |
| `/delivery_routes/{routeId}` | Blocked (Server-only write) | Locked via Logistics API | Client write `false` | Assigned `driverId == uid` or `uid in staffUids` | PASS |
| `/drivers/{driverId}` | Blocked (`uid == driverId`) | Action-gated telemetry | `isValidDriverTelemetry` + `hasOnly` | Self or `isAdmin()` only | PASS |
| `/hq_settings/{settingId}` | Blocked (`isAdmin()`) | N/A | `isValidHqSetting` | Private (`isAdmin()` read/write) | PASS |
| `/public_regional/{regionId}` | Blocked (Server/Admin) | N/A | Client write `false` | Public non-sensitive banner only | PASS |
| `/plans/{planId}` | Blocked (Server/Admin) | N/A | Client write `false` | Public SaaS pricing tiers | PASS |
| `/devices/{deviceId}` | Blocked (`isAdmin()`) | N/A | Client write `false` | `isAdmin()` only | PASS |
| `/audit_logs/{logId}` | Blocked (Append-only server) | Immutable (`update/delete: false`) | Client write `false` | `isAdmin()` read only | PASS |
| `/consumers/{consumerId}` | Blocked (`uid == consumerId`) | N/A | `isValidConsumer` + `request.time` | Self `get` or `isAdmin()` | PASS |
