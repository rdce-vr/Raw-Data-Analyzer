const pg = require('pg');
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres";
console.log("Connecting to:", connectionString);

const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 5000
});

async function test() {
  try {
    const client = await pool.connect();
    console.log("Connected successfully!");
    
    console.log("\n--- Periods Table ---");
    const periods = await client.query("SELECT id, year, month, label, total_rows, file_name FROM periods;");
    console.table(periods.rows);
    
    console.log("\n--- Chunks Count ---");
    const chunks = await client.query("SELECT period_id, COUNT(*) as chunks_count FROM period_chunks GROUP BY period_id;");
    console.table(chunks.rows);
    
    client.release();
  } catch (err) {
    console.error("DB Query failed:", err);
  } finally {
    await pool.end();
  }
}

test();
