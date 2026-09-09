# P17 — Subscription Billing & SaaS Plan Management Platform

## 1. Project Overview
This project is a backend API for a SaaS Subscription Billing platform. It enables dynamic plan creation, subscription management, mid-cycle plan changes, and role-based access control for different system actors.

**Note:** This repository currently contains the **Sprint 1 / Member 1 implementation**.

---

## 2. Member 1 — Completed Modules
The following modules for Sprint 1 have been **COMPLETED**:
- ✅ User Registration & Authentication
- ✅ Subscription Plan Management
- ✅ Subscription Creation Workflow
- ✅ Plan Upgrade/Downgrade Logic

---

## 3. Implemented Features
The following features are fully implemented and verified in the codebase:
- Customer registration (defaults to `Customer` role)
- Customer login using JSON Web Tokens (JWT)
- Secure password hashing using `bcrypt`
- `Billing Admin` role support
- Role-based route authorization
- Plan creation and updating by `Billing Admin`
- Customers can only view active plans
- Subscription creation workflow
- Server-side generation of subscription billing periods (monthly/yearly)
- Prevention of duplicate active subscriptions for the same customer
- Subscription ownership protection
- Upgrade/downgrade/change-plan workflow
- Active target-plan validation during subscription changes
- Billing-period preservation during mid-cycle plan changes
- Application-level simulated proration logic (calculates proportional adjustments and records them as notes)
- Centralized JSON error handling
- Incoming request validation (via `express-validator`)
- MongoDB persistence via `mongoose`

---

## 4. API Endpoints

### Authentication
- `POST /api/auth/register`
  - **Auth Required:** No
  - **Allowed Role:** Public (creates `Customer`)
  - **Purpose:** Register a new customer account.
- `POST /api/auth/login`
  - **Auth Required:** No
  - **Allowed Role:** Public
  - **Purpose:** Authenticate and receive a JWT.
- `GET /api/auth/me`
  - **Auth Required:** Yes
  - **Allowed Role:** Any authenticated user
  - **Purpose:** Retrieve the currently logged-in user's profile.

### Plans
- `GET /api/plans`
  - **Auth Required:** Yes
  - **Allowed Role:** Any authenticated user (Customers see active plans, Admins see all)
  - **Purpose:** Retrieve available subscription plans.
- `POST /api/plans`
  - **Auth Required:** Yes
  - **Allowed Role:** `Billing Admin`
  - **Purpose:** Create a new subscription plan.
- `PUT /api/plans/:id`
  - **Auth Required:** Yes
  - **Allowed Role:** `Billing Admin`
  - **Purpose:** Update a subscription plan (including activating/deactivating via `isActive`).

### Subscriptions
- `POST /api/subscriptions`
  - **Auth Required:** Yes
  - **Allowed Role:** `Customer`
  - **Purpose:** Create a new subscription for an active plan.
- `PUT /api/subscriptions/:id/change-plan`
  - **Auth Required:** Yes
  - **Allowed Role:** `Customer`
  - **Purpose:** Change an active subscription to a new plan (upgrade/downgrade).
- `PUT /api/subscriptions/:id/cancel`
  - **Auth Required:** Yes
  - **Allowed Role:** Any authenticated user (Customers can only cancel their own)
  - **Purpose:** Cancel an active subscription. Access remains valid until the `currentPeriodEnd` (grace period). Does not delete the document.
- `POST /api/subscriptions/:id/apply-coupon`
  - **Auth Required:** Yes
  - **Allowed Role:** `Customer`
  - **Purpose:** Apply an active coupon to a subscription to discount the generated invoices.

### Usage Metering
- `POST /api/usage`
  - **Auth Required:** Yes
  - **Allowed Role:** Any authenticated user
  - **Purpose:** Log a usage event for a subscription.
- `GET /api/usage/:subscriptionId`
  - **Auth Required:** Yes
  - **Allowed Role:** Any authenticated user (Customers can only view their own)
  - **Purpose:** Retrieve usage records for a specific subscription.

### Invoices
- `POST /api/invoices/generate`
  - **Auth Required:** Yes
  - **Allowed Role:** `Billing Admin`
  - **Purpose:** Generate an invoice for a given subscription's current billing period, including base plan price and metered usage. Prevents duplicates per billing period.
- `PUT /api/invoices/:id/pay`
  - **Auth Required:** Yes
  - **Allowed Role:** Any authenticated user
  - **Purpose:** Transition invoice status. A successful payment transitions `pending`/`failed` to `paid` and records `paidAt`. A failed payment transitions to `failed` and increments `retryCount`.
- `POST /api/invoices/:id/retry`
  - **Auth Required:** Yes
  - **Allowed Role:** `Billing Admin`
  - **Purpose:** Retry payment for a failed invoice. Simulates dunning workflow by incrementing `retryCount`. If `retryCount` exceeds 3, the associated subscription is transitioned to `suspended`.

### Customers
- `GET /api/customers/:id/dashboard`
  - **Auth Required:** Yes
  - **Allowed Role:** Any authenticated user (Customers can only view their own)
  - **Purpose:** Aggregate current plan, latest usage summary, and invoice history into a single response.

### Admin
- `GET /api/admin/reports/revenue`
  - **Auth Required:** Yes
  - **Allowed Role:** `Billing Admin`
  - **Purpose:** Generate revenue reports for the current month.
  - **Formulas Used:**
    - **MRR (Monthly Recurring Revenue):** Sum of `plan.price` for all active monthly subscriptions + sum of `plan.price / 12` for all active yearly subscriptions.
    - **Churn Rate:** `(Cancelled subscriptions within the period) / (Active subscriptions at the start of the period) * 100`.

---

## 5. Database Models

### User
Stores user accounts.
- `name` (String)
- `email` (String, Unique)
- `passwordHash` (String)
- `role` (String, Enum: `['Customer', 'Billing Admin']`)
- `isActive` (Boolean)

### Plan
Stores the SaaS subscription tiers.
- `name` (String, Unique Index)
- `price` (Number, Min 0)
- `billingCycle` (String, Enum: `['monthly', 'yearly']`)
- `featureLimits` (Mixed Object)
- `isActive` (Boolean)

### Subscription
Stores active customer subscriptions and tracks plan changes.
- `customerId` (ObjectId ref User, Indexed)
- `planId` (ObjectId ref Plan)
- `status` (String, Enum: `['active']`)
- `currentPeriodStart` (Date)
- `currentPeriodEnd` (Date)
- `prorationNotes` (Array of Strings)

### UsageRecord
Stores metered usage events for a subscription.
- `subscriptionId` (ObjectId ref Subscription, Indexed)
- `metric` (String)
- `quantity` (Number, Min 0)
- `periodStart` (Date)
- `periodEnd` (Date)

### Invoice
Stores generated invoices for subscription billing periods.
- `subscriptionId` (ObjectId ref Subscription, Indexed)
- `amount` (Number, Min 0)
- `status` (String, Enum: `['pending', 'paid', 'failed']`)
- `periodStart` (Date)
- `periodEnd` (Date)
- `dueDate` (Date)
- `paidAt` (Date)
- `retryCount` (Number)

### Coupon
Stores reusable discount coupons for subscriptions.
- `code` (String, Unique)
- `type` (String, Enum: `['percentage', 'flat']`)
- `value` (Number, Min 0)
- `expiryDate` (Date)
- `active` (Boolean)

---

## 6. Testing & Verification

The following tests have been successfully verified against the implementation. 

| Test Case | Status |
| :--- | :---: |
| Customer registration | **PASS** |
| Customer login/JWT authentication | **PASS** |
| Billing Admin login | **PASS** |
| Billing Admin plan creation | **PASS** |
| Customer viewing active plans | **PASS** |
| Customer attempting to create a plan (rejected with 403) | **PASS** |
| Subscription creation | **PASS** |
| Duplicate active subscription prevention | **PASS** |
| Plan upgrade/change | **PASS** |
| Plan downgrade/change workflow (implemented via change-plan logic) | *Implemented but not separately tested* |
| Subscription billing period preservation during plan change | **PASS** |
| Proration calculation/note generation | **PASS** |
| Inactive target plan protection | **PASS** |
| Subscription ownership protection between different customers | **PASS** |
| Plan deactivation through admin update | **PASS** |
| MongoDB Atlas connection | **PASS** |
| Server startup | **PASS** |

---

## 7. Example Request Flow
1. **Register:** User calls `POST /api/auth/register` to create a `Customer` account.
2. **Login:** User calls `POST /api/auth/login` and receives a Bearer JWT.
3. **View Plans:** User attaches the JWT to `GET /api/plans` to view active SaaS plans.
4. **Create Subscription:** User calls `POST /api/subscriptions` with a chosen `planId`.
5. **Change Plan:** User decides to upgrade/downgrade mid-cycle by calling `PUT /api/subscriptions/:id/change-plan`, generating a proration note on the backend.

---

## 8. Environment Variables
The application requires a `.env` file at the project root based on `.env.example`:

```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_random_secret
JWT_EXPIRES_IN=1d
```
> **Warning:** Never commit your `.env` file to version control. Keep your `MONGODB_URI` and `JWT_SECRET` completely secure.

---

## 9. Setup & Installation

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   Create a `.env` file in the root directory and populate it according to the `.env.example` structure.

3. **(Optional) Seed a Billing Admin:**
   If you need a testing admin account locally, set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in your environment and run:
   ```bash
   node scripts/seedAdmin.js
   ```

4. **Start the Server:**
   ```bash
   npm start
   # or for development with nodemon:
   npm run dev
   ```

---

## 10. Project Structure
- `config/` - Database connection and configuration (`db.js`)
- `controllers/` - Route logic and business rules
- `middleware/` - Express middlewares (Auth & Error Handling)
- `models/` - Mongoose database schemas
- `routes/` - Express route definitions
- `scripts/` - Database seeding/utility scripts (`seedAdmin.js`)
- `utils/` - Shared helper functions
- `validators/` - Input validation rules (`express-validator`)
- `server.js` - Main application entry point

---

## 11. Current Status

**MEMBER 1 / SPRINT 1 STATUS: COMPLETED**

- [x] User Registration & Authentication
- [x] Subscription Plan Management
- [x] Subscription Creation Workflow
- [x] Plan Upgrade/Downgrade Logic
- [x] Usage Metering Records (Module 1)
- [x] Invoice Generation Engine (Module 2)
- [x] Payment Status Tracking (Module 3)
- [x] Subscription Cancellation & Grace Period (Module 4)
- [x] Coupon/Discount Application (Module 5)
- [x] Customer Billing Dashboard (Module 6)
- [x] Dunning/Failed Payment Workflow (Module 7)
- [x] Admin Revenue Reports (Module 8)
- [x] Role-Based Access Control Audit (Module 9)

> **Note:** Sprint 2 (Invoicing, Payments, Cancellation) and Sprint 3 (Coupons, Dashboards, Admin Reports) are currently being implemented.

---

## 12. Notes for Teammates
- **Do not overwrite authentication:** Future members should build their work on top of the existing authentication, plans, and subscriptions implementation rather than replacing it.
- **Workflow:** When contributing to future sprints, please use feature branches and submit pull requests to prevent conflicts with the established Sprint 1 foundation.

---

## 13. Security Notes
- All passwords are cryptographically hashed using `bcrypt` before storage.
- JSON Web Tokens (JWT) are used for stateless authentication and role verification.
- Role-based authorization (`Customer` vs `Billing Admin`) is enforced strictly at the route level.
- The `.env` file is excluded from Git to prevent accidental leakage of secrets.

---

## 14. RBAC Audit Trail

| Endpoint | Allowed Roles | Enforcement Mechanism | Rejection Behavior |
| :--- | :--- | :--- | :--- |
| `POST /api/auth/register` | Public | None | N/A |
| `POST /api/auth/login` | Public | None | N/A |
| `GET /api/auth/me` | Customer, Billing Admin | `authenticate` | 401 if missing/invalid |
| `GET /api/plans` | Customer, Billing Admin | `authenticate` (Controller restricts inactive for Customers) | 401 if missing/invalid |
| `POST /api/plans` | Billing Admin | `authorize('Billing Admin')` | 403 Forbidden |
| `PUT /api/plans/:id` | Billing Admin | `authorize('Billing Admin')` | 403 Forbidden |
| `POST /api/subscriptions` | Customer | `authorize('Customer')` | 403 Forbidden |
| `PUT /api/subscriptions/:id/change-plan`| Customer | `authorize('Customer')` + Controller checks ownership | 403 Forbidden |
| `PUT /api/subscriptions/:id/cancel` | Customer, Billing Admin | `authenticate` + Controller checks ownership for Customers | 403 Forbidden |
| `POST /api/subscriptions/:id/apply-coupon` | Customer | `authorize('Customer')` + Controller checks ownership | 403 Forbidden |
| `POST /api/usage` | Customer, Billing Admin | `authenticate` + Controller validates active state | 401 / 409 |
| `GET /api/usage/:subscriptionId` | Customer, Billing Admin | `authenticate` + Controller checks ownership for Customers | 403 Forbidden |
| `POST /api/invoices/generate` | Billing Admin | `authorize('Billing Admin')` | 403 Forbidden |
| `PUT /api/invoices/:id/pay` | Customer, Billing Admin | `authenticate` | 401 if missing/invalid |
| `POST /api/invoices/:id/retry` | Billing Admin | `authorize('Billing Admin')` | 403 Forbidden |
| `GET /api/customers/:id/dashboard` | Customer, Billing Admin | `authenticate` + Controller checks ownership for Customers | 403 Forbidden |
| `GET /api/admin/reports/revenue` | Billing Admin | `authorize('Billing Admin')` | 403 Forbidden |

All 403 Forbidden rejections reliably return the following standard JSON error payload:
```json
{
  "success": false,
  "message": "Forbidden. You do not have access to this resource.",
  "errorCode": "FORBIDDEN"
}
```
