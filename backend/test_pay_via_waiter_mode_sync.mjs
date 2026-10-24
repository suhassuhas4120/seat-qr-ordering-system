import { io as ioClient } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:4000';

async function runTest() {
  console.log('🧪 Starting Pay-via-Waiter Mode Sync & Refresh Persistence Test...');

  // 1. Connect Customer Socket (Seat #03) and Waiter Tablet Socket
  const customerSocket = ioClient(BACKEND_URL, { transports: ['websocket'] });
  const waiterSocket = ioClient(BACKEND_URL, { transports: ['websocket'] });

  await new Promise((resolve) => {
    let connected = 0;
    const check = () => { if (++connected === 2) resolve(); };
    customerSocket.on('connect', check);
    waiterSocket.on('connect', check);
  });

  customerSocket.emit('seat:join', { seatId: 3 });
  waiterSocket.emit('staff:join', { type: 'tablet' });

  let customerReceivedModes = [];
  customerSocket.on('bill:mode:active', (payload) => {
    console.log('📱 [Customer received bill:mode:active]:', payload);
    customerReceivedModes.push(payload.mode);
  });

  // Step 1: Customer clicks "Pay via Waiter"
  console.log('\n🔔 Step 1: Customer clicks "Pay via Waiter" for Seat #03...');
  const alertRes = await fetch(`${BACKEND_URL}/api/service-alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seatId: 3,
      seatNumber: 'Seat 03',
      type: 'customer_call',
      title: 'Bill Requested (₹568)',
      billAmount: 568,
    }),
  }).then(r => r.json());
  console.log('Alert posted:', alertRes.success);

  // Check bill-mode status before waiter chooses QR or Cash
  const preCheck = await fetch(`${BACKEND_URL}/api/seats/3/bill-mode`).then(r => r.json());
  console.log('Bill mode pre-check (awaiting captain):', preCheck);
  if (!preCheck.active) {
    throw new Error('Seat #03 should be active for bill mode after customer calls captain!');
  }

  // Step 2: Waiter selects "UPI / QR"
  console.log('\n📲 Step 2: Waiter selects UPI / QR mode...');
  const qrModeRes = await fetch(`${BACKEND_URL}/api/seats/3/bill-mode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'qr',
      amount: 568,
    }),
  }).then(r => r.json());
  console.log('Server bill-mode response:', qrModeRes);

  await new Promise(r => setTimeout(r, 400));

  if (!customerReceivedModes.includes('qr')) {
    throw new Error('Customer did not receive real-time bill:mode:active for QR!');
  }
  console.log('✅ Customer phone received QR mode selection in real-time!');

  // Step 3: Customer refreshes page (Simulate refresh by querying GET /api/seats/3/bill-mode)
  console.log('\n🔄 Step 3: Customer refreshes page (simulating browser reload)...');
  const refreshCheck1 = await fetch(`${BACKEND_URL}/api/seats/3/bill-mode`).then(r => r.json());
  console.log('Customer rehydration query on refresh:', refreshCheck1);
  if (!refreshCheck1.active || refreshCheck1.mode !== 'qr') {
    throw new Error('Failed to restore QR mode on customer refresh!');
  }
  console.log('✅ Customer rehydrates QR code mode accurately on page refresh (no reversion to uncalled buttons)!');

  // Step 4: Waiter selects "Cash"
  console.log('\n💵 Step 4: Waiter selects Cash payment mode...');
  customerReceivedModes = [];
  const cashModeRes = await fetch(`${BACKEND_URL}/api/seats/3/bill-mode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'cash',
      amount: 568,
    }),
  }).then(r => r.json());
  console.log('Server bill-mode response for cash:', cashModeRes);

  await new Promise(r => setTimeout(r, 400));

  if (!customerReceivedModes.includes('cash')) {
    throw new Error('Customer did not receive real-time bill:mode:active for Cash!');
  }
  console.log('✅ Customer phone received Cash mode selection in real-time!');

  // Step 5: Customer refreshes page again
  console.log('\n🔄 Step 5: Customer refreshes page again while in Cash mode...');
  const refreshCheck2 = await fetch(`${BACKEND_URL}/api/seats/3/bill-mode`).then(r => r.json());
  console.log('Customer rehydration query on refresh:', refreshCheck2);
  if (!refreshCheck2.active || refreshCheck2.mode !== 'cash') {
    throw new Error('Failed to restore Cash mode on customer refresh!');
  }
  console.log('✅ Customer rehydrates Cash payment mode accurately on page refresh!');

  // Step 6: Waiter settles & vacates
  console.log('\n💳 Step 6: Waiter confirms payment and settles Seat #03...');
  const settleRes = await fetch(`${BACKEND_URL}/api/payments/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seatId: 3,
      gateway: 'CASH',
      settledByRole: 'WAITER',
    }),
  }).then(r => r.json());
  console.log('Settlement response:', settleRes.success ? 'SUCCESS' : settleRes);

  // Check that bill mode is cleanly cleared post settlement
  const postSettleCheck = await fetch(`${BACKEND_URL}/api/seats/3/bill-mode`).then(r => r.json());
  console.log('Bill mode post-settle:', postSettleCheck);
  if (postSettleCheck.active && postSettleCheck.mode) {
    throw new Error('Active bill mode was not cleared after settlement!');
  }
  console.log('✅ Bill mode cleanly cleared post settlement!');

  customerSocket.disconnect();
  waiterSocket.disconnect();

  console.log('\n🎉 ALL PAY-VIA-WAITER MODE SYNC & REFRESH TESTS PASSED 100%!');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
