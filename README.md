# ApparelFlow ERP — Cutting Operations & Verification Terminal

A full-stack garment manufacturing system module featuring bill-of-materials recipe multipliers, role-based workflows, real-time piece count verification with traffic-light indicators, and server-enforced quality checkpoints.

---

## Getting Started

### Prerequisites
* Node.js 18+ (tested on Node.js 20+)
* npm

### Installation & Database Setup
```bash
# Install dependencies
npm install --legacy-peer-deps

# Create and synchronize the SQLite database
npx prisma db push

# Seed recipes and user accounts
npx tsx prisma/seed.ts
```

### Run the Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

### Run Automated Tests
```bash
npm test
```

---

## System Personas & Roles

| Role | Email | Password | Responsibilities |
| :--- | :--- | :--- | :--- |
| **Cutting Supervisor** | `supervisor@apparelflow.com` | `supervisor123` | Creates batches from recipes, logs fabric roll and yardage, tracks active production orders. |
| **Cutting Verifier** | `verifier@apparelflow.com` | `verifier123` | Performs physical piece counts per component, evaluates match/excess/shortage, signs off or rejects. |
| **Sewing Supervisor** | `sewing@apparelflow.com` | `sewing123` | Views verified batches ready on assembly floor, inspects verifier stamps and fabric wastage rate, initiates assembly. |

---

## Pre-Configured Garment Recipes

### 1. Casual Blouse (`REC-BL01`)
* Category: Blouse | Std Fabric: 1.8 yds/piece | Wastage Threshold: 5.0%
* Front Body Panel (1 pcs / garment)
* Back Body Panel (1 pcs / garment)
* Sleeves Left & Right (2 pcs / garment)
* Collar & Stand (1 pcs / garment)
* Sleeve Cuffs (2 pcs / garment)

### 2. Crop Top (`REC-CT02`)
* Category: Crop Top | Std Fabric: 1.1 yds/piece | Wastage Threshold: 8.0%
* Front Chest Panel (1 pcs / garment)
* Back Support Panel (1 pcs / garment)
* Neck Binding Strip (1 pcs / garment)
* Hem Elastic Casing (1 pcs / garment)
* Side Strap Accents (2 pcs / garment)

---

## Verification Logic

* **GREEN (MATCH):** Physical count matches expected count.
* **YELLOW (EXCESS):** Physical count is higher than expected. Surplus pieces recorded.
* **RED (SHORTAGE):** Physical count is lower than expected. Approval action is disabled on the client and rejected with HTTP 422 on the API. Batch must be rejected with a reason note.

---

## Server Validation & Security

1. **Role Access Control:** Server actions and API routes verify session roles. Verifier approval endpoints return `403 Forbidden` if called by other roles.
2. **Shortage Guard:** `/api/orders/[id]/approve` checks database records to ensure zero RED items before approving.
3. **Queue Query Isolation:** The sewing queue endpoint strictly filters for `VERIFIED` and `IN_SEWING` statuses.
4. **Session-Derived Attribution:** Verifier identity and timestamps are extracted directly from the authenticated server session.

---

## Automated Test Coverage

Tests in `tests/approval.test.ts` verify:
* Successful batch approval with all GREEN components.
* Blocking approval when any component is RED (shortage).
* Rejection note requirement validation.
* Role-based access restrictions.
* Database query isolation for the sewing queue.
