import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://glpoowzygushtxwqmcxl.supabase.co";
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log("==================================================");
console.log("   MULTIPLAYER INTEGRATION TEST (AUTOMATED SDET)");
console.log("==================================================");

const clientA = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const clientB = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function getOrCreateUser(client, email, password, name) {
  const { data: signIn, error: signInErr } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (signIn?.user) {
    return signIn.user;
  }

  const { data: signUp, error: signUpErr } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        display_name: name,
        role: "student",
      },
    },
  });

  if (signUpErr) {
    throw new Error(`Failed to sign up ${email}: ${signUpErr.message}`);
  }

  const { data: reSignIn, error: reSignInErr } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (reSignInErr || !reSignIn?.user) {
    return signUp.user;
  }

  return reSignIn.user;
}

async function runTest() {
  let hasErrors = false;

  console.log("\n[1/3] Setting up test accounts (testA@example.com & testB@example.com)...");
  
  const userA = await getOrCreateUser(clientA, "testa@example.com", "Password123!", "Test User A");
  const userB = await getOrCreateUser(clientB, "testb@example.com", "Password123!", "Test User B");

  console.log(`✓ User A Authenticated: ${userA.id} (${userA.email})`);
  console.log(`✓ User B Authenticated: ${userB.id} (${userB.email})`);

  // Set initial 500 credit balance on ss_profiles
  console.log("\nSetting initial 500 credit balance on ss_profiles via RPC...");
  const { data: balA, error: errBalA } = await clientA.rpc("ss_set_credits_for_testing", {
    p_user_id: userA.id,
    p_credits: 500
  });
  if (errBalA) {
    console.error("❌ Failed to set credits for User A:", errBalA.message);
    hasErrors = true;
  } else {
    console.log(`✓ User A credits_balance initialized to ${balA}`);
  }

  const { data: balB, error: errBalB } = await clientB.rpc("ss_set_credits_for_testing", {
    p_user_id: userB.id,
    p_credits: 500
  });
  if (errBalB) {
    console.error("❌ Failed to set credits for User B:", errBalB.message);
    hasErrors = true;
  } else {
    console.log(`✓ User B credits_balance initialized to ${balB}`);
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
  // TEST ESCROW & SPENDING
  // =========================================================================
  console.log("\n[3/3] Testing Escrow & Spending Flow (User A books User B for 50 credits)...");
  
  const { data: escrowTxId, error: errEscrow } = await clientA.rpc("ss_create_escrow", {
    p_payee_id: userB.id,
    p_course_id: null,
    p_amount_credits: 50,
    p_payer_note: "Multiplayer automated QA booking"
  });

  if (errEscrow) {
    console.error("❌ ss_create_escrow RPC failed:", errEscrow.message, errEscrow.details || "");
    hasErrors = true;
  } else {
    console.log(`✓ Escrow created successfully. Transaction ID: ${escrowTxId}`);

    // Verify User A's balance decreased from 500 to 450
    const { data: profileAEnd, error: errFetchAEnd } = await clientA
      .from("ss_profiles")
      .select("credits_balance")
      .eq("id", userA.id)
      .single();

    if (errFetchAEnd) {
      console.error("❌ Failed to fetch User A's updated balance:", errFetchAEnd.message);
      hasErrors = true;
    } else {
      const finalBalance = profileAEnd?.credits_balance;
      console.log(`User A initial balance: 500 -> final balance: ${finalBalance}`);
      if (finalBalance === 450) {
        console.log("✓ VERIFIED: User A's credits_balance decreased strictly by 50 (from 500 to 450).");
      } else {
        console.error(`❌ BALANCE MISMATCH: Expected 450 but got ${finalBalance}`);
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
      console.log(`✓ VERIFIED: Escrow row exists with status="${escrowRow.status}", gross=${escrowRow.gross_amount_credits}, fee=${escrowRow.platform_fee_credits}, net=${escrowRow.net_amount_credits}`);
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