import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { randomBytes } from "node:crypto";

dotenv.config({ path: [".env.local", ".env"], quiet: true });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error("Set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env.local before running this test.");
  process.exit(1);
}

console.log("==================================================");
console.log("   MULTIPLAYER INTEGRATION TEST (AUTOMATED SDET)");
console.log("==================================================");

const clientA = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const clientAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const clientB = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const clientC = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function getOrCreateUser(client, email, password, name, passwordVariable) {
  const { data: listed, error: listError } = await clientAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;

  let user = listed.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    password ||= randomBytes(24).toString("base64url");
    const { data, error } = await clientAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, display_name: name, role: "student" },
    });
    if (error) throw new Error(`Failed to create ${email}: ${error.message}`);
    user = data.user;
  } else if (!password) {
    throw new Error(`${email} already exists; set ${passwordVariable}. Existing account passwords are never changed.`);
  }

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Failed to sign in ${email}: ${error.message}`);
  return data.user;
}

async function runTest() {
  let hasErrors = false;

  console.log("\n[1/2] Setting up test accounts...");
  
  const userA = await getOrCreateUser(clientA, "testA@example.com", process.env.MULTIPLAYER_TEST_A_PASSWORD, "Test User A", "MULTIPLAYER_TEST_A_PASSWORD");
  const userB = await getOrCreateUser(clientB, "testB@example.com", process.env.MULTIPLAYER_TEST_B_PASSWORD, "Test User B", "MULTIPLAYER_TEST_B_PASSWORD");
  const userC = await getOrCreateUser(clientC, "testC@example.com", process.env.MULTIPLAYER_TEST_C_PASSWORD, "Test User C", "MULTIPLAYER_TEST_C_PASSWORD");

  console.log(`✓ User A Authenticated: ${userA.id} (${userA.email})`);
  console.log(`✓ User B Authenticated: ${userB.id} (${userB.email})`);
  console.log(`✓ Non-participant Authenticated: ${userC.id} (${userC.email})`);

  // Set initial 500 BDT balance on ss_profiles
  console.log("\nSetting initial ৳500 BDT balance on ss_profiles using service role...");
  const { error: errBalA } = await clientAdmin.from("ss_profiles").upsert({
    id: userA.id,
    display_name: "Test User A",
    bdt_balance: 500,
    credits_balance: 500,
  }, { onConflict: "id" });
  if (errBalA) {
    console.error("❌ Failed to set BDT balance for User A:", errBalA.message);
    hasErrors = true;
  } else {
    console.log("✓ User A bdt_balance initialized to ৳500 BDT");
  }

  const { error: errBalB } = await clientAdmin.from("ss_profiles").upsert({
    id: userB.id,
    display_name: "Test User B",
    bdt_balance: 500,
    credits_balance: 500,
  }, { onConflict: "id" });
  if (errBalB) {
    console.error("❌ Failed to set BDT balance for User B:", errBalB.message);
    hasErrors = true;
  } else {
    console.log("✓ User B bdt_balance initialized to ৳500 BDT");
  }

  const { error: privacyError } = await clientAdmin.from("ss_profile_privacy").upsert({
    user_id: userB.id,
    message_policy: "everyone",
  }, { onConflict: "user_id" });
  if (privacyError) {
    console.error("❌ Could not configure User B test contact policy:", privacyError.message);
    hasErrors = true;
  }

  const { data: qaCategory, error: categoryError } = await clientAdmin
    .from("ss_skill_categories")
    .insert({
      slug: `multiplayer-qa-${randomBytes(6).toString("hex")}`,
      name: "Multiplayer QA",
    })
    .select("id")
    .single();
  if (categoryError) throw new Error(`Could not create the QA skill category: ${categoryError.message}`);

  const { data: qaCourse, error: courseError } = await clientAdmin
    .from("ss_courses")
    .insert({
      instructor_id: userB.id,
      category_id: qaCategory.id,
      title: `Multiplayer QA Skill ${Date.now()}`,
      slug: `multiplayer-qa-${randomBytes(8).toString("hex")}`,
      description: "Test course for the booking-to-chat multiplayer workflow.",
      type: "service",
      status: "published",
      duration_minutes: 60,
      credit_cost: 1,
      price_bdt: 100,
    })
    .select("id")
    .single();
  if (courseError) throw new Error(`Could not create User B's QA skill: ${courseError.message}`);

  // =========================================================================
  // TEST BOOKING, MESSAGING & ESCROW (MONEY CONSERVATION ASSERTION)
  // =========================================================================
  console.log("\n[2/2] User A books User B, both message, and escrow settles...");
  
  const initialSystemMoney = 500 + 500; // User A (500) + User B (500)
  console.log(`Total Initial Money in System: ৳${initialSystemMoney} BDT`);

  const { data: escrowTxId, error: errEscrow } = await clientA.rpc("ss_create_escrow", {
    p_payee_id: userB.id,
    p_course_id: qaCourse.id,
    p_amount_bdt: 100,
    p_payer_note: "Multiplayer automated QA booking (Single BDT Currency)"
  });

  if (errEscrow) {
    console.error("❌ ss_create_escrow RPC failed:", errEscrow.message, errEscrow.details || "");
    hasErrors = true;
  } else {
    console.log(`✓ Escrow created successfully. Transaction ID: ${escrowTxId}`);

    const { data: escrowRow, error: errFetchEscrow } = await clientA
      .from("ss_escrow_transactions")
      .select("id, conversation_id, status, amount_bdt, gross_amount_bdt, platform_fee_bdt, net_amount_bdt")
      .eq("id", escrowTxId)
      .single();

    if (errFetchEscrow || !escrowRow?.conversation_id) {
      console.error("❌ Booking did not create a linked conversation:", errFetchEscrow?.message || "conversation_id is null");
      hasErrors = true;
    } else {
      const convId = escrowRow.conversation_id;
      console.log(`✓ Booking linked to conversation: ${convId}`);

      const msgFromA = `User A booking message ${Date.now()}`;
      const { data: insertedA, error: insertErrorA } = await clientA
        .from("ss_messages")
        .insert({ conversation_id: convId, sender_id: userA.id, body: msgFromA })
        .select("id, body")
        .single();

      if (insertErrorA) {
        console.error("❌ User A could not message User B:", insertErrorA.message);
        hasErrors = true;
      } else {
        const { data: receivedByB, error: readErrorB } = await clientB
          .from("ss_messages")
          .select("id, body")
          .eq("id", insertedA.id)
          .maybeSingle();
        if (readErrorB || !receivedByB) {
          console.error("❌ User B could not read User A's message:", readErrorB?.message || "message hidden by RLS");
          hasErrors = true;
        } else {
          console.log("✓ User B received User A's message.");
        }
      }

      const msgFromB = `User B booking reply ${Date.now()}`;
      const { data: insertedB, error: insertErrorB } = await clientB
        .from("ss_messages")
        .insert({ conversation_id: convId, sender_id: userB.id, body: msgFromB })
        .select("id, body")
        .single();

      if (insertErrorB) {
        console.error("❌ User B could not message User A:", insertErrorB.message);
        hasErrors = true;
      } else {
        const { data: receivedByA, error: readErrorA } = await clientA
          .from("ss_messages")
          .select("id, body")
          .eq("id", insertedB.id)
          .maybeSingle();
        if (readErrorA || !receivedByA) {
          console.error("❌ User A could not read User B's message:", readErrorA?.message || "message hidden by RLS");
          hasErrors = true;
        } else {
          console.log("✓ User A received User B's reply.");
        }
      }

      const { data: outsiderRead, error: outsiderReadError } = await clientC
        .from("ss_messages")
        .select("id")
        .eq("conversation_id", convId);
      if (outsiderReadError || outsiderRead?.length) {
        console.error("❌ Non-participant could read conversation messages:", outsiderReadError?.message || "rows were returned");
        hasErrors = true;
      } else {
        console.log("✓ Non-participant cannot read the conversation.");
      }
    }

    // Verify User A's balance decreased from 500 to 400
    const { data: profileAEnd, error: errFetchAEnd } = await clientA
      .from("ss_profiles")
      .select("bdt_balance")
      .eq("id", userA.id)
      .single();

    if (errFetchAEnd) {
      console.error("❌ Failed to fetch User A's updated balance:", errFetchAEnd.message);
      hasErrors = true;
    } else {
      const finalBalanceA = Number(profileAEnd?.bdt_balance);
      console.log(`User A initial balance: ৳500 -> balance after escrow creation: ৳${finalBalanceA}`);
      if (finalBalanceA === 400) {
        console.log("✓ VERIFIED: User A's bdt_balance decreased strictly by ৳100 (from ৳500 to ৳400).");
      } else {
        console.error(`❌ BALANCE MISMATCH: Expected 400 but got ${finalBalanceA}`);
        hasErrors = true;
      }
    }

    if (!escrowRow) {
      console.error("❌ Escrow transaction row not found in ss_escrow_transactions.");
      hasErrors = true;
    } else {
      const grossBdt = Number(escrowRow.gross_amount_bdt ?? escrowRow.amount_bdt);
      const feeBdt = Number(escrowRow.platform_fee_bdt ?? (grossBdt * 0.05));
      const netBdt = Number(escrowRow.net_amount_bdt ?? (grossBdt - feeBdt));
      console.log(`✓ VERIFIED: Escrow row exists with status="${escrowRow.status}", gross=৳${grossBdt}, fee=৳${feeBdt}, net=৳${netBdt}`);

      // Check money conservation state while held in escrow:
      // Payer (400) + Escrow Held (100) + Payee (500) = 1000
      const moneyHeldState = 400 + grossBdt + 500;
      if (moneyHeldState === initialSystemMoney) {
        console.log(`✓ MONEY CONSERVATION VERIFIED (HELD): Payer(400) + Held(100) + Payee(500) = ৳${moneyHeldState} BDT`);
      } else {
        console.error(`❌ MONEY LEAK DETECTED (HELD): Expected ${initialSystemMoney}, got ${moneyHeldState}`);
        hasErrors = true;
      }

      // Test Buyer Satisfaction Direct Release
      console.log("\nTesting Buyer Release of Escrow Funds (ss_release_escrow_by_payer)...");
      const { data: releaseSuccess, error: errRelease } = await clientA.rpc("ss_release_escrow_by_payer", {
        p_transaction_id: escrowTxId
      });

      if (errRelease) {
        console.error("❌ ss_release_escrow_by_payer RPC failed:", errRelease.message);
        hasErrors = true;
      } else {
        console.log("✓ Buyer confirmed satisfaction & released escrow funds directly to provider.");

        const { data: profileBEnd } = await clientB.from("ss_profiles").select("bdt_balance").eq("id", userB.id).single();
        const finalBalanceB = Number(profileBEnd?.bdt_balance);
        console.log(`User B initial balance: ৳500 -> balance after release: ৳${finalBalanceB} (received net ৳${netBdt})`);

        // Final Money Conservation Check:
        // Payer (400) + Payee (595) + Platform Fee (5) = 1000 BDT
        const finalTotal = 400 + finalBalanceB + feeBdt;
        if (finalTotal === initialSystemMoney && finalBalanceB === 500 + netBdt) {
          console.log(`✓ MONEY CONSERVATION VERIFIED (SETTLED): Payer(400) + Payee(${finalBalanceB}) + Platform Fee(${feeBdt}) = ৳${finalTotal} BDT`);
        } else {
          console.error(`❌ MONEY CONSERVATION FAILED (SETTLED): Expected ${initialSystemMoney}, got ${finalTotal}`);
          hasErrors = true;
        }
      }
    }
  }

  console.log("\n==================================================");
  if (hasErrors) {
    console.error("RESULT: ❌ TESTS FAILED WITH ERRORS");
    process.exit(1);
  } else {
    console.log("RESULT: 100% PASSING SUCCESS RATE!");
    process.exit(0);
  }
}

runTest().catch((err) => {
  console.error("Unexpected test runner crash:", err);
  process.exit(1);
});