<div align="center">

# 🛡️ Edge-Based Real-Time AI Proctoring System

### *A full-stack, privacy-first online examination monitoring platform powered by real-time AI*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%2F%20Local-47A248.svg)](https://mongodb.com)
[![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-010101.svg)](https://socket.io)

</div>

---

## 📸 Screenshots

| Login | Admin Dashboard | Candidate HUD |
|---|---|---|
| Premium glassmorphism login with device check | Live multi-candidate monitoring | Real-time AI risk scoring |

---

## 🚀 Features

### 🎯 Core Proctoring
- **Real-Time Face Detection** — Continuous face monitoring using face-api.js (runs 100% in-browser, no cloud)
- **Multi-Violation Detection** — Head-pose analysis, gaze tracking, tab/window switching, fullscreen exit
- **Live Risk Scoring** — Dynamic integrity index (0–100%) computed from weighted behavioral events
- **Offline Queue** — Events buffered locally when network is unavailable and flushed on reconnect

### 🖥️ Admin Dashboard
- **Live Candidate Grid** — Real-time monitoring of all active sessions via WebSocket
- **Event Feed Sidebar** — Instant stream of violations across all candidates
- **Risk-Level Filtering** — Filter candidates by Safe / Warning / High Risk
- **Critical Alert Banner** — Instant push notification when a high-severity event occurs

### 🔐 Security & Backend
- **JWT Authentication** — Secure token-based login with role-based access (candidate / admin)
- **Helmet** — HTTP security headers against XSS, clickjacking, and more
- **Rate Limiting** — IP-based request throttling to prevent brute-force attacks
- **Centralized Error Handling** — Clean, consistent API error responses
- **Structured Logging** — Winston + Morgan for request/error observability

---

## 🗂️ Project Structure

```
proctoring-system/
├── backend/                      # Node.js / Express API
│   ├── middleware/
│   │   ├── auth.js               # JWT verification middleware
│   │   └── error.js              # Centralized error handler
│   ├── models/
│   │   ├── User.js               # User schema (candidate / admin)
│   │   ├── Session.js            # Exam session schema
│   │   └── Event.js              # Proctoring event schema
│   ├── routes/
│   │   ├── auth.js               # Login, register, /me
│   │   ├── session.js            # Session CRUD
│   │   ├── events.js             # Event ingestion
│   │   └── admin.js              # Admin-only endpoints
│   ├── socket/
│   │   └── index.js              # Socket.io real-time event handlers
│   ├── utils/
│   │   └── logger.js             # Winston logger configuration
│   ├── app.js                    # Express app setup
│   ├── server.js                 # HTTP + Socket.io server entry point
│   ├── .env.example              # Environment variable template
│   └── package.json
│
├── frontend/                     # React Application
│   ├── public/
│   │   └── models/               # face-api.js model weights (local)
│   ├── src/
│   │   ├── components/
│   │   │   ├── CandidateCard.jsx # Live candidate status card
│   │   │   ├── RiskMeter.jsx     # Animated risk score indicator
│   │   │   └── AlertBadge.jsx    # Event severity badge
│   │   ├── hooks/
│   │   │   ├── useBrowserEventsMonitoring.js   # Tab/fullscreen/paste detection
│   │   │   └── useFaceDetection.js             # face-api.js integration
│   │   ├── pages/
│   │   │   ├── Login.jsx         # Multi-step auth + device check
│   │   │   ├── Interview.jsx     # Candidate exam HUD
│   │   │   └── AdminDashboard.jsx # Admin monitoring center
│   │   ├── App.js                # Routing + auth guards
│   │   ├── index.css             # Global design system
│   │   └── index.js
│   ├── .env.example              # Frontend environment template
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites

- **Node.js** v18+
- **MongoDB** (local install or MongoDB Atlas)
- **npm** v9+
- A modern browser with camera/microphone access

---

### 1. Clone the Repository

```bash
git clone https://github.com/Akashrawat4561/-Edge-Based-Real-Time-AI-Proctoring-System.git
cd -Edge-Based-Real-Time-AI-Proctoring-System
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/proctoring
JWT_SECRET=your_super_secret_key_change_this
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

Start the backend:

```bash
npm run dev
```

> ✅ You should see: `🚀 Proctoring System Server is live on port 5000`

---

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

Edit `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:5000/api
GENERATE_SOURCEMAP=false
```

Start the frontend:

```bash
npm start
```

> ✅ App opens at `http://localhost:3000`

---

## 👤 Test Credentials

After registering your first users, you can use them to log in. To register via API:

```bash
# Register an admin
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin User","email":"admin@test.com","password":"password123","role":"admin"}'

# Register a candidate
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Candidate","email":"candidate@test.com","password":"password123","role":"candidate"}'
```

---

## 🔌 API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | None | Create a new user |
| `POST` | `/api/auth/login` | None | Login and receive JWT |
| `GET` | `/api/auth/me` | JWT | Get current user info |
| `POST` | `/api/session` | JWT | Start a new exam session |
| `GET` | `/api/session/:id` | JWT | Get session details |
| `POST` | `/api/events` | JWT | Submit a proctoring event |
| `GET` | `/api/admin/sessions` | Admin JWT | Get all live sessions |
| `GET` | `/health` | None | Server health check |

---

## 🧠 How It Works

```
Candidate Browser                    Backend Server              Admin Browser
─────────────────                    ──────────────              ─────────────
face-api.js (local)  ──[event]──►   Express API         ──►   Socket.io Push
Tab monitoring       ──[socket]──►  MongoDB Storage      ──►   Live Dashboard
Browser events                       Rate Limiting              Risk Feed
                                     JWT Auth
```

1. **On login** — Candidate grants camera/microphone permissions
2. **During exam** — face-api.js runs locally, detecting face absence, head turns, and gaze deviation
3. **On violation** — Event is sent to backend via REST + broadcasted via Socket.io to admin
4. **Admin sees** — Real-time risk score, event feed, and candidate status update instantly
5. **Offline** — Events are queued locally and flushed when connectivity resumes

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, face-api.js, Socket.io Client, Axios |
| Backend | Node.js, Express 4, Socket.io |
| Database | MongoDB + Mongoose |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Security | Helmet, express-rate-limit, CORS |
| Logging | Winston, Morgan |
| Styling | Vanilla CSS (Glassmorphism Design System) |

---

## 🔒 Security Notes

- All `.env` files are gitignored — **never commit secrets**
- JWT tokens expire after **7 days**
- Rate limiting: **100 requests / 15 minutes** per IP on `/api/`
- face-api.js model weights run **entirely in the browser** — no video data leaves the client

