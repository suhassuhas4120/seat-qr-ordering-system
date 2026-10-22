# LUMIÈRE / Thoogudeepa — 100-Seat Real-Time Restaurant Management System

An ultra-premium, zero-lag, real-time dining and ordering platform built for high-throughput restaurant operations: **1 Kitchen Screen (KDS), 1 Manager Terminal, 6 Floor Waiters, and 1,000+ Diners per day** across 100 dedicated seats.

[![GitHub Repo](https://img.shields.io/badge/GitHub-suhassuhas4120%2Fseat--qr--ordering--system-181717?logo=github)](https://github.com/suhassuhas4120/seat-qr-ordering-system)
[![Next.js 14](https://img.shields.io/badge/Frontend-Next.js%2014-black?logo=next.js)](https://nextjs.org)
[![Fastify](https://img.shields.io/badge/Backend-Fastify%204-black?logo=fastify)](https://fastify.io)
[![Socket.io](https://img.shields.io/badge/Realtime-Socket.io-010101?logo=socketdotio)](https://socket.io)
[![Vercel Ready](https://img.shields.io/badge/Deployment-Vercel%20%2B%20Render-blue)](https://vercel.com)

---

## 🌟 Live Portals & Access Points

| Portal | Role | URL Route | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **Portal Hub & Launcher** | All | `/` | Role switcher & seat testing stand |
| **All Seat QRs Directory** | Floor / Print | `/qrs` | Printable grid of all 100 Seat QR Codes |
| **Portal 1: Customer PWA** | Customer | `/seat/[chairId]` (e.g. `/seat/14`) | Zero PII, dynamic QR, item-level live tracker, Zero-MDR UPI, Card |
| **Portal 2: Kitchen KDS** | Chef | `/kds` or `/kitchen` | 3-column Kanban, item bumping, batch cooking summary, 86 manager |
| **Portal 3: Waiter Mobile** | Waiter | `/waiter` or `/waiter/mobile` | Pocket view, PIN auth, pickup alerts, table-side ordering, cash collection |
| **Portal 4: Waiter Tablet** | Floor Staff | `/waiter/tablet` | 100-seat 2D floor matrix across 5 zones, tab inspector, seat transfers |
| **Portal 5: Manager Terminal** | Manager | `/manager` | Real-time revenue radar, 6-waiter cash reconciliation ledger, menu 86 |

---

## 👥 Pre-Configured Staff PINs (Operational Out of the Box)

| Staff Member | Role | Assigned Zone | Quick PIN |
| :--- | :--- | :--- | :--- |
| **Alex Johnson** | Waiter 1 | Counter A (Seats 1–20) | `1001` |
| **Maya Lin** | Waiter 2 | Counter B (Seats 21–40) | `1002` |
| **Ramesh Kumar** | Waiter 3 | Bar Area (Seats 41–60) | `1003` |
| **Suresh M** | Waiter 4 | Window Zone (Seats 61–80) | `1004` |
| **Anand Kumar** | Waiter 5 | Center Hall (Seats 81–90) | `1005` |
| **Deepa Naik** | Waiter 6 | Center Hall (Seats 91–100) | `1006` |
| **Chef Gordon** | Head Chef | Kitchen KDS | `9999` |
| **Manjunath H** | Store Manager | Cashier & Admin | `0000` |

---

## 🛡️ Core Production Architecture

1. **Collaborative Cross-Actor Tab**: Customer, Waiter Mobile, Waiter Tablet, and Manager can all append dishes to the same seat bill in real time with zero race conditions.
2. **Granular Item-Level 5-Stage Tracking**: Every single dish independently progresses through `QUEUED` ➔ `COOKING` ➔ `READY` ➔ `SERVED` ➔ `PAID`.
3. **Multi-Channel Settlement & Instant Auto-Vacate**: Customer (UPI/Razorpay), Waiter (Cash), or Manager settlement triggers microsecond auto-unlock across all 5 devices simultaneously.
4. **Crash-Proof Persistence with WAL Journal**: High-concurrency in-memory ACID store backed by atomic file writes (`restaurant_state.json.tmp` ➔ `restaurant_state.json`) and an append-only Write-Ahead Log (`transactions.jsonl`) for complete auditability.
5. **Zero-MDR Dynamic UPI QR**: Generates compliant `upi://pay` deep-links directly embedding the exact bill total and seat order reference, saving 2-3% payment gateway MDR fees.
6. **Razorpay Webhook & Verification**: Server-side HMAC-SHA256 signature verification protects against client-side tampering.
7. **ESC/POS Thermal Printing**: Dedicated 80mm & 58mm CSS media print styles for kitchen KOT tickets and customer final VAT receipts.
8. **Native Web Audio Synthesis**: Zero external asset dependencies; alerts and chimes are generated in-browser via mathematical AudioContext oscillators with 0.0ms latency.

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js 18+ (tested on Node v20 & v24)
- npm or pnpm

### 1. Start the Fastify Real-Time Backend (Port 4000)
```bash
cd backend
npm install
npm run dev
# Server listening at http://localhost:4000
```

### 2. Start the Next.js Frontend (Port 3000)
```bash
cd frontend
npm install
npm run dev
# Server listening at http://localhost:3000
```

---

## ☁️ Cloud Deployment Guide (100% Production Ready)

### Option A: Frontend on Vercel (Recommended)
1. Push this repository to GitHub (already completed at `https://github.com/suhassuhas4120/seat-qr-ordering-system`).
2. Go to [Vercel Dashboard](https://vercel.com/new).
3. Import `suhassuhas4120/seat-qr-ordering-system`.
4. Set **Root Directory** to `frontend`.
5. Set Environment Variables:
   - `NEXT_PUBLIC_API_URL`: Your deployed backend URL (e.g. `https://restaurant-api.onrender.com` or `https://backend-production.up.railway.app`).
6. Click **Deploy**.

### Option B: Backend on Render / Railway / Fly.io
1. Go to [Render](https://dashboard.render.com/) or [Railway](https://railway.app/).
2. Create a new **Web Service** pointing to this GitHub repository.
3. Set **Root Directory** to `backend`.
4. Build Command: `npm install` (or Docker using included `backend/Dockerfile`).
5. Start Command: `npm run start` (runs `node server.js`).
6. Set Environment Variables:
   - `PORT`: `4000` (or leave default for host to assign)
   - `CORS_ORIGIN`: `*` (or your Vercel frontend domain)
   - `UPI_VPA`: `restaurant@upi`
   - `UPI_PAYEE_NAME`: `Thoogudeepa Donne Biryani`
   - `RAZORPAY_KEY_ID`: Your live/test Razorpay Key ID
   - `RAZORPAY_KEY_SECRET`: Your Razorpay Secret

---

## 🖨️ Thermal Receipt & KOT Printing
All bill and receipt views support native browser printing (`Ctrl + P` / `Cmd + P` or the in-app "Print Receipt" button).
- Paper size: 80mm (standard) or 58mm (compact)
- Formatting: High-contrast monochrome, monospace tabular alignment, zero color waste, barcode/QR printable.

---

## 📄 License
MIT © Thoogudeepa Hospitality Systems
