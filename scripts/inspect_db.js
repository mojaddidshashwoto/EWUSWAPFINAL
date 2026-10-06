import pg from "pg";
const { Client } = pg;

const passwords = ["Shashwoto@969", "[Shashwoto@969]"];
for (const pw of passwords) {
  const client = new Client({
    host: "db.glpoowzygushtxwqmcxl.supabase.co",
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: pw,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    console.log("Connected successfully with password:", pw);
    const res = await client.query(
      "SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'public.ss_escrow_transactions'::regclass"
    );
    console.log("Constraints on ss_escrow_transactions:", res.rows);
    await client.end();
    break;
  } catch (err) {
    console.log("Failed with password " + pw + ":", err.message);
  }
}
