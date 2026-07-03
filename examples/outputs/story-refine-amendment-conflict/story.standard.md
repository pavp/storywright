# Guest checkout

**Summary:** Let a shopper complete checkout — signed in or as a guest — so a login wall never costs the store a sale.

## User Story
- **As a** shopper
- **I want to** complete checkout
- **so that** I receive my order without being forced to create an account

## Acceptance Criteria

**AC-1: Checkout allows guests**
- **Given** the shopper has items in the cart and has not signed in
- **When** they proceed to checkout
- **Then** they can complete the purchase as a guest, supplying only shipping and payment details

**AC-2: Signed-in shopper skips redundant entry**
- **Given** the shopper is signed in with a saved address and payment method
- **When** they proceed to checkout
- **Then** the saved details are pre-filled and they can complete the purchase without re-entering them

## Definition of Done
- All acceptance criteria pass in QA
- Guest and signed-in checkout paths both reviewed by PM
- Analytics events verified in the dashboard
- Keyboard and screen-reader accessible; contrast ≥ WCAG AA
- Reviewed by ≥1 engineer; PM signoff after walkthrough
