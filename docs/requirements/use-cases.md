# Use cases

**Format:** Compact but complete. Related ADRs cited.

---

## UC-001 Customer registration
- **Actor:** Guest → Customer  
- **Goal:** Create account  
- **Preconditions:** Valid email available  
- **Trigger:** Submit registration  
- **Main:** Submit → validate → create PENDING_VERIFICATION → send verify email → acknowledge  
- **Exceptions:** Duplicate email; rate limit  
- **Rules:** FR-AUTH-001; BR-AUTH-*  
- **Security:** Rate limit; no plaintext password storage  
- **Post:** User exists pending verify  
- **AC:** User cannot fully shop as ACTIVE until verified (per policy)  
- **ADR:** 0008

## UC-002 Customer login
- **Actor:** Customer  
- **Main:** Credentials → AuthN → create customer-realm session → HttpOnly cookie  
- **Exceptions:** Bad credentials; locked; suspended  
- **ADR:** 0008

## UC-003 Admin login
- **Actor:** Staff/Admin  
- **Main:** Credentials → admin realm session (separate cookie)  
- **ADR:** 0008

## UC-004 Admin MFA
- **Actor:** Admin  
- **Preconditions:** Password OK; MFA enrolled  
- **Main:** Challenge TOTP → verify → elevate session  
- **ADR:** 0008

## UC-005 Browse catalog
- **Actor:** Guest/Customer  
- **Main:** Request categories/PLP → server returns ACTIVE products  
- **ADR:** 0010,0007

## UC-006 Search products
- **Actor:** Guest/Customer  
- **Main:** q + allow-listed filters → PG FTS/derived search → results + facets  
- **Exceptions:** Search degrade → exact id still works  
- **ADR:** 0010,0009

## UC-007 View product
- **Actor:** Guest/Customer  
- **Main:** Load PDP by id/slug → Offer effective price display  
- **ADR:** 0010,0012

## UC-008 Select SKU
- **Actor:** Guest/Customer  
- **Main:** Choose variant options → resolve SKU/Offer  
- **ADR:** 0010

## UC-009 Add to cart
- **Actor:** Guest/Customer  
- **Main:** Add Offer/SKU qty → PG cart; **no reservation**  
- **Exceptions:** Inactive offer; qty limits  
- **ADR:** 0011

## UC-010 Update cart
- **Actor:** Guest/Customer  
- **Main:** Change qty/remove → re-resolve display prices on GET  
- **ADR:** 0011,0012

## UC-011 Checkout
- **Actor:** Customer (or guest→auth per policy)  
- **Preconditions:** Cart non-empty  
- **Main:** Idempotency-Key → re-resolve Offers → calculate (0012) → reserve → create Order PENDING_PAYMENT + PaymentAttempt + outbox → respond  
- **Alt:** Price changed → inform before pay  
- **Exceptions:** Tax fail closed; currency mismatch; insufficient stock  
- **ADR:** 0011,0012

## UC-012 Reserve inventory
- **Embedded in UC-011**  
- **Post:** Reservation HELD  
- **ADR:** 0010,0011

## UC-013 Initiate payment
- **Actor:** System after checkout  
- **Main:** After commit → PaymentProvider.initiate (M-Pesa STK etc.) → INITIATED  
- **Post:** Order still PENDING_PAYMENT  
- **ADR:** 0011

## UC-014 Receive payment webhook
- **Actor:** Payment provider  
- **Main:** Verify HMAC → persist → ack → enqueue  
- **Security:** Reject unverified  
- **ADR:** 0009,0011

## UC-015 Confirm payment
- **Actor:** Worker/system  
- **Main:** Apply confirmed event → Payment CONFIRMED → Order PAID → commit reservation  
- **Exceptions:** Late after expiry → reconciliation hold  
- **ADR:** 0011

## UC-016 Create order
- **Note:** Occurs in UC-011 commit (not after pay)  
- **ADR:** 0011

## UC-017 Cancel order
- **Actor:** Customer/Admin/System  
- **Main:** Pre-dispatch cancel per BR-RET-002/0013 → release/restock + refund path if paid  
- **ADR:** 0011,0013

## UC-018 Request refund
- **Actor:** Admin/Finance (or policy)  
- **Main:** REFUND_REQUESTED from snapshot → provider → REFUND_CONFIRMED  
- **ADR:** 0011,0012

## UC-019 Apply coupon
- **Actor:** Customer at checkout  
- **Main:** Normalize code → validate server-side → apply if stacking permitted → transactional usage  
- **ADR:** 0012

## UC-020 Calculate tax
- **Actor:** System in checkout  
- **Main:** TaxCalculator → on failure abort checkout  
- **ADR:** 0012

## UC-021 Manage product
- **Actor:** Catalog manager  
- **Main:** CRUD draft → review → ACTIVE with AuthZ  
- **ADR:** 0010,0008

## UC-022 Manage inventory
- **Actor:** Inventory manager  
- **Main:** Adjustment command → movement + balance update  
- **ADR:** 0010

## UC-023 Manage pricing
- **Actor:** Catalog/pricing staff  
- **Main:** Update Offer list/sale windows; audit  
- **ADR:** 0010,0012

## UC-024 Manage promotions
- **Actor:** Marketing/Admin  
- **Main:** Configure declarative rules; no scripts  
- **ADR:** 0012

## UC-025 AI product discovery
- **Actor:** Customer  
- **Main:** Chat → API AuthZ → AI → searchProducts tool → hydrate  
- **ADR:** 0015,0010

## UC-026 AI product recommendation
- **Actor:** Customer  
- **Main:** Rules/popularity or tool-backed suggestions — not invented prices  
- **ADR:** 0015,0010

## UC-027 AI price preview
- **Actor:** Customer  
- **Main:** getOfferPrice / previewCartTotals tools only  
- **ADR:** 0015,0012

## UC-028 AI tool execution
- **Actor:** AI service on behalf of user  
- **Main:** Validate schema → re-AuthZ → domain → result  
- **Exceptions:** High-risk requires approval  
- **ADR:** 0015,0008

## UC-029 AI RAG retrieval
- **Actor:** AI service  
- **Main:** Retrieve knowledge chunks + citations; not transactional SoT  
- **ADR:** 0015

## UC-030 Webhook processing
- **Generic:** verify → persist → ack → async apply (payments/courier/notify)  
- **ADR:** 0009,0016

## UC-031 Reconciliation
- **Actor:** System job  
- **Main:** Compare provider vs platform; hold/ops on divergence  
- **ADR:** 0011,0016

## UC-032 Audit investigation
- **Actor:** Admin  
- **Main:** Query audit events by correlationId/orderId with AuthZ  
- **ADR:** 0018,0017

## UC-033 Fulfill order
- **Actor:** Ops  
- **Main:** PAID → fulfillment allocate/pick/pack/dispatch → shipment  
- **ADR:** 0013

## UC-034 Track shipment
- **Actor:** Customer  
- **Main:** Read normalized shipment status/events  
- **ADR:** 0013

## UC-035 Return request
- **Actor:** Customer  
- **Main:** Request → eligibility → APPROVED/REJECTED → inspect → restock movements → refund path  
- **ADR:** 0013

## UC-036 Merge guest cart
- **Actor:** Customer on login  
- **Main:** Merge lines; reprice; drop invalid  
- **ADR:** 0011
