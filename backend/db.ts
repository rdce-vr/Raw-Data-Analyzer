import pg from "pg";
const { Pool } = pg;

import { loadCache, loadCachePeriodData } from "./cache";

let poolInstance: pg.Pool | null = null;

export function getDbPool(): pg.Pool {
  if (poolInstance) return poolInstance;
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres";
  console.log("Initializing PostgreSQL Pool with connection string:", connectionString.replace(/:[^:@]+@/, ":****@"));
  poolInstance = new Pool({
    connectionString,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: 20
  });
  return poolInstance;
}

export async function initializeDbSchema() {
  const p = getDbPool();
  try {
    const client = await p.connect();
    try {
      console.log("Checking and initializing database schema...");
      
      // Create periods table
      await client.query(`
        CREATE TABLE IF NOT EXISTS periods (
          id VARCHAR(50) PRIMARY KEY,
          year INT NOT NULL,
          month INT NOT NULL,
          label VARCHAR(100) NOT NULL,
          total_rows INT NOT NULL,
          uploaded_at VARCHAR(100) NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          file_type VARCHAR(50) NOT NULL,
          stats JSONB NOT NULL
        )
      `);
      
      // Create period_chunks table
      await client.query(`
        CREATE TABLE IF NOT EXISTS period_chunks (
          period_id VARCHAR(50) NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
          chunk_index INT NOT NULL,
          rows JSONB NOT NULL,
          PRIMARY KEY (period_id, chunk_index)
        )
      `);
      
      // Create branch_customers table
      await client.query(`
        CREATE TABLE IF NOT EXISTS branch_customers (
          value VARCHAR(255) PRIMARY KEY,
          uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log("Database schema initialized successfully.");
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Database schema initialization failed:", err);
  }
}

export async function seedDbIfEmpty() {
  try {
    const p = getDbPool();
    const periodsCheck = await p.query("SELECT COUNT(*) FROM periods");
    const count = parseInt(periodsCheck.rows[0].count);
    if (count > 0) {
      console.log("PostgreSQL database already has periods. Skipping seed.");
      return;
    }

    const cache = loadCache();
    if (!cache) {
      console.log("No cache found to seed.");
      return;
    }

    // Check if the cache is the new multi-period format
    if (cache.type === "multi-period-ticketing" && cache.periods) {
      console.log("Seeding PostgreSQL with all periods from multi-period cache...");
      const client = await p.connect();
      try {
        await client.query("BEGIN");

        for (const [periodId, periodContent] of Object.entries(cache.periods)) {
          const { stats } = periodContent as any;
          const rows = loadCachePeriodData(periodId);
          const [yearStr, monthStr] = periodId.split("-");
          const year = parseInt(yearStr);
          const month = parseInt(monthStr);
          const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          const label = `${monthNames[month - 1]} ${year}`;

          console.log(`Seeding period ${periodId} with ${rows.length} rows...`);

          await client.query(
            `INSERT INTO periods (id, year, month, label, total_rows, uploaded_at, file_name, file_type, stats) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
             ON CONFLICT (id) DO NOTHING`,
            [
              periodId,
              year,
              month,
              label,
              rows.length,
              new Date().toISOString(),
              "server_cache_v2.json",
              "ticketing",
              JSON.stringify(stats)
            ]
          );

          const chunkSize = 150;
          const chunksToInsert: { periodId: string; chunkIdx: number; rowsJson: string }[] = [];
          for (let i = 0; i < rows.length; i += chunkSize) {
            const chunkRows = rows.slice(i, i + chunkSize);
            const chunkIdx = Math.floor(i / chunkSize);
            chunksToInsert.push({
              periodId,
              chunkIdx,
              rowsJson: JSON.stringify(chunkRows)
            });
          }

          if (chunksToInsert.length > 0) {
            const placeholders = chunksToInsert.map((_, idx) => {
              const base = idx * 3;
              return `($${base + 1}, $${base + 2}, $${base + 3})`;
            }).join(", ");
            const values = chunksToInsert.flatMap(c => [c.periodId, c.chunkIdx, c.rowsJson]);
            await client.query(
              `INSERT INTO period_chunks (period_id, chunk_index, rows) 
               VALUES ${placeholders} 
               ON CONFLICT (period_id, chunk_index) DO NOTHING`,
              values
            );
          }
        }

        await client.query("COMMIT");
        console.log("PostgreSQL database seeding completed successfully.");
      } catch (txErr) {
        await client.query("ROLLBACK");
        throw txErr;
      } finally {
        client.release();
      }
    }

    // Seed branch customers if empty
    if (cache.branchCustomers && Array.isArray(cache.branchCustomers)) {
      const bcCheck = await p.query("SELECT COUNT(*) FROM branch_customers");
      const bcCount = parseInt(bcCheck.rows[0].count);
      if (bcCount === 0) {
        console.log(`Seeding ${cache.branchCustomers.length} branch customers from cache...`);
        const client = await p.connect();
        try {
          await client.query("BEGIN");
          const batchSize = 100;
          for (let i = 0; i < cache.branchCustomers.length; i += batchSize) {
            const batch = cache.branchCustomers.slice(i, i + batchSize);
            await client.query(
              `INSERT INTO branch_customers (value) VALUES ${batch.map((_: any, idx: number) => `($${idx + 1})`).join(", ")} ON CONFLICT (value) DO NOTHING`,
              batch
            );
          }
          await client.query("COMMIT");
        } finally {
          client.release();
        }
      }
    }
  } catch (err) {
    console.error("PostgreSQL seeding failed:", err);
  }
}
