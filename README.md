# LUMIÈRE — 100-Seat Collaborative Real-Time Restaurant Management System

An ultra-premium, zero-lag, real-time dining and ordering platform for restaurants with 100 individual seats.

---

## 🌟 Live Portals & URLs

| Portal | Role | URL | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **Portal Hub** | Launcher | `http://localhost:3000/` | Role selector & seat QR testing stand |
| **Portal 1: Customer PWA** | Customer | `http://localhost:3000/seat/14` | Zero PII, dynamic QR, item-level live tracker, self-checkout |
| **Portal 2: Kitchen KDS** | Chef | `http://localhost:3000/kds` | 3-column Kanban, dish-level bumping, batch cooking summary, 86 manager |
| **Portal 3: Waiter Mobile** | Waiter | `http://localhost:3000/waiter` | Pocket view, PIN auth, pickup alerts, table-side ordering, cash collection |
| **Portal 4: Waiter Tablet** | Floor Staff | `http://localhost:3000/tablet` | 100-seat 2D floor matrix across 5 zones, tab inspector, seat transfers |
| **Portal 5: Manager Terminal**| Manager | `http://localhost:3000/manager`| Live revenue radar, waiter cash ledger, menu management, audit logs |

---

## 🚀 Running the Project

```bash
# 1. Start the Fastify Realtime Backend (Port 4000)
cd backend
npm run dev

# 2. Start the Next.js Frontend (Port 3000)
cd frontend
npm run dev
```

---

## 🛡️ Architecture & Security Highlights

1. **Collaborative Cross-Actor Tab:** Customer, Waiter Mobile, Waiter Tablet, and Manager can all append dishes to the same seat bill in real time.
2. **Granular Item-Level 5-Stage Tracking:** Every dish (`QUEUED` → `COOKING` → `READY` → `SERVED` → `PAID`) is tracked individually.
3. **Multi-Channel Settlement & Instant Auto-Vacate:** Customer (UPI/Card), Waiter (Cash), or Manager settlement triggers microsecond auto-unlock across all 5 devices simultaneously.
4. **Anti-Collision Mutex:** Compare-And-Swap locking prevents simultaneous scans or double charges.
5. **Native Web Audio Synthesis:** Chimes and bells generated mathematically with 0.0ms latency without external audio files.
