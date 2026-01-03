# LeadFlow Pro: 1-Year Development Plan
## Exclusive Lead Generation Platform (Frontend Demo with Mock Backend)

> **Approach:** High-Fidelity HTML/CSS/JS frontend, "Virtual" backend via Mock API layer.
> **Goal:** Create a production-quality "functioning" demo that can be deployed as a static site, but architected to swap in a real backend later.

---

## Core Principles

1.  **Frontend-Only Deployment** - Deploys as a static site (HTML/JS/CSS).
2.  **Backend-Ready Architecture** - All data access via `api.js` abstraction.
    - *Now:* `api.js` returns mock data (Promises + `setTimeout`).
    - *Later:* `api.js` fetches from real REST endpoints.
3.  **Premium Aesthetics** - "100M Dollar App" look (Glassmorphism, mobile-first).
4.  **CLI-Testable (Simulated)** - We can still test scenarios by calling the JS functions in Node.
5.  **Mobile-First** - 100% responsive, optimized for touch.

---

## Repository Structure

```
leadflow-pro/
|
|-- frontend/
|     |-- assets/                     # Images, fonts, icons
|     |-- mobile/                     # Specific mobile app assets/manifest
|     |
|     |-- public/                     # Public-facing pages
|     |     |-- index.html            # Landing / Marketplace
|     |     |-- request.html          # Intake Wizard
|     |     |-- chat.html             # Chat Interface
|     |
|     |-- provider/                   # Provider Portal
|     |     |-- index.html            # Dashboard
|     |     |-- leads.html            # Lead Inbox
|     |     |-- lead-detail.html      # Single Lead View
|     |     |-- calendar.html         # Availability
|     |
|     |-- admin/                      # Admin Console
|     |     |-- index.html
|     |
|     |-- css/
|     |     |-- design-system.css     # The "Premium" Theme
|     |     |-- components.css        # Cards, Buttons, Inputs
|     |     |-- layout.css            # Grid, Flex, responsiveness
|     |     |-- animations.css        # Transitions
|     |
|     |-- js/
|     |     |-- api/
|     |     |     |-- client.js       # The Mock API Client
|     |     |     |-- mock-data.js    # Fake DB (Territories, Users)
|     |     |-- services/
|     |     |     |-- auth.js         # Auth Logic
|     |     |     |-- leads.js        # Lead Management
|     |     |     |-- chat.js         # Chatbot Logic
|     |     |-- ui/
|     |     |     |-- renderer.js     # UI Helper functions
|     |     |     |-- router.js       # Simple client-side routing
```

---

## Phase 1: Foundation & "Premium" Shell (Weeks 1-2)
### Goal: The "Wow" Factor First

**1. Design System (`css/design-system.css`)**
-   **Variables**: HSL colors, flexible spacing units.
-   **Typography**: Inter (Google Fonts), fluid type scale.
-   **Glassmorphism**: Backdrop-filter utilities.
-   **Dark Mode**: Default premium dark theme.

**2. Mock Backend Layer (`js/api/client.js`)**
-   Implement `MockClient` class.
-   Methods: `login()`, `register()`, `getUser()`.
-   **Simulation**: Random 200-800ms delay on all calls.

**3. Landing Site (`index.html`)**
-   Hero section: "Find the Exclusive Pro for Your Service".
-   Category grid: High-quality images/icons.
-   Responsive navigation.

**Review Checklist:**
-   [ ] Site loads perfectly on mobile (320px width).
-   [ ] `MockClient` returns data to console.
-   [ ] Design looks premium (no default browser styles).

---

## Phase 2: Interactive Intake & Chat (Weeks 3-4)
### Goal: Capture the Lead

**1. Chat Interface (`chat.html`)**
-   Build a "WhatsApp-style" chat UI.
-   Implement `ChatService`:
    -   Scripted flow: "What do you need?" -> "Location?" -> "Details?".
    -   Store transcript in `sessionStorage`.

**2. Intake Wizard (`request.html`)**
-   Multi-step form with progress bar.
-   "Fake" file upload (display preview, store base64 in mock DB).

**3. Data Persistence**
-   Use `localStorage` to save submitted leads so they appear in the dashboard later.

**Review Checklist:**
-   [ ] Chat feels natural (typing indicators).
-   [ ] Forms validate inputs.
-   [ ] Submitting a lead saves it to local "database".

---

## Phase 3: Provider Experience (Weeks 5-6)
### Goal: The "Client" View

**1. Provider Dashboard (`provider/index.html`)**
-   **Stats Cards**: "5 New Leads", "80% Response Rate".
-   **Charts**: CSS-based bar charts or Chart.js.

**2. Lead Inbox (`provider/leads.html`)**
-   List view of leads submitted in Phase 2.
-   Status badges (New, Contacted, Won).

**3. Action Simulation**
-   "Accept Lead" button changes status to "Accepted" in mock DB.
-   "Call Customer" button triggers `tel:` link and updates log.

**Review Checklist:**
-   [ ] Data flows from Consumer -> Provider (via localStorage).
-   [ ] Dashboard looks like a SaaS product.
-   [ ] Mobile view for providers (on-the-go).

---

## Phase 4: Mock Admin & Polish (Week 7-8)
### Goal: Show the "Brain"

**1. Admin Console (`admin/index.html`)**
-   Map view (static image or Leaflet.js) showing "Territories".
-   List of all providers.

**2. Animation Polish**
-   Page transitions.
-   Button hover states.
-   Loading skeletons while `MockClient` "fetches" data.

**Review Checklist:**
-   [ ] Full demo walk-through works without errors.
-   [ ] Code structure is clean enough to swap `js/api/client.js` with real fetch calls.

---

## Future: Moving to Backend
*(How we will migrate later)*
1. Replace `js/api/mock-data.js` with a PostgreSQL DB.
2. Rewrite `js/api/client.js` to use `fetch('https://api.leadflow.com/...')`.
3. The rest of the frontend (UI, Services) remains **unchanged**.

---

*Ready for Phase 1.*
