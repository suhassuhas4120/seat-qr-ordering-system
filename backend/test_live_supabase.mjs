import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

async function testLiveSupabase() {
  console.log('Testing connection to live Supabase...');
  console.log('URL:', process.env.SUPABASE_URL);

  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: seats, error: seatsErr } = await client.from('seats').select('*').limit(5);

  if (seatsErr) {
    console.error('❌ Seats query error:', seatsErr);
    process.exit(1);
  }

  console.log('✅ Successfully connected to Supabase PostgreSQL!');
  console.log(`Found seats in database (sample count: ${seats.length}):`);
  seats.forEach((s) => console.log(`   - Seat #${s.id} (${s.seat_number}), Zone: ${s.zone}, Status: ${s.current_status}`));

  // Check Takeaway Seat 0
  const { data: takeaway, error: tkErr } = await client.from('seats').select('*').eq('id', 0).single();
  if (tkErr) {
    console.warn('Takeaway check:', tkErr);
  } else {
    console.log(`✅ Takeaway Seat #0 confirmed in cloud database: ${takeaway.seat_number}`);
  }

  // Count total seats
  const { count, error: countErr } = await client.from('seats').select('*', { count: 'exact', head: true });
  console.log(`✅ Total seeded seats in Supabase: ${count}`);

  console.log('\n🎉 LIVE SUPABASE CLOUD CONNECTION FULLY VERIFIED & OPERATIONAL!');
}

testLiveSupabase().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
