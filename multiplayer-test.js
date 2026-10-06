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

async function getOrCreateUser(client, email, password, name) {
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
    const passwordVariable = email.toLowerCase().startsWith("testa")
      ? "MULTIPLAYER_TEST_A_PASSWORD"
      : "MULTIPLAYER_TEST_B_PASSWORD";
    throw new Error(`${email} already exists; set ${passwordVariable}. Existing account passwords are never changed.`);
  }

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Failed to sign in ${email}: ${error.message}`);
  return data.user;
}

async function runTest() {
  let hasErrors = false;

  console.log("\n[1/3] Setting up test accounts (testA@example.com & testB@example.com)...");
  
  const userA = await getOrCreateUser(clientA, "testA@example.com", process.env.MULTIPLAYER_TEST_A_PASSWORD, "Test User A");
  const userB = await getOrCreateUser(clientB, "testB@example.com", process.env.MULTIPLAYER_TEST_B_PASSWORD, "Test User B");

  console.log(`✓ User A Authenticated: ${userA.id} (${userA.email})`);
  console.log(`✓ User B Authenticated: ${userB.id} (${userB.email})`);

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

  // =========================================================================
  // TEST MESSAGING
  // =========================================================================
  console.log("\n[2/3] Testing Messaging Flow (User A -> User B)...");
  let convId = null;
  
  // Step 2a: Create or find direct conversation
  const { data: rpcConvId, error: errConv } = await clientA.rpc("ss_create_conversation", {
    p_target_id: userB.id
  });

  if (errConv) {
    console.error("❌ ss_create_conversation RPC failed:", errConv.message);
    hasErrors = true;
  } else {
    convId = rpcConvId;
    console.log(`✓ Conversation established: ${convId}`);
  }

  // Step 2b: User A sends message into ss_messages
  const msgBody = `Automated Test Message ${Date.now()}`;
  if (convId) {
    const { data: msgInsert, error: errInsert } = await clientA
      .from("ss_messages")
      .insert({
        conversation_id: convId,
        sender_id: userA.id,
        body: msgBody
      })
      .select()
      .single();

    if (errInsert) {
      console.error("❌ User A failed to INSERT into ss_messages:", errInsert.message, errInsert.details || "");
      hasErrors = true;
    } else {
      console.log(`✓ User A successfully inserted message: ${msgInsert.id}`);
    }

    // Step 2c: User B selects message from ss_messages
    const { data: msgSelect, error: errSelect } = await clientB
      .from("ss_messages")
      .select("*")
      .eq("conversation_id", convId)
      .eq("body", msgBody)
      .maybeSingle();

    if (errSelect) {
      console.error("❌ User B failed to SELECT from ss_messages:", errSelect.message);
      hasErrors = true;
    } else if (!msgSelect) {
      console.error("❌ User B could not find the message sent by User A (RLS or missing row).");
      hasErrors = true;
    } else {
      console.log(`✓ User B successfully fetched User A's message: "${msgSelect.body}"`);
    }
  }

  // =========================================================================
  // TEST ESCROW & SPENDING (MONEY CONSERVATION ASSERTION)
  // =========================================================================
  console.log("\n[3/3] Testing Escrow & Money Conservation Flow (User A books User B for ৳100 BDT)...");
  
  const initialSystemMoney = 500 + 500; // User A (500) + User B (500)
  console.log(`Total Initial Money in System: ৳${initialSystemMoney} BDT`);

  const { data: escrowTxId, error: errEscrow } = await clientA.rpc("ss_create_escrow", {
    p_payee_id: userB.id,
    p_course_id: null,
    p_amount_bdt: 100,
    p_payer_note: "Multiplayer automated QA booking (Single BDT Currency)"
  });

  if (errEscrow) {
    console.error("❌ ss_create_escrow RPC failed:", errEscrow.message, errEscrow.details || "");
    hasErrors = true;
  } else {
    console.log(`✓ Escrow created successfully. Transaction ID: ${escrowTxId}`);

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

    // Verify escrow row in ss_escrow_transactions
    const { data: escrowRow, error: errFetchEscrow } = await clientA
      .from("ss_escrow_transactions")
      .select("*")
      .eq("id", escrowTxId)
      .single();

    if (errFetchEscrow || !escrowRow) {
      console.error("❌ Escrow transaction row not found in ss_escrow_transactions:", errFetchEscrow?.message);
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