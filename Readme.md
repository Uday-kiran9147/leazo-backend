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
Create a `.env` file in the root directory:
```env
PORT=3000
MONGODB_URL=mongodb://localhost:27017/leazo
JWT_SECRET=your_jwt_secret
REDIS_URL=your_upstash_redis_url
REDIS_SECRET=your_upstash_redis_token
```

### 4. Running the App
```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
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
