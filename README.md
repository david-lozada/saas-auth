# 🔐 SaaS Multitenant Auth API

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-626CD9?style=for-the-badge&logo=stripe&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

A high-performance, production-ready **Multitenant Authentication & Subscription System** built with **NestJS**, **Fastify**, and **MongoDB**. This project provides a robust foundation for SaaS applications requiring strict tenant isolation, role-based access control, and integrated billing.

---

## 🚀 Key Features

- **🏗 Strict Multitenancy**: Multi-strategy tenant detection (Headers, Query, Subdomains) with database-level isolation.
- **🔐 Advanced Auth**:
  - JWT-based authentication with secure Refresh Token rotation.
  - Platform-specific login flows (Web vs. Mobile).
  - Device tracking and remote session revocation for mobile users.
  - Invite-only signup support per tenant.
- **👥 Role-Based Access Control (RBAC)**:
  - **Super Admin**: Global access via the special `system` tenant.
  - **Admin**: Tenant-level administration.
  - **User**: Standard tenant member.
- **💳 Billing & Subscriptions**: Integrated with **Stripe** and **Binance Pay** for global payment support.
- **🛠 Admin CLI**: Interactive command-line tool for system initialization and seeding.
- **🛡 Security First**:
  - Fastify Helmet for security headers.
  - Throttling/Rate limiting.
  - Bcrypt password hashing (12 rounds).
  - Strict DTO validation.
- **📚 Auto-generated Documentation**: Full Swagger/OpenAPI 3.0 integration.

---

## 🛠 Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) (v11+)
- **Web Server**: [Fastify](https://www.fastify.io/) (via `@nestjs/platform-fastify`)
- **Database**: [MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/)
- **Authentication**: Passport.js with JWT Strategy
- **Validation**: Class-validator & Joi
- **Payments**: Stripe & Binance Pay API
- **DevOps**: Docker & Docker Compose

---

## 🏗 Architecture & Multitenancy

### Tenant Detection

The system identifies the tenant context for every request using the following priority:

1.  **Header**: `x-tenant-id: <tenant_slug_or_id>`
2.  **Query String**: `?tenant=<tenant_slug>`
3.  **Subdomain**: `<tenant_slug>.yourdomain.com`

### The `system` Tenant

The `system` tenant is a reserved scope for global administrative tasks. Only accounts with the `SUPER_ADMIN` role can access this context.

---

## 🏁 Getting Started

### Prerequisites

- Node.js (v20+)
- pnpm (recommended) or npm
- MongoDB (local or Atlas) or Docker

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd saas-auth

# Install dependencies
pnpm install
```

### Configuration

1.  Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
2.  Update the `.env` file with your credentials (JWT Secrets, MongoDB URI, Stripe Keys, etc.).

### Initial Setup (Super Admin)

To initialize the system, create the first Super Admin and seed subscription plans:

```bash
# Run the interactive bootstrap tool
pnpm run bootstrap:admin
```

_Follow the prompts to enter your email, name, and a secure password._

---

## 🏃 Running the Application

### Local Development

```bash
# Start in watch mode
pnpm run start:dev
```

### Using Docker

The project includes optimized Docker configurations for both development and production.

```bash
# Start development environment (API + MongoDB)
pnpm run docker:dev:build
```

---

## 📚 API Documentation

Once the server is running, you can access the interactive Swagger documentation at:
👉 [http://localhost:3000/api](http://localhost:3000/api)

---

## 🧪 Testing

```bash
# Unit tests
pnpm run test

# End-to-end tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov
```

---

## 📂 Project Structure

```text
src/
├── admin/          # Tenant & subscription administration
├── auth/           # Authentication logic, guards, and strategies
├── bootstrap/      # Initialization and seeding services
├── common/         # Constants, decorators, filters, and interceptors
├── config/         # Environment configuration and validation
├── schemas/        # Mongoose/MongoDB data models
├── subscription/   # Billing, Stripe, and Binance Pay integration
├── tenant/         # Multitenancy middleware and repository
├── users/          # User management
├── cli.ts          # Admin CLI entry point
└── main.ts         # Application entry point
```

---

## 📜 License

This project is [UNLICENSED](LICENSE). All rights reserved.
