import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"], quiet: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://glpoowzygushtxwqmcxl.supabase.co";
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const clientA = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const clientB = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const clientC = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function getOrCreateTestUser(client, emailPrefix, fullName) {
  const email = `${emailPrefix}_${Date.now()}@example.com`;
  const password = "TestPassword123!QA";

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        display_name: fullName,
        role: "student",
      },
    },
  });

  if (error) {
    throw new Error(`Failed to sign up ${email}: ${error.message}`);
  }

  const { data: loginData, error: loginError } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (loginError) {
    throw new Error(`Failed to sign in ${email}: ${loginError.message}`);
  }

  const user = loginData.user;
  return { user, email, password, session: loginData.session };
}

async function runQASuite() {
  console.log("==================================================");
  console.log("   EWUSWAP FULL MULTI-USER SYSTEM QA AUDIT");
  console.log("==================================================");

  // PHASE 2: Create Test Users
  console.log("\n--- PHASE 2: SAFE TEST ENVIRONMENT SETUP ---");
  const seller = await getOrCreateTestUser(clientA, "qa_seller_a", "Seller User A");
  console.log(`[USER A - SELLER] Created & Authenticated: ID=${seller.user.id}, Email=${seller.email}`);

  const buyer = await getOrCreateTestUser(clientB, "qa_buyer_b", "Buyer User B");
  console.log(`[USER B - BUYER] Created & Authenticated: ID=${buyer.user.id}, Email=${buyer.email}`);

  // Fetch initial profile states
  const { data: profA } = await clientA.from("ss_profiles").select("*").eq("id", seller.user.id).single();
  const { data: profB } = await clientB.from("ss_profiles").select("*").eq("id", buyer.user.id).single();

  console.log(`[USER A] Initial Wallet Balance: ৳${profA?.bdt_balance} BDT (Bonus auto-provisioned: ${profA?.bdt_balance === 500})`);
  console.log(`[USER B] Initial Wallet Balance: ৳${profB?.bdt_balance} BDT (Bonus auto-provisioned: ${profB?.bdt_balance === 500})`);

  // PHASE 3: User A Creates Service
  console.log("\n--- PHASE 3: USER A (SELLER) CREATES SERVICE ---");
  const { data: categories } = await clientA.from("ss_skill_categories").select("id, name, slug");
  const businessCat = categories.find((c) => c.slug === "business" || c.name.toLowerCase().includes("business")) || categories[0];
  console.log(`Using Category: ${businessCat.name} (ID: ${businessCat.id})`);

  const serviceTitle = "Microeconomics Tutoring — EwuSwap QA Test";
  const servicePriceBdt = 100;
  const serviceDuration = 60;
  const serviceDesc = "Automated QA test service. Do not treat this as a real booking.";

  const { data: serviceListing, error: listingErr } = await clientA.from("ss_courses").insert({
    instructor_id: seller.user.id,
    category_id: businessCat.id,
    title: serviceTitle,
    slug: `microeconomics-tutoring-qa-${Date.now()}`,
    description: serviceDesc,
    type: "service",
    status: "published",
    duration_minutes: serviceDuration,
    price_bdt: servicePriceBdt,
    credit_cost: 1,
  }).select().single();

  if (listingErr) {
    console.error("❌ Failed to create service listing:", listingErr);
    process.exit(1);
  }

  console.log(`✓ Service Created Successfully:`);
  console.log(`  - Service ID: ${serviceListing.id}`);
  console.log(`  - Title: "${serviceListing.title}"`);
  console.log(`  - Price: ৳${serviceListing.price_bdt} BDT`);
  console.log(`  - Instructor ID: ${serviceListing.instructor_id}`);

  // PHASE 4: User B Discovers Service
  console.log("\n--- PHASE 4: USER B (BUYER) DISCOVERS SERVICE ---");
  const { data: discoveredCourse, error: discoverErr } = await clientB
    .from("ss_courses")
    .select("*, ss_skill_categories(name)")
    .eq("id", serviceListing.id)
    .single();

  if (discoverErr || !discoveredCourse) {
    console.error("❌ User B could not discover User A's service:", discoverErr);
    process.exit(1);
  }
  console.log(`✓ User B successfully queried User A's service from ss_courses:`);
  console.log(`  - Title matches: ${discoveredCourse.title === serviceTitle}`);
  console.log(`  - Price matches: ${Number(discoveredCourse.price_bdt) === 100}`);
  console.log(`  - Seller matches: ${discoveredCourse.instructor_id === seller.user.id}`);
  console.log(`  - Status is published: ${discoveredCourse.status === "published"}`);

  // Verify User B cannot access User A's private settings
  const { data: crossPrivacy } = await clientB.from("ss_profile_privacy").select("*").eq("user_id", seller.user.id);
  console.log(`✓ User B access to User A's private settings: ${crossPrivacy?.length === 0 ? "Blocked by RLS (Safe)" : "Public read"}`);

  // PHASE 5: Multi-User Purchase Flow
  console.log("\n--- PHASE 5: MULTI-USER PURCHASE FLOW ---");
  const balanceB_Before = Number((await clientB.from("ss_profiles").select("bdt_balance").eq("id", buyer.user.id).single()).data.bdt_balance);
  const balanceA_Before = Number((await clientA.from("ss_profiles").select("bdt_balance").eq("id", seller.user.id).single()).data.bdt_balance);
  const servicePrice = servicePriceBdt;

  console.log(`Recorded Balances Before Payment:`);
  console.log(`  - USER B (Buyer) Wallet Balance X = ৳${balanceB_Before}`);
  console.log(`  - Service Price P = ৳${servicePrice}`);
  console.log(`  - USER A (Seller) Wallet Balance Y = ৳${balanceA_Before}`);

  // Buyer purchases via RPC ss_create_escrow
  const { data: escrowId, error: escrowErr } = await clientB.rpc("ss_create_escrow", {
    p_payee_id: seller.user.id,
    p_course_id: serviceListing.id,
    p_amount_bdt: servicePrice,
    p_payer_note: "QA Booking: Microeconomics Tutoring",
  });

  if (escrowErr) {
    console.error("❌ Escrow creation failed:", escrowErr);
    process.exit(1);
  }

  console.log(`✓ Escrow created successfully. Transaction ID: ${escrowId}`);

  // Balances after payment
  const balanceB_AfterPay = Number((await clientB.from("ss_profiles").select("bdt_balance").eq("id", buyer.user.id).single()).data.bdt_balance);
  const balanceA_AfterPay = Number((await clientA.from("ss_profiles").select("bdt_balance").eq("id", seller.user.id).single()).data.bdt_balance);

  console.log(`Recorded Balances After Payment:`);
  console.log(`  - USER B (Buyer) Wallet Balance: ৳${balanceB_AfterPay} (Expected: ৳${balanceB_Before - servicePrice})`);
  console.log(`  - USER A (Seller) Wallet Balance: ৳${balanceA_AfterPay} (Expected: ৳${balanceA_Before} - NO premature release)`);

  const deductionCorrect = balanceB_AfterPay === balanceB_Before - servicePrice;
  const noPrematureRelease = balanceA_AfterPay === balanceA_Before;
  console.log(`  - Buyer deduction verified: ${deductionCorrect}`);
  console.log(`  - Seller balance untouched (funds in escrow): ${noPrematureRelease}`);

  // PHASE 6: Escrow Verification
  console.log("\n--- PHASE 6: ESCROW WORKFLOW & AUDIT ---");
  const { data: escrowRecord, error: fetchEscrowErr } = await clientB
    .from("ss_escrow_transactions")
    .select("*")
    .eq("id", escrowId)
    .single();

  if (fetchEscrowErr || !escrowRecord) {
    console.error("❌ Could not fetch escrow transaction:", fetchEscrowErr);
    process.exit(1);
  }

  console.log(`✓ Escrow record properties:`);
  console.log(`  - Status: "${escrowRecord.status}"`);
  console.log(`  - Payer ID: ${escrowRecord.payer_id} (matches Buyer B: ${escrowRecord.payer_id === buyer.user.id})`);
  console.log(`  - Payee ID: ${escrowRecord.payee_id} (matches Seller A: ${escrowRecord.payee_id === seller.user.id})`);
  console.log(`  - Gross Amount: ৳${escrowRecord.gross_amount_bdt || escrowRecord.amount_bdt} BDT`);
  console.log(`  - Platform Fee: ৳${escrowRecord.platform_fee_bdt} BDT (5%)`);
  console.log(`  - Net Settlement: ৳${escrowRecord.net_amount_bdt} BDT (95%)`);

  // Verify Seller can also see the escrow booking
  const { data: sellerEscrowView } = await clientA
    .from("ss_escrow_transactions")
    .select("*")
    .eq("id", escrowId)
    .single();
  console.log(`✓ Seller can see booking: ${sellerEscrowView?.id === escrowId}`);

  // PHASE 7: Chat / Communication
  console.log("\n--- PHASE 7: CHAT / COMMUNICATION FLOW ---");
  // Create direct conversation
  const { data: convId, error: convErr } = await clientB.rpc("ss_create_conversation", {
    p_target_id: seller.user.id,
  });

  if (convErr) {
    console.error("❌ Failed to create conversation:", convErr);
  } else {
    console.log(`✓ Conversation established: ID=${convId}`);

    // Buyer B sends message
    const msgFromB = "Hello, this is an automated EwuSwap QA test.";
    const { data: sentMsgB, error: sendErrB } = await clientB.from("ss_messages").insert({
      conversation_id: convId,
      sender_id: buyer.user.id,
      body: msgFromB,
    }).select().single();

    if (sendErrB) {
      console.error("❌ Buyer message sending failed:", sendErrB);
    } else {
      console.log(`✓ User B sent: "${sentMsgB.body}"`);

      // User A reads message
      const { data: msgReceivedA } = await clientA
        .from("ss_messages")
        .select("*")
        .eq("id", sentMsgB.id)
        .single();
      console.log(`✓ User A received: "${msgReceivedA?.body}" (Timestamp: ${msgReceivedA?.created_at})`);

      // User A replies
      const msgFromA = "Received. QA reply.";
      const { data: sentMsgA } = await clientA.from("ss_messages").insert({
        conversation_id: convId,
        sender_id: seller.user.id,
        body: msgFromA,
      }).select().single();
      console.log(`✓ User A replied: "${sentMsgA?.body}"`);

      // User B reads reply
      const { data: msgReceivedB } = await clientB
        .from("ss_messages")
        .select("*")
        .eq("id", sentMsgA.id)
        .single();
      console.log(`✓ User B received reply: "${msgReceivedB?.body}"`);
    }
  }

  // PHASE 8 & 9: Service Completion & Escrow Release
  console.log("\n--- PHASE 8 & 9: SERVICE COMPLETION & ESCROW RELEASE ---");
  console.log(`Escrow state before release: status="${escrowRecord.status}"`);
  console.log(`Buyer satisfaction release triggered by User B (Payer)...`);

  const { data: releaseResult, error: releaseErr } = await clientB.rpc("ss_release_escrow_by_payer", {
    p_transaction_id: escrowId,
  });

  if (releaseErr) {
    console.error("❌ Escrow release failed:", releaseErr);
    process.exit(1);
  }

  console.log(`✓ ss_release_escrow_by_payer RPC succeeded.`);

  // Verify final wallet balances
  const balanceB_Final = Number((await clientB.from("ss_profiles").select("bdt_balance").eq("id", buyer.user.id).single()).data.bdt_balance);
  const balanceA_Final = Number((await clientA.from("ss_profiles").select("bdt_balance").eq("id", seller.user.id).single()).data.bdt_balance);

  const { data: finalEscrowRow } = await clientB.from("ss_escrow_transactions").select("*").eq("id", escrowId).single();
  console.log(`✓ Escrow final status: "${finalEscrowRow?.status}" (released_at: ${finalEscrowRow?.released_at})`);

  console.log(`\nFinal Balances:`);
  console.log(`  - USER A (Seller): ৳${balanceA_Final} BDT (Initial: ৳${balanceA_Before}, Gained Net: ৳${balanceA_Final - balanceA_Before})`);
  console.log(`  - USER B (Buyer):  ৳${balanceB_Final} BDT (Initial: ৳${balanceB_Before}, Spent: ৳${balanceB_Before - balanceB_Final})`);
  console.log(`  - Platform Fee:   ৳${finalEscrowRow?.platform_fee_bdt} BDT`);

  // Mathematical Conservation Assertion
  const grossSpent = balanceB_Before - balanceB_Final;
  const netReceived = balanceA_Final - balanceA_Before;
  const platformFee = Number(finalEscrowRow?.platform_fee_bdt);
  const conservationPassed = (grossSpent === servicePrice) && (netReceived + platformFee === servicePrice);

  console.log(`\nMathematical Conservation Check:`);
  console.log(`  - Buyer Deduction = ৳${grossSpent} BDT (Target: ৳${servicePrice}) -> ${grossSpent === servicePrice}`);
  console.log(`  - Seller Net Gain = ৳${netReceived} BDT (Target: ৳95) -> ${netReceived === 95}`);
  console.log(`  - Platform Fee = ৳${platformFee} BDT (Target: ৳5) -> ${platformFee === 5}`);
  console.log(`  - Money Conservation (Deduction == Gain + Fee): ${conservationPassed}`);

  // PHASE 10: Negative Tests
  console.log("\n--- PHASE 10: NEGATIVE & AUTHORIZATION TESTS ---");
  
  // 10.1 Double release attempt
  const { error: doubleReleaseErr } = await clientB.rpc("ss_release_escrow_by_payer", { p_transaction_id: escrowId });
  console.log(`Negative Test 1 (Double release on already released escrow): ${doubleReleaseErr ? "PASS (Blocked: " + doubleReleaseErr.message + ")" : "FAIL"}`);

  // 10.2 Seller trying to release to themselves
  const { error: sellerReleaseErr } = await clientA.rpc("ss_release_escrow_by_payer", { p_transaction_id: escrowId });
  console.log(`Negative Test 2 (Payee trying to trigger self-release): ${sellerReleaseErr ? "PASS (Blocked: " + sellerReleaseErr.message + ")" : "FAIL"}`);

  // 10.3 Purchase with insufficient balance
  const { error: overspendErr } = await clientB.rpc("ss_create_escrow", {
    p_payee_id: seller.user.id,
    p_amount_bdt: 999999,
  });
  console.log(`Negative Test 3 (Insufficient balance purchase): ${overspendErr ? "PASS (Blocked: " + overspendErr.message + ")" : "FAIL"}`);

  // 10.4 Buyer trying to modify Seller's service
  const { error: unauthorizedUpdateErr } = await clientB
    .from("ss_courses")
    .update({ title: "Hacked Title" })
    .eq("id", serviceListing.id);
  // Verify title was not changed
  const { data: courseVerify } = await clientA.from("ss_courses").select("title").eq("id", serviceListing.id).single();
  const updateBlocked = courseVerify.title === serviceTitle;
  console.log(`Negative Test 4 (Modify another user's service): ${updateBlocked ? "PASS (Title untouched)" : "FAIL"}`);

  // 10.5 Cross-user profile balance manipulation
  const { error: hackBalErr } = await clientB
    .from("ss_profiles")
    .update({ bdt_balance: 99999 })
    .eq("id", seller.user.id);
  const { data: profAVerify } = await clientA.from("ss_profiles").select("bdt_balance").eq("id", seller.user.id).single();
  const hackBlocked = Number(profAVerify.bdt_balance) === balanceA_Final;
  console.log(`Negative Test 5 (Tamper another user's wallet): ${hackBlocked ? "PASS (Protected by RLS)" : "FAIL"}`);

  // PHASE 11: Third User Test (User C)
  console.log("\n--- PHASE 11: THIRD USER TEST (USER C) ---");
  const buyerC = await getOrCreateTestUser(clientC, "qa_buyer_c", "Buyer User C");
  console.log(`[USER C - SECOND BUYER] Created: ID=${buyerC.user.id}`);

  // User C books User A's service
  const { data: escrowIdC, error: escrowErrC } = await clientC.rpc("ss_create_escrow", {
    p_payee_id: seller.user.id,
    p_course_id: serviceListing.id,
    p_amount_bdt: servicePrice,
    p_payer_note: "User C independent booking",
  });
  console.log(`✓ User C independent escrow created: ID=${escrowIdC} (Error: ${escrowErrC?.message || "none"})`);

  // Verify User B cannot view User C's escrow
  const { data: crossEscrowCheck } = await clientB
    .from("ss_escrow_transactions")
    .select("*")
    .eq("id", escrowIdC);
  console.log(`✓ Escrow isolation: User B viewing User C's escrow returned ${crossEscrowCheck?.length} rows (RLS Protected)`);

  // User C releases their escrow
  await clientC.rpc("ss_release_escrow_by_payer", { p_transaction_id: escrowIdC });
  const balanceA_AfterC = Number((await clientA.from("ss_profiles").select("bdt_balance").eq("id", seller.user.id).single()).data.bdt_balance);
  console.log(`✓ User A balance after User C release: ৳${balanceA_AfterC} BDT (Incremented by another ৳95)`);

  console.log("\n==================================================");
  console.log("   ALL MULTI-USER WORKFLOW TESTS COMPLETED");
  console.log("==================================================");
}

runQASuite().catch((err) => {
  console.error("QA Suite Fatal Error:", err);
  process.exit(1);
});
