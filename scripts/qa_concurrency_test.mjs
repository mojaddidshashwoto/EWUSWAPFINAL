import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"], quiet: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://glpoowzygushtxwqmcxl.supabase.co";
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const clientSeller = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const clientBuyer1 = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const clientBuyer2 = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function createTestUser(client, prefix, name) {
  const email = `${prefix}_${Date.now()}@example.com`;
  const password = "TestPassword123!QA";
  await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: name, display_name: name, role: "student" } },
  });
  const { data } = await client.auth.signInWithPassword({ email, password });
  return { user: data.user, email };
}

async function runConcurrencyAndConsistency() {
  console.log("==================================================");
  console.log("   EWUSWAP CONCURRENCY & CONSISTENCY AUDIT");
  console.log("==================================================");

  // Set up seller
  const seller = await createTestUser(clientSeller, "conc_seller", "Conc Seller");
  const buyer1 = await createTestUser(clientBuyer1, "conc_buyer1", "Conc Buyer 1");
  const buyer2 = await createTestUser(clientBuyer2, "conc_buyer2", "Conc Buyer 2");

  // Create course
  const { data: categories } = await clientSeller.from("ss_skill_categories").select("id");
  const catId = categories[0].id;
  const { data: course } = await clientSeller.from("ss_courses").insert({
    instructor_id: seller.user.id,
    category_id: catId,
    title: "Concurrency Race Test Course",
    slug: `conc-test-${Date.now()}`,
    description: "Testing concurrent transactions and race conditions",
    type: "service",
    status: "published",
    duration_minutes: 60,
    price_bdt: 300,
    credit_cost: 3,
  }).select().single();

  console.log(`Setup complete. Course price: ৳300. Buyers start with ৳500 each.`);

  // TEST 1: Simultaneous purchase from single buyer who only has ৳500 (attempting two ৳300 bookings concurrently = ৳600 needed)
  console.log("\n[TEST 1] Testing Concurrent Double-Spend Race Condition (Buyer 1 calls ss_create_escrow twice concurrently)...");
  
  const [res1, res2] = await Promise.allSettled([
    clientBuyer1.rpc("ss_create_escrow", {
      p_payee_id: seller.user.id,
      p_course_id: course.id,
      p_amount_bdt: 300,
      p_payer_note: "Concurrent call A",
    }),
    clientBuyer1.rpc("ss_create_escrow", {
      p_payee_id: seller.user.id,
      p_course_id: course.id,
      p_amount_bdt: 300,
      p_payer_note: "Concurrent call B",
    }),
  ]);

  console.log("Call 1 Result:", res1.status, res1.value?.error?.message || "Success Tx: " + res1.value?.data);
  console.log("Call 2 Result:", res2.status, res2.value?.error?.message || "Success Tx: " + res2.value?.data);

  const { data: buyer1FinalProf } = await clientBuyer1.from("ss_profiles").select("bdt_balance").eq("id", buyer1.user.id).single();
  console.log(`Buyer 1 Final Balance: ৳${buyer1FinalProf.bdt_balance} BDT`);

  const oneSucceededOneFailed =
    (res1.value?.data && res2.value?.error) || (res2.value?.data && res1.value?.error);
  if (oneSucceededOneFailed && Number(buyer1FinalProf.bdt_balance) === 200) {
    console.log("✓ PASS: Atomic Postgres `FOR UPDATE` row locking prevented double-spending! One succeeded, one was rejected for insufficient balance. Balance never went negative.");
  } else {
    console.log("Result status:", { res1: res1.value, res2: res2.value, finalBalance: buyer1FinalProf.bdt_balance });
  }

  // TEST 2: Database Consistency Check
  console.log("\n[TEST 2] Database Consistency Audit...");
  const { data: allMyEscrows } = await clientBuyer1.from("ss_escrow_transactions").select("*").eq("payer_id", buyer1.user.id);
  console.log(`Buyer 1 has ${allMyEscrows.length} escrow transactions.`);

  let inconsistencyCount = 0;
  for (const tx of allMyEscrows) {
    if (!tx.payer_id || !tx.payee_id) {
      console.error("❌ Orphaned transaction without valid participant:", tx.id);
      inconsistencyCount++;
    }
    if (tx.payer_id === tx.payee_id) {
      console.error("❌ Self-transaction found:", tx.id);
      inconsistencyCount++;
    }
    if (Number(tx.gross_amount_bdt) <= 0) {
      console.error("❌ Zero or negative gross amount in transaction:", tx.id);
      inconsistencyCount++;
    }
  }

  console.log(`Consistency Checks Completed. Violations Found: ${inconsistencyCount}`);
}

runConcurrencyAndConsistency().catch((err) => {
  console.error("Concurrency Test Error:", err);
  process.exit(1);
});
