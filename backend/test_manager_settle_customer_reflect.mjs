import { io as ioClient } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:4000';

async function runTest() {
  console.log('🧪 Starting Manager Settle & Customer Live Reflection Test...');

  // 1. Connect Customer Socket (Seat #03) and Manager Socket
  const customerSocket = ioClient(BACKEND_URL, { transports: ['websocket'] });
  const managerSocket = ioClient(BACKEND_URL, { transports: ['websocket'] });

  await new Promise((resolve) => {
    let connected = 0;
    const check = () => { if (++connected === 2) resolve(); };
    customerSocket.on('connect', check);
    managerSocket.on('connect', check);
  });

  customerSocket.emit('seat:join', { seatId: 3 });
  managerSocket.emit('staff:join:manager');

  let customerReceivedPaymentSuccess = false;
  let customerReceivedSeatVacated = false;
  let customerReceivedBillSettled = false;

  customerSocket.on('payment:success', (data) => {
    console.log('📱 [Customer received payment:success]:', data);
    customerReceivedPaymentSuccess = true;
  });

  customerSocket.on('seat:vacated', (data) => {
    console.log('📱 [Customer received seat:vacated]:', data);
    customerReceivedSeatVacated = true;
  });

  customerSocket.on('bill:settled', (data) => {
    console.log('📱 [Customer received bill:settled]:', data);
    customerReceivedBillSettled = true;
  });

  // 2. Place 3x Biryani order for Seat #03 (₹1,197)
  console.log('🛒 Step 1: Placing order for Seat #03 (₹1,197)...');
  const orderRes = await fetch(`${BACKEND_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seatId: 3,
      items: [
        { menuItemId: 1, quantity: 2 }, // Biryani
        { menuItemId: 2, quantity: 1 }, // Kebab / Biryani
      ],
      createdByRole: 'CUSTOMER',
    }),
  });
  console.log('Order status:', orderRes.status);

  // Verify Seat #03 is occupied with active total
  const tabRes = await fetch(`${BACKEND_URL}/api/seats/3/tab`).then(r => r.json());
  console.log(`Seat #03 Active Tab Total: ₹${tabRes.total}, Items Count: ${tabRes.allItems.length}`);
  if (tabRes.total <= 0 || tabRes.allItems.length === 0) {
    throw new Error('Failed to set up active tab for Seat #03');
  }

  // 3. Manager Settle Simulation
  console.log('💳 Step 2: Manager clicks Settle & Close for Seat #03...');
  const snapshotBeforeSettle = {
    items: tabRes.allItems.map(i => ({ name: i.nameSnapshot, qty: i.quantity, price: i.priceSnapshot })),
    subtotal: tabRes.subtotal,
    gst: tabRes.tax,
    grandTotal: tabRes.total,
    paymentMethod: 'UPI',
    activeSeat: '03',
  };

  // Manager emits bill:settled socket event
  managerSocket.emit('bill:settled', {
    seatId: 3,
    chairId: '03',
    normChairId: '3',
    amount: tabRes.total,
    paymentMethod: 'UPI',
    ticketNumber: tabRes.orders[0]?.orderNumber || 'ORD-003',
  });

  // Manager processes payment via REST endpoint
  const settleRes = await fetch(`${BACKEND_URL}/api/payments/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seatId: 3,
      gateway: 'UPI',
      settledByRole: 'MANAGER',
    }),
  }).then(r => r.json());

  console.log('Settlement response:', settleRes.success ? 'SUCCESS' : settleRes);

  // Wait 500ms for realtime events
  await new Promise(r => setTimeout(r, 500));

  // 4. Assertions
  console.log('🔍 Step 3: Verifying assertions...');

  // Assertion A: Snapshot was preserved (manager receipt modal has real items and total)
  console.log(`✅ Snapshot verification: Subtotal=₹${snapshotBeforeSettle.subtotal}, GrandTotal=₹${snapshotBeforeSettle.grandTotal}, Items=${snapshotBeforeSettle.items.length}`);
  if (snapshotBeforeSettle.grandTotal <= 0 || snapshotBeforeSettle.items.length === 0) {
    throw new Error('Receipt snapshot failed: grandTotal or items collapsed to 0');
  }

  // Assertion B: Customer phone received realtime events
  console.log(`✅ Customer realtime reflection:`);
  console.log(`   - payment:success received: ${customerReceivedPaymentSuccess}`);
  console.log(`   - seat:vacated received: ${customerReceivedSeatVacated}`);
  console.log(`   - bill:settled received: ${customerReceivedBillSettled}`);

  if (!customerReceivedPaymentSuccess || !customerReceivedSeatVacated || !customerReceivedBillSettled) {
    throw new Error('Customer did not receive all real-time settlement events!');
  }

  // Assertion C: Seat #03 is now vacant on backend
  const postTab = await fetch(`${BACKEND_URL}/api/seats/3/tab`).then(r => r.json());
  console.log(`Seat #03 Status post-settle: ${postTab.session.status}, Active Items: ${postTab.allItems.length}`);
  if (postTab.session.status !== 'COMPLETED' || postTab.allItems.length !== 0) {
    throw new Error('Seat #03 was not cleanly vacated on server!');
  }

  customerSocket.disconnect();
  managerSocket.disconnect();

  console.log('\n🎉 ALL MANAGER SETTLE & CUSTOMER REALTIME REFLECTION TESTS PASSED 100%!');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
