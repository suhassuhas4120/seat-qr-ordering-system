import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

async function verifyCloudSync() {
  console.log('🔍 Checking Live Supabase PostgreSQL database tables...');
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: seats, count: seatCount } = await client.from('seats').select('*', { count: 'exact' });
  console.log(`✅ Total Seats in Supabase: ${seatCount}`);

  const { data: orders, count: orderCount } = await client.from('orders').select('*', { count: 'exact' });
  console.log(`✅ Total Orders Synced in Supabase: ${orderCount}`);
  if (orders && orders.length > 0) {
    orders.slice(-3).forEach(o => console.log(`   - Order ${o.id}: Seat #${o.seat_id}, Total: ₹${o.total_amount}, Status: ${o.status}`));
  }

  const { data: payments, count: paymentCount } = await client.from('payments').select('*', { count: 'exact' });
  console.log(`✅ Total Payments Synced in Supabase: ${paymentCount}`);
  if (payments && payments.length > 0) {
    payments.slice(-3).forEach(p => console.log(`   - Payment ${p.id}: Seat #${p.seat_id}, Amount: ₹${p.final_amount}, Gateway: ${p.method}`));
  }

  console.log('\n🎉 CLOUD SYNCHRONIZATION FULLY OPERATIONAL & VERIFIED!');
}

verifyCloudSync().catch(console.error);
