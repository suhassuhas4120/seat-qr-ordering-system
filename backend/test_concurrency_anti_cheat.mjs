import assert from 'assert';

const BASE_URL = 'http://localhost:4000';

async function run() {
  console.log('🧪 Starting Concurrency, Anti-Hijack, Anti-Swap & Anti-Cheat Suite...\n');

  // Ensure Seat 25 is vacant first
  await fetch(`${BASE_URL}/api/payments/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seatId: 25, gateway: 'CASH', settledByRole: 'MANAGER' }),
  });

  // Check 1: Initial state of Seat 25
  const occ0 = await (await fetch(`${BASE_URL}/api/seats/25/occupancy?deviceToken=device_A`)).json();
  assert.strictEqual(occ0.isOccupied, false, 'Seat 25 should be initially vacant');
  assert.strictEqual(occ0.isOwner, false, 'Nobody should own Seat 25 initially');
  console.log('✅ Check 1 Passed: Seat 25 is initially vacant.');

  // Check 2: Two devices placing order at the EXACT same millisecond (Concurrency Race)
  console.log('\n⚡ Simulating Device A and Device B firing order placement in the same millisecond...');
  const orderA_Promise = fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-token': 'device_A' },
    body: JSON.stringify({
      seatId: 25,
      deviceToken: 'device_A',
      items: [{ menuItemId: 1, quantity: 2, notes: 'Order from Device A' }],
      createdByRole: 'CUSTOMER',
    }),
  });

  const orderB_Promise = fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-token': 'device_B' },
    body: JSON.stringify({
      seatId: 25,
      deviceToken: 'device_B',
      items: [{ menuItemId: 2, quantity: 1, notes: 'Order from Device B' }],
      createdByRole: 'CUSTOMER',
    }),
  });

  const [resA, resB] = await Promise.all([orderA_Promise, orderB_Promise]);

  const statusA = resA.status;
  const statusB = resB.status;
  console.log(`Response Statuses: Device A = ${statusA}, Device B = ${statusB}`);

  // Exactly one device must succeed (201) and the other must be rejected (409 Conflict)
  assert.ok(
    (statusA === 201 && statusB === 409) || (statusA === 409 && statusB === 201),
    `Exactly one order must succeed (201) and one must be rejected (409), got A:${statusA}, B:${statusB}`
  );

  const winningDevice = statusA === 201 ? 'device_A' : 'device_B';
  const losingDevice = statusA === 201 ? 'device_B' : 'device_A';
  const losingRes = statusA === 201 ? resB : resA;
  const losingData = await losingRes.json();

  assert.ok(
    losingData.error.includes('SEAT_ALREADY_OCCUPIED') || losingData.error.includes('occupied'),
    `Losing device must receive clear seat occupied error, got: ${losingData.error}`
  );
  console.log(`✅ Check 2 Passed: Mutex race resolved perfectly! Winner: ${winningDevice}, Loser rejected with 409 (${losingData.error})`);

  // Check 3: Seat Occupancy and Ownership isolation
  const occWinner = await (await fetch(`${BASE_URL}/api/seats/25/occupancy?deviceToken=${winningDevice}`)).json();
  const occStranger = await (await fetch(`${BASE_URL}/api/seats/25/occupancy?deviceToken=${losingDevice}`)).json();
  console.log('occWinner:', occWinner);
  console.log('occStranger:', occStranger);

  assert.strictEqual(occWinner.isOccupied, true, 'Winner must see seat is occupied');
  assert.strictEqual(occWinner.isOwner, true, 'Winner MUST be identified as isOwner: true');

  assert.strictEqual(occStranger.isOccupied, true, 'Stranger must see seat is occupied');
  assert.strictEqual(occStranger.isOwner, false, 'Stranger MUST be identified as isOwner: false');
  console.log('✅ Check 3 Passed: Ownership strictly isolated! Winner isOwner=true, Stranger isOwner=false.');

  // Check 4: Anti-Hopping & Anti-Cheat (Winning customer cannot place orders at another table while owing Seat 25)
  console.log('\n⚡ Testing Anti-Cheat: Winning customer tries to order at Seat 26 without paying for Seat 25...');
  const cheatRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-token': winningDevice },
    body: JSON.stringify({
      seatId: 26,
      deviceToken: winningDevice,
      items: [{ menuItemId: 3, quantity: 1 }],
      createdByRole: 'CUSTOMER',
    }),
  });

  assert.strictEqual(cheatRes.status, 409, 'Ordering at a second table must be blocked with 409');
  const cheatData = await cheatRes.json();
  assert.ok(
    cheatData.error.includes('ACTIVE_SESSION_EXISTS'),
    `Error must indicate active unsettled meal, got: ${cheatData.error}`
  );
  console.log(`✅ Check 4 Passed: Anti-Cheat blocked cross-table order (${cheatData.error})`);

  // Check 5: Active Table Detection across devices
  const occSeat26 = await (await fetch(`${BASE_URL}/api/seats/26/occupancy?deviceToken=${winningDevice}`)).json();
  assert.strictEqual(occSeat26.activeSeatIdForDevice, 25, 'Device scanning Seat 26 must detect it is locked to Seat 25');
  console.log('✅ Check 5 Passed: ActiveSeatIdForDevice correctly reports Seat 25 when scanning Seat 26.');

  // Check 6: Add More Dishes by Winning Customer (should be allowed on SAME seat)
  console.log('\n⚡ Testing Add More Dishes by true owner on Seat 25...');
  const addDishesRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-token': winningDevice },
    body: JSON.stringify({
      seatId: 25,
      deviceToken: winningDevice,
      items: [{ menuItemId: 4, quantity: 1, notes: 'Extra Kebab' }],
      createdByRole: 'CUSTOMER',
    }),
  });
  assert.strictEqual(addDishesRes.status, 201, 'Owner must be able to add more dishes to their table');
  console.log('✅ Check 6 Passed: Owner successfully added dishes to existing active tab.');

  // Check 7: Clean settlement releases seat
  console.log('\n⚡ Settle Seat 25 bill...');
  const payRes = await fetch(`${BASE_URL}/api/payments/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seatId: 25, gateway: 'CASH', settledByRole: 'MANAGER' }),
  });
  assert.strictEqual(payRes.status, 200, 'Payment settlement must succeed');

  const occAfterPay = await (await fetch(`${BASE_URL}/api/seats/25/occupancy?deviceToken=${winningDevice}`)).json();
  assert.strictEqual(occAfterPay.isOccupied, false, 'Seat 25 must be vacant after settlement');
  console.log('✅ Check 7 Passed: Seat 25 is successfully vacated upon bill payment.');

  console.log('\n🎉 ALL 7 CONCURRENCY, ANTI-HIJACK, ANTI-SWAP & ANTI-CHEAT CHECKS PASSED WITH 100% SUCCESS!');
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
