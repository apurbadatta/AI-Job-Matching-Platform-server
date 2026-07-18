<div align="center">

# 🖥️ JobPilot AI — Server

### Express + TypeScript + MongoDB Backend

[![Express](https://img.shields.io/badge/Express-5.1-000000?logo=express)](https://expressjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?logo=typescript)](https://typescriptlang.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.6-47A248?logo=mongodb)](https://mongodb.com)

</div>

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your values

# Start development server
npm run dev

# Server runs on http://localhost:5000
```

## 📦 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Start production server |
| `npm run seed` | Seed demo employer user |
| `npm run seed:admin` | Seed admin user |
| `npm run seed:blog` | Seed blog posts |
| `npm run seed:demo-data` | Seed demo jobs and data |
| `npm run seed:all` | Run all seeders |

## 🔐 Environment Variables

Create a `.env` file in the server root:

```env
# Server
PORT=5000
NODE_ENV=development

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000

# Better Auth
BETTER_AUTH_URL=http://localhost:5000
BETTER_AUTH_SECRET=your-random-secret-here

# MongoDB
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/jobpilotAI

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Stripe (optional)
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_BUSINESS_PRICE_ID=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Gemini AI (optional)
GEMINI_API_KEY=your-gemini-key
```

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| ALL | `/api/auth/{*path}` | — | Better Auth handler |
| GET | `/api/auth/session` | — | Get session |
| PUT | `/api/profile` | ✅ | Update profile |
| POST | `/api/auth/setup-employer` | ✅ Candidate | Setup employer |

### Jobs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/jobs` | — | List jobs |
| GET | `/api/jobs/categories` | — | Categories |
| GET | `/api/jobs/locations` | — | Locations |
| GET | `/api/jobs/employer` | ✅ Employer | Employer's jobs |
| POST | `/api/jobs` | ✅ Employer | Create job |


### AI
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/ai/recommendations` | ✅ Candidate | AI recommendations |
| POST | `/api/ai/interactions` | ✅ Candidate | Track interaction |
| GET | `/api/ai/saved-jobs` | ✅ Candidate | Saved jobs |
| POST | `/api/ai/cover-letter` | ✅ Candidate | Generate cover letter |
| POST | `/api/ai/chat` | ✅ User | AI chatbot |

### Payment
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/payment/subscription-status` | ✅ Employer | Subscription status |
| POST | `/api/payment/create-checkout-session` | ✅ Employer | Create checkout |
| POST | `/api/payment/cancel-subscription` | ✅ Employer | Cancel |

### Admin (All require Admin role)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List users |
| POST | `/api/admin/users/:id/suspend` | Suspend user |
| POST | `/api/admin/users/:id/activate` | Activate user |
| POST | `/api/admin/users/:id/role` | Change role |
| GET | `/api/admin/jobs` | List jobs |


## 🛡️ Security

- **Authentication**: Better Auth with email/password + Google OAuth
- **Authorization**: Role-based access (Candidate, Employer, Admin)
- **CORS**: Configured for client URL only
- **Headers**: X-Content-Type-Options, X-Frame-Options, XSS Protection
- **Input Validation**: Request body validation on all endpoints
- **Rate Limiting**: Built-in Express protection

## 🚀 Deployment

### Render

1. Push to GitHub
2. Create new Web Service on [Render](https://render.com)
3. Set root directory to `server/`
4. Render auto-detects `render.yaml`
5. Set env vars in dashboard
6. Deploy

### Docker

```bash
docker build -t jobpilot-server .
docker run -p 5000:5000 --env-file .env jobpilot-server
```

## 📁 Structure

```
server/
├── src/
│   ├── config/         # Database configuration
│   ├── lib/            # Auth, Stripe setup
│   ├── middleware/      # Auth middleware
│   ├── models/         # Mongoose models
│   ├── routes/         # API routes
│   │   ├── admin.ts    # Admin routes
│   │   ├── ai.ts       # AI routes
│   │   ├── blog.ts     # Blog routes
│   │   ├── contact.ts  # Contact routes
│   │   ├── jobs.ts     # Job routes
│   │   ├── payment.ts  # Payment routes
│   │   └── reviews.ts  # Review routes
│   └── seed/           # Database seeders
├── Dockerfile
├── render.yaml
├── tsconfig.json
└── package.json
```
