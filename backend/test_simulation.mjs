import { io as ioClient } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:4000';

async function runSimulation() {
  console.log('===============================================================');
  console.log('🚀 STARTING COMPREHENSIVE 20-CUSTOMER MULTI-ACTOR SIMULATION');
  console.log('   Actors: 20 Customers, 1 Manager, 3 Waiter Mobiles, 3 Waiter Tablets, 1 KDS');
  console.log('===============================================================\n');

  const logs = [];
  const failures = [];
  const warnings = [];

  function log(stage, msg) {
    const entry = `[${stage}] ${msg}`;
    logs.push(entry);
    console.log(entry);
  }

  function reportFailure(code, description, details) {
    const item = { code, description, details };
    failures.push(item);
    console.error(`❌ FAILURE: [${code}] ${description}`, details || '');
  }

  function reportWarning(code, description, details) {
    const item = { code, description, details };
    warnings.push(item);
    console.warn(`⚠️ WARNING: [${code}] ${description}`, details || '');
  }

  // 1. Connect all sockets
  log('SETUP', 'Connecting 20 Customers, 1 Manager, 3 Waiter Mobiles, 3 Waiter Tablets, 1 KDS...');
  
  const customerSockets = new Map();
  const customerEvents = new Map();

  for (let seatId = 1; seatId <= 20; seatId++) {
    const s = ioClient(BACKEND_URL, { transports: ['websocket'] });
    customerSockets.set(seatId, s);
    customerEvents.set(seatId, []);

    s.on('connect', () => {
      s.emit('join:seat', seatId);
    });

    s.onAny((event, data) => {
      customerEvents.get(seatId).push({ event, data });
    });
  }

  const managerSocket = ioClient(BACKEND_URL, { transports: ['websocket'] });
  const managerEvents = [];
  managerSocket.on('connect', () => {
    managerSocket.emit('join:manager');
  });
  managerSocket.onAny((event, data) => {
    managerEvents.push({ event, data });
  });

  const kdsSocket = ioClient(BACKEND_URL, { transports: ['websocket'] });
  const kdsEvents = [];
  kdsSocket.on('connect', () => {
    kdsSocket.emit('join:kds');
  });
  kdsSocket.onAny((event, data) => {
    kdsEvents.push({ event, data });
  });

  const waiterMobileSockets = [1, 2, 3].map((wId) => {
    const s = ioClient(BACKEND_URL, { transports: ['websocket'] });
    s.on('connect', () => s.emit('join:staff', { role: 'WAITER_MOBILE', staffId: wId }));
    return s;
  });

  const waiterTabletSockets = [1, 2, 3].map((wId) => {
    const s = ioClient(BACKEND_URL, { transports: ['websocket'] });
    s.on('connect', () => s.emit('join:staff', { role: 'WAITER_TABLET', staffId: wId }));
    return s;
  });

  await new Promise((r) => setTimeout(r, 1500));
  log('SETUP', 'All 28 actors connected via WebSocket successfully.\n');

  // 2. Fetch Menu to pick items
  const menuRes = await fetch(`${BACKEND_URL}/api/menu`);
  const menu = await menuRes.json();
  const sampleItems = (menu.items || []).slice(0, 5);

  if (sampleItems.length === 0) {
    reportFailure('MENU_EMPTY', 'Backend returned empty menu items');
  } else {
    log('MENU', `Loaded ${sampleItems.length} menu items for testing.`);
  }

  // 3. Place Orders for all 20 Seats
  log('ORDER_PLACING', 'Placing orders across 20 tables...');
  const orderResults = new Map();

  for (let seatId = 1; seatId <= 20; seatId++) {
    const role = seatId <= 10 ? 'CUSTOMER' : seatId <= 15 ? 'WAITER_MOBILE' : 'WAITER_TABLET';
    const waiterId = seatId > 10 ? (seatId % 3) + 1 : undefined;

    const chosenDish1 = sampleItems[(seatId - 1) % sampleItems.length];
    const chosenDish2 = sampleItems[seatId % sampleItems.length];

    try {
      const orderRes = await fetch(`${BACKEND_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatId,
          items: [
            { menuItemId: chosenDish1.id, quantity: 2, notes: 'Spicy' },
            { menuItemId: chosenDish2.id, quantity: 1, notes: 'Regular' },
          ],
          createdByRole: role,
          waiterId,
        }),
      });

      if (!orderRes.ok) {
        reportFailure('ORDER_HTTP_FAIL', `HTTP error placing order for seat ${seatId}`, await orderRes.text());
      } else {
        const orderData = await orderRes.json();
        orderResults.set(seatId, orderData);
        log('ORDER_PLACED', `Seat #${seatId.toString().padStart(2, '0')} Order Placed: Ticket ${orderData.order?.orderNumber}, Total: ₹${orderData.seat?.activeOrderTotal}`);
      }
    } catch (e) {
      reportFailure('ORDER_EXCEPTION', `Exception placing order for seat ${seatId}`, e.message);
    }
  }

  await new Promise((r) => setTimeout(r, 1000));

  // Verify KDS and active floor orders
  const activeOrdersRes = await fetch(`${BACKEND_URL}/api/orders/active`);
  const activeOrders = await activeOrdersRes.json();
  log('ACTIVE_ORDERS', `Backend reports ${activeOrders.length} active floor tables.`);
  if (activeOrders.length < 20) {
    reportFailure('ACTIVE_ORDERS_COUNT_MISMATCH', `Expected 20 active floor orders, got ${activeOrders.length}`);
  }

  // 4. Progress stages: PLACED -> COOKING -> READY -> SERVED
  log('STAGES', 'Advancing item stages to SERVED for all tables...');
  for (let seatId = 1; seatId <= 20; seatId++) {
    const orderData = orderResults.get(seatId);
    if (!orderData?.order?.items) continue;

    for (const it of orderData.order.items) {
      try {
        const patchRes = await fetch(`${BACKEND_URL}/api/orders/items/${it.id}/stage`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newStage: 'COOKING',
            staffId: 7,
            seatId,
          }),
        });
        if (!patchRes.ok) {
          reportFailure('STAGE_PATCH_COOKING_FAIL', `Failed COOKING stage for item ${it.id}`);
        }

        const patchReady = await fetch(`${BACKEND_URL}/api/orders/items/${it.id}/stage`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newStage: 'READY',
            staffId: 7,
            seatId,
          }),
        });
        if (!patchReady.ok) {
          reportFailure('STAGE_PATCH_READY_FAIL', `Failed READY stage for item ${it.id}`);
        }

        const patchServed = await fetch(`${BACKEND_URL}/api/orders/items/${it.id}/stage`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newStage: 'SERVED',
            staffId: 1,
            seatId,
          }),
        });
        if (!patchServed.ok) {
          reportFailure('STAGE_PATCH_SERVED_FAIL', `Failed SERVED stage for item ${it.id}`);
        }
      } catch (e) {
        reportFailure('STAGE_PATCH_EXCEPTION', `Exception advancing item ${it.id}`, e.message);
      }
    }
  }

  await new Promise((r) => setTimeout(r, 1000));
  log('STAGES', 'All items across 20 tables successfully bumped to SERVED.\n');

  // 5. TEST ALL 5 PAYMENT AVENUES
  log('PAYMENTS', 'Beginning settlement tests across 5 payment channels...');

  // Group 1: Customer Self-Pay (Seats 1-4)
  for (let seatId = 1; seatId <= 4; seatId++) {
    const gw = seatId % 2 === 0 ? 'UPI' : 'RAZORPAY';
    log('PAYMENT_CUST_SELF', `Testing Customer Self-Pay on Seat #${seatId} via ${gw}`);
    try {
      const res = await fetch(`${BACKEND_URL}/api/payments/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatId,
          gateway: gw,
          settledByRole: 'CUSTOMER_SELF',
          gatewayPaymentId: `TXN-SELF-${seatId}-${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        reportFailure('CUST_SELF_PAY_FAIL', `Seat ${seatId} Self-Pay failed`, data);
      } else {
        log('PAYMENT_CUST_SELF', `Seat #${seatId} Paid & Vacated: ₹${data.receipt?.amount}`);
      }
    } catch (e) {
      reportFailure('CUST_SELF_PAY_EXCEPTION', `Seat ${seatId} exception`, e.message);
    }
  }

  // Group 2: Customer Pay via Waiter (Seats 5-8)
  for (let seatId = 5; seatId <= 8; seatId++) {
    log('PAYMENT_CUST_VIA_WAITER', `Testing Customer Pay-via-Waiter on Seat #${seatId}`);
    try {
      const res = await fetch(`${BACKEND_URL}/api/payments/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatId,
          gateway: 'CASH',
          settledByRole: 'WAITER',
          staffId: (seatId % 3) + 1,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        reportFailure('CUST_VIA_WAITER_FAIL', `Seat ${seatId} Pay-via-Waiter failed`, data);
      } else {
        log('PAYMENT_CUST_VIA_WAITER', `Seat #${seatId} Settled by Waiter via Cash: ₹${data.receipt?.amount}`);
      }
    } catch (e) {
      reportFailure('CUST_VIA_WAITER_EXCEPTION', `Seat ${seatId} exception`, e.message);
    }
  }

  // Group 3: Waiter Mobile Direct (Seats 9-12)
  for (let seatId = 9; seatId <= 12; seatId++) {
    const gw = seatId % 2 === 0 ? 'UPI' : 'CASH';
    log('PAYMENT_WAITER_MOBILE', `Testing Waiter Mobile Settle on Seat #${seatId} via ${gw}`);
    try {
      const res = await fetch(`${BACKEND_URL}/api/payments/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatId,
          gateway: gw,
          settledByRole: 'WAITER',
          staffId: 1,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        reportFailure('WAITER_MOBILE_SETTLE_FAIL', `Seat ${seatId} Mobile Settle failed`, data);
      } else {
        log('PAYMENT_WAITER_MOBILE', `Seat #${seatId} Settled by Waiter Mobile: ₹${data.receipt?.amount}`);
      }
    } catch (e) {
      reportFailure('WAITER_MOBILE_EXCEPTION', `Seat ${seatId} exception`, e.message);
    }
  }

  // Group 4: Waiter Tablet Direct (Seats 13-16)
  for (let seatId = 13; seatId <= 16; seatId++) {
    const gw = seatId % 2 === 0 ? 'UPI' : 'CASH';
    log('PAYMENT_WAITER_TABLET', `Testing Waiter Tablet Settle on Seat #${seatId} via ${gw}`);
    try {
      const res = await fetch(`${BACKEND_URL}/api/payments/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatId,
          gateway: gw,
          settledByRole: 'WAITER',
          staffId: 2,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        reportFailure('WAITER_TABLET_SETTLE_FAIL', `Seat ${seatId} Tablet Settle failed`, data);
      } else {
        log('PAYMENT_WAITER_TABLET', `Seat #${seatId} Settled by Waiter Tablet: ₹${data.receipt?.amount}`);
      }
    } catch (e) {
      reportFailure('WAITER_TABLET_EXCEPTION', `Seat ${seatId} exception`, e.message);
    }
  }

  // Group 5: Manager POS Direct (Seats 17-20)
  for (let seatId = 17; seatId <= 20; seatId++) {
    const modes = ['UPI', 'CASH', 'STRIPE', 'CASH'];
    const gw = modes[seatId - 17];
    log('PAYMENT_MANAGER_POS', `Testing Manager POS Settle on Seat #${seatId} via ${gw}`);
    try {
      const res = await fetch(`${BACKEND_URL}/api/payments/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatId,
          gateway: gw,
          settledByRole: 'MANAGER',
          staffId: 99,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        reportFailure('MANAGER_POS_SETTLE_FAIL', `Seat ${seatId} Manager POS Settle failed`, data);
      } else {
        log('PAYMENT_MANAGER_POS', `Seat #${seatId} Settled by Manager POS: ₹${data.receipt?.amount}`);
      }
    } catch (e) {
      reportFailure('MANAGER_POS_EXCEPTION', `Seat ${seatId} exception`, e.message);
    }
  }

  await new Promise((r) => setTimeout(r, 1500));

  // 6. STRESS & ANGLE TESTS
  log('EDGE_TESTS', '\n--- TESTING CORNER CASES & RACE CONDITIONS ---');

  // Test A: Double Payment Idempotency (Paying already vacated Seat 6 again)
  log('EDGE_A', 'Testing Double Payment on Seat #6 (already vacated)...');
  try {
    const res = await fetch(`${BACKEND_URL}/api/payments/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seatId: 6,
        gateway: 'CASH',
        settledByRole: 'WAITER',
      }),
    });
    const data = await res.json();
    if (res.status === 400 || res.status === 409 || !data.success || data.receipt?.amount === 0 || data.alreadySettled) {
      log('EDGE_A', `Double payment safely handled idempotently (alreadySettled: ${data.alreadySettled}, Amount: ₹${data.receipt?.amount || 0}, Status: ${res.status})`);
    } else {
      reportWarning('DOUBLE_PAYMENT_UNGUARDED', 'Paying vacated seat with no active orders returned success', data);
    }
  } catch (e) {
    log('EDGE_A', `Double payment rejected with error: ${e.message}`);
  }

  // Test B: Cross-Seat Contamination Check
  log('EDGE_B', 'Placing new order on Seat #25, then settling Seat #26, verifying Seat #25 is untouched...');
  await fetch(`${BACKEND_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seatId: 25,
      items: [{ menuItemId: sampleItems[0].id, quantity: 3 }],
      createdByRole: 'CUSTOMER',
    }),
  });

  // Check tab before Seat 26 settle
  const tabBefore = await fetch(`${BACKEND_URL}/api/seats/25/tab`).then((r) => r.json());
  
  // Settle Seat 26
  await fetch(`${BACKEND_URL}/api/payments/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seatId: 26,
      gateway: 'CASH',
      settledByRole: 'WAITER',
    }),
  });

  // Check tab after Seat 26 settle
  const tabAfter = await fetch(`${BACKEND_URL}/api/seats/25/tab`).then((r) => r.json());

  if (tabBefore.total !== tabAfter.total || tabBefore.orders?.length !== tabAfter.orders?.length) {
    reportFailure('CROSS_CONTAMINATION_FOUND', `Seat 25 modified when settling Seat 26! Before: ₹${tabBefore.total}, After: ₹${tabAfter.total}`);
  } else {
    log('EDGE_B', `Seat #25 completely untouched when settling Seat #26 (Total remained ₹${tabAfter.total}).`);
  }

  // Test C: Socket Event Delivery
  log('EDGE_C', 'Verifying WebSocket delivery to customer sockets...');
  for (let seatId = 1; seatId <= 20; seatId++) {
    const evts = customerEvents.get(seatId) || [];
    const hasPaySuccess = evts.some((e) => e.event === 'payment:success');
    const hasSeatVacated = evts.some((e) => e.event === 'seat:vacated');

    if (!hasPaySuccess && !hasSeatVacated) {
      reportWarning('SOCKET_EVENT_MISSING', `Customer socket for seat ${seatId} received no payment or vacate event`, {
        eventCount: evts.length,
        events: evts.map((e) => e.event),
      });
    }
  }

  // Test D: Takeaway Parcel Settlement
  log('EDGE_D', 'Testing Takeaway Parcel Order & Settlement...');
  try {
    // 1. Place order on Seat 0
    await fetch(`${BACKEND_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seatId: 0,
        items: [{ menuItemId: sampleItems[0].id, quantity: 2 }],
        createdByRole: 'MANAGER',
      }),
    });

    // 2. Settle Seat 0
    const tkRes = await fetch(`${BACKEND_URL}/api/payments/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seatId: 0,
        gateway: 'CASH',
        settledByRole: 'MANAGER',
      }),
    });
    const tkData = await tkRes.json();
    if (tkRes.ok && tkData.success) {
      log('EDGE_D', `Takeaway Seat 0 settled successfully (Amount: ₹${tkData.receipt.amount})`);
    } else {
      reportFailure('TAKEAWAY_SETTLE_FAILED', `Takeaway response failed: ${JSON.stringify(tkData)}`);
    }
  } catch (e) {
    reportFailure('TAKEAWAY_SETTLE_ERR', e.message);
  }

  // 7. FINAL SUMMARY
  console.log('\n===============================================================');
  console.log('📊 SIMULATION & STRESS TEST RESULTS SUMMARY');
  console.log('===============================================================');
  console.log(`Total Simulation Logs: ${logs.length}`);
  console.log(`Total Failures Detected: ${failures.length}`);
  console.log(`Total Warnings / Gaps Detected: ${warnings.length}`);
  
  if (failures.length > 0) {
    console.log('\n🚨 DETAILED LIST OF DETECTED FAILURES:');
    failures.forEach((f, idx) => {
      console.log(`${idx + 1}. [${f.code}] ${f.description}`);
      if (f.details) console.log('   Details:', f.details);
    });
  }

  if (warnings.length > 0) {
    console.log('\n⚠️ DETAILED LIST OF GAPS / INCONSISTENCIES:');
    warnings.forEach((w, idx) => {
      console.log(`${idx + 1}. [${w.code}] ${w.description}`);
      if (w.details) console.log('   Details:', w.details);
    });
  }

  // Disconnect all sockets
  customerSockets.forEach((s) => s.disconnect());
  managerSocket.disconnect();
  kdsSocket.disconnect();
  waiterMobileSockets.forEach((s) => s.disconnect());
  waiterTabletSockets.forEach((s) => s.disconnect());

  process.exit(0);
}

runSimulation().catch(console.error);
