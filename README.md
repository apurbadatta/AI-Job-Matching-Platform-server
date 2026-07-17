# JobPilot AI - Server

Express + TypeScript + MongoDB backend server.

## Setup

```bash
npm install
cp .env.example .env    # fill in values
npm run dev             # development (port 5000)
npm run build           # compile TypeScript
npm start               # production
```

## Tech Stack

- Express
- TypeScript
- Mongoose (MongoDB)
- JWT (jsonwebtoken)
- dotenv, cors

## Environment Variables

See `.env.example` for required variables:
- `PORT` - Server port (default: 5000)
- `CLIENT_URL` - Client URL for CORS
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `GEMINI_API_KEY` - Google Gemini API key
- `STRIPE_SECRET_KEY` - Stripe payment key
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
