# Leazo Backend

A robust, enterprise-ready backend system for the Leazo Property Management application, built with Node.js, Express, and MongoDB.

## 🚀 Recent Key Improvements

- **SOLID Principles**: Refactored core modules (User, Owner, Building, Portion) to follow SOLID principles for better maintainability and testability.
- **Service-Repository Pattern**: Abstracted database logic into Repositories and business logic into Services.
- **Robust Testing Suite**: Implemented 33 automated tests (Unit, Integration, and Middleware) with 100% pass rate.
- **Model Integrity**: Resolved all cyclic dependency issues and hardened TypeScript types across the model layer.
- **Asynchronous Processing**: Integrated a `BackgroundService` for batching user activity tracking and push notifications without blocking API responses.

## 🛠 Tech Stack

- **Runtime**: Node.js (supported versions: 18.x, 20.x)
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB (Mongoose ODM)
- **Caching**: Upstash Redis
- **Testing**: Jest & Supertest
- **In-Memory DB**: MongoDB Memory Server (for isolated testing)
- **Validation**: Zod
- **Authentication**: JWT (JSON Web Tokens)

## 📂 Project Structure

```text
src/
├── cache/          # Redis management and caching logic
├── config/         # Database and app configurations
├── controller/     # Request handling and orchestration
├── middleware/     # Auth, validation, and error handling
├── models/         # Mongoose schemas and interfaces
├── repositories/   # Data access layer (Mongoose implementations)
├── routes/         # API route definitions
├── services/       # Business logic layer
└── utils/          # Background services, notifications, and helpers
tests/
├── integration/    # API endpoint testing
├── unit/           # Service and utility logic testing
└── setup.ts        # Global test environment configuration
```

## ⚙️ Getting Started

### 1. Prerequisites
- Node.js (>= 18.x)
- npm or yarn
- MongoDB Instance (or local install)

### 2. Installation
```bash
npm install
```

### 3. Environment Variables

The project uses multiple environment files based on the `NODE_ENV` variable:
- **Development**: `.env.development` (default)
- **Production**: `.env.production`
- **Test**: `.env.test`

#### Complete Setup Guide

1. **Development**:
   - Create `.env.development` using `.env.sample` as a template.
   - Set `DB_URL` to your local MongoDB (e.g., `mongodb://localhost:27017/leazo`).
   - Caching is **disabled** by default in development environment.

2. **Testing**:
   - Create `.env.test`.
   - Set `DB_URL` to a test database (e.g., `mongodb://localhost:27017/leazo_test`).
   - In-memory MongoDB is used for unit tests regardless of this setting, but it's good for integration tests.
   - Caching is **disabled** in test environment.

3. **Production**:
   - Create `.env.production`.
   - Ensure `REDIS_URL` and `REDIS_SECRET` are provided.
   - Caching is **enabled** ONLY in production.

#### Sample Configuration (`.env.sample`)
```env
PORT=3000
DB_URL=mongodb://localhost:27017/leazo
JWT_SECRET=your_secret

# REDIS (Production Only)
REDIS_URL=your_upstash_redis_url
REDIS_SECRET=your_upstash_redis_token

# PAYMENTS

```

### 4. Running the App

Depending on your environment, use the following commands:

#### Development (Local)
Loads `.env.development`, caching is **disabled**.
```bash
npm run dev
```

#### Production
Loads `.env.production`, caching is **enabled**.
```bash
# Build the project first
npm run build

# Run in production mode
npm run start:prod
```

#### Testing
Loads `.env.test`, caching is **disabled**.
```bash
npm test
```

### 5. Switching Environments Manually
If you want to run a script with a specific environment variable manually in Windows PowerShell:
```powershell
$env:NODE_ENV="production"; npm run dev
```
Or in Windows Command Prompt (CMD):
```cmd
set NODE_ENV=production&& npm run dev
```

## 🧪 Testing

The project uses a comprehensive testing strategy ensuring stability across all layers.

### Run All Tests
```bash
npm test
```

### Run Specific Suites
```bash
# Unit tests only
npm test tests/unit

# Integration tests only
npm test tests/integration

# Sanity check
npm test tests/sanity.test.ts
```

### CI/CD Integration
Continuous Integration is configured via **GitHub Actions** (`.github/workflows/test.yml`). Every push or pull request to `master` or `dev` automatically triggers the full 33-test suite against multiple Node.js versions.

## ⚠️ Important Notes for Developers

- **Firebase Tokens**: The project requires `service_account.json` for push notifications. This file is gitignored. For local tests or CI, the system gracefully skips notification sending if this file is missing.
- **Database Teardown**: In tests, `BackgroundService.stop()` is called in `afterAll` to ensure no orphaned database writes cause errors during cleanup.
- **Caching**: Most `GET` requests for owners and portions are cached in Redis. Update/Delete operations automatically invalidate the relevant cache keys.

## 🔗 Documentation
1. Plan Definitions
We will define two sets of plans: OWNER_PLANS and TENANT_PLANS.

Owner Plans
Free: 1 active listing, 3 photos, Basic visibility, Limited chat.
Starter (₹99/mo): 3 active listings, 8 photos/listing, 1 weekly boost, Verified badge, 10 tenant contacts.
Pro (₹199/mo): Unlimited listings, 15 photos/listing, Daily boost, Unlimited tenant contacts, Auto-renew, Verified badge.
Ultra (₹299/mo): Pro + Top city placement, Performance insights, AI rent suggestion, Priority support.
Tenant Plans
Free: Unlimited browsing, 3 free owner contacts, Basic filters.
Smart Finder (₹49 - 7 days): Unlimited contacts, Early access, Advanced filters.
Premium (₹99/mo): Verified rooms only, Curated shortlists, No ads, Instant chat.
