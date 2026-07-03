# Customer search

**Summary:** Let a support agent find a customer record by name or email so they can resolve a ticket without escalating.

## User Story
- **As a** support agent
- **I want to** search for a customer by name or email
- **so that** I can open their record and resolve the current ticket

## Acceptance Criteria

**AC-1: Search returns a matching customer**
- **Given** the agent is on the customer search screen
- **When** they enter a name or email and submit the search
- **Then** the matching customer record is shown within 2 seconds

**AC-2: No match found**
- **Given** the agent has submitted a search with no matching customer
- **When** the results screen renders
- **Then** an empty-state message invites them to refine the search terms

**AC-3: Results show a total match count**
- **Given** the agent has submitted a search that returns one or more matching customers
- **When** the results screen renders
- **Then** it displays the total number of matches found, alongside the results

## Definition of Done
- All acceptance criteria pass in QA
- Empty-state and match-count copy are actionable
- Analytics events verified in the dashboard
- Keyboard and screen-reader accessible; contrast ≥ WCAG AA
- Reviewed by ≥1 engineer; PM signoff after walkthrough
