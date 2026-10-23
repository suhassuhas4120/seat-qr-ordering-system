import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:4000';

async function runTest() {
  console.log('🧪 Starting Pay-via-Waiter end-to-end notification test...');

  // 1. Connect Customer 03, Waiter Tablet, Waiter Mobile
  const customerSocket = io(BACKEND_URL);
  const tabletSocket = io(BACKEND_URL);
  const mobileSocket = io(BACKEND_URL);

  let tabletReceivedAlert = null;
  let mobileReceivedAlert = null;
  let tabletReceivedBillReq = null;

  await Promise.all([
    new Promise((resolve) => customerSocket.on('connect', resolve)),
    new Promise((resolve) => tabletSocket.on('connect', resolve)),
    new Promise((resolve) => mobileSocket.on('connect', resolve)),
  ]);

  console.log('✅ Sockets connected.');

  tabletSocket.emit('staff:join', { type: 'tablet' });
  mobileSocket.emit('staff:join', { type: 'mobile' });
  customerSocket.emit('seat:join', { seatId: 3 });

  tabletSocket.on('waiter:called', (payload) => {
    console.log('📱 [TABLET RECEIVED WAITER_CALLED]', payload);
    tabletReceivedAlert = payload;
  });

  tabletSocket.on('bill:requested', (payload) => {
    console.log('📱 [TABLET RECEIVED BILL_REQUESTED]', payload);
    tabletReceivedBillReq = payload;
  });

  mobileSocket.on('waiter:called', (payload) => {
    console.log('📱 [MOBILE RECEIVED WAITER_CALLED]', payload);
    mobileReceivedAlert = payload;
  });

  await new Promise((r) => setTimeout(r, 600));

  // 2. Customer 03 places order if not active
  console.log('🛒 Placing sample order for Seat #03...');
  const orderRes = await fetch(`${BACKEND_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seatId: 3,
      createdByRole: 'CUSTOMER',
      items: [{ menuItemId: 20, quantity: 2 }],
    }),
  });
  console.log('Order status:', orderRes.status);

  // 3. Customer 03 calls Pay via Waiter (Floor Captain Called)
  console.log('🔔 Customer 03 clicks "Pay via Waiter"...');
  customerSocket.emit('waiter:called', {
    seatId: 3,
    seatNumber: 'Seat 03',
    reason: 'BILL',
    amount: 357,
    alert: {
      id: `alert-test-${Date.now()}`,
      type: 'customer_call',
      seatNumber: 'Seat 03',
      chairId: '3',
      title: 'Bill Requested (₹357)',
      message: 'Bill settlement requested for Seat 03: ₹357',
      billAmount: 357,
      isUrgent: true,
    },
    timestamp: new Date().toISOString(),
  });

  // Also test REST API fallback endpoint
  const restAlertRes = await fetch(`${BACKEND_URL}/api/service-alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seatId: 3,
      seatNumber: 'Seat 03',
      type: 'customer_call',
      title: 'Bill Requested (₹357)',
      message: 'Bill settlement requested for Seat 03: ₹357',
      billAmount: 357,
      isUrgent: true,
    }),
  });
  console.log('REST Service Alert response status:', restAlertRes.status);

  await new Promise((r) => setTimeout(r, 1200));

  // 4. Verify Waiter Tablet and Mobile received the alert
  if (!tabletReceivedAlert) {
    throw new Error('❌ Waiter Tablet FAILED to receive waiter:called event!');
  }
  console.log('✅ Waiter Tablet received alert successfully! Title:', tabletReceivedAlert.alert?.title);

  if (!mobileReceivedAlert) {
    throw new Error('❌ Waiter Mobile FAILED to receive waiter:called event!');
  }
  console.log('✅ Waiter Mobile received alert successfully! Title:', mobileReceivedAlert.alert?.title);

  // 5. Verify /api/service-alerts returns the active alert
  const activeAlertsRes = await fetch(`${BACKEND_URL}/api/service-alerts`);
  const activeAlerts = await activeAlertsRes.json();
  console.log(`Active alerts count on backend: ${activeAlerts.length}`);
  const seat3Alert = activeAlerts.find((a) => a.chairId === '3' && !a.isResolved);
  if (!seat3Alert) {
    throw new Error('❌ Backend /api/service-alerts does not have active alert for Seat 3!');
  }
  console.log('✅ Active alert confirmed on backend for Seat 03: Amount ₹' + seat3Alert.billAmount);

  // 6. Verify settling bill resolves the alert automatically
  console.log('💳 Waiter settles bill on Seat 03...');
  const payRes = await fetch(`${BACKEND_URL}/api/payments/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seatId: 3,
      gateway: 'CASH',
      settledByRole: 'WAITER',
    }),
  });
  const payData = await payRes.json();
  console.log('Payment status:', payRes.status, 'Receipt:', payData.receipt?.amount);

  const activeAlertsAfter = await fetch(`${BACKEND_URL}/api/service-alerts`).then((r) => r.json());
  const seat3AlertAfter = activeAlertsAfter.find((a) => a.chairId === '3' && !a.isResolved);
  if (seat3AlertAfter) {
    throw new Error('❌ Alert for Seat 3 was NOT resolved after payment!');
  }
  console.log('✅ Alert for Seat 03 was automatically resolved after payment settlement!');

  customerSocket.disconnect();
  tabletSocket.disconnect();
  mobileSocket.disconnect();

  console.log('\n🎉 ALL PAY-VIA-WAITER TESTS PASSED WITH 100% SUCCESS!');
}

runTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
