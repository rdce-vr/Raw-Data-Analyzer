import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import * as xlsx from "xlsx";
import { createServer as createViteServer } from "vite";
import pg from "pg";
const { Pool } = pg;

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const CACHE_FILE = path.join(process.cwd(), "server_cache_v2.json");

let poolInstance: pg.Pool | null = null;

function getDbPool() {
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

async function initializeDbSchema() {
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
      
      console.log("Database schema initialized successfully.");
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Database schema initialization failed:", err);
  }
}

async function seedDbIfEmpty() {
  try {
    const p = getDbPool();
    const periodsCheck = await p.query("SELECT COUNT(*) FROM periods");
    const count = parseInt(periodsCheck.rows[0].count);
    if (count > 0) {
      console.log("PostgreSQL database already has periods. Skipping seed.");
      return;
    }

    const cache = loadCache();
    if (!cache || cache.type !== "ticketing") {
      console.log("No ticketing cache found to seed.");
      return;
    }

    console.log("Seeding PostgreSQL with existing cached ticketing data...");
    const rows = cache.data || [];
    const stats = cache.stats || {};

    const periodCounts: Record<string, number> = {};
    rows.forEach((row: any) => {
      const d = parseExcelDate(row.waktulapor) || parseExcelDate(row.tanggalinsiden);
      if (d) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        periodCounts[key] = (periodCounts[key] || 0) + 1;
      }
    });

    let periodId = "2026-07";
    let maxCount = 0;
    Object.entries(periodCounts).forEach(([p, count]) => {
      if (count > maxCount) {
        maxCount = count;
        periodId = p;
      }
    });

    const [yearStr, monthStr] = periodId.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const label = `${monthNames[month - 1]} ${year}`;

    const client = await p.connect();
    try {
      await client.query("BEGIN");

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
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunkRows = rows.slice(i, i + chunkSize);
        const chunkIdx = Math.floor(i / chunkSize);

        await client.query(
          `INSERT INTO period_chunks (period_id, chunk_index, rows) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (period_id, chunk_index) DO NOTHING`,
          [
            periodId,
            chunkIdx,
            JSON.stringify(chunkRows)
          ]
        );
      }

      await client.query("COMMIT");
      console.log(`Seeding completed. Saved ${rows.length} rows to PostgreSQL in period ${periodId}.`);
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("PostgreSQL seeding failed:", err);
  }
}

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Multer in-memory storage for handling file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Helper to write to JSON cache
function saveCache(data: any) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Cache saving error:", err);
  }
}

// Helper to load from JSON cache
function loadCache(): any {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    }
  } catch (err) {
    console.error("Cache loading error:", err);
  }
  return null;
}

// Name standardization & case-insensitive header mapping with robust normalization
function renameAndNormalize(rows: any[], targetColumns: string[]): any[] {
  if (rows.length === 0) return rows;
  const colMap: Record<string, string> = {};
  const headers = Object.keys(rows[0]);

  headers.forEach(h => {
    const norm = h.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    
    // Explicitly handle common variations and typos
    if (norm === "durasilaporansemenit" || norm === "durasilaporanmenit") {
      colMap[h] = "durasilaporanmenit";
      return;
    }
    if (norm === "durasigangguanminusstopclock" || norm === "durasigangguaminusstopclock") {
      colMap[h] = "durasigangguaminusstopclock";
      return;
    }

    targetColumns.forEach(req => {
      const reqNorm = req.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (reqNorm === norm) {
        colMap[h] = req;
      }
    });
  });

  return rows.map(row => {
    const newRow: any = {};
    Object.keys(row).forEach(k => {
      const mappedKey = colMap[k] || k;
      newRow[mappedKey] = row[k];
    });
    return newRow;
  });
}

// Duration string parser
function parseDurationToSeconds(val: any): number {
  if (val === undefined || val === null || val === "") return 0;
  
  if (typeof val === "number") {
    return Math.round(val * 86400);
  }
  
  const s = String(val).trim();
  
  if (!s.includes(":") && !isNaN(Number(s))) {
    return Math.round(Number(s) * 86400);
  }
  
  if (s.includes(":")) {
    const parts = s.split(":").map(Number);
    let sec = 0;
    if (parts.length === 3) {
      const [h, m, sc] = parts;
      if (!isNaN(h)) sec += h * 3600;
      if (!isNaN(m)) sec += m * 60;
      if (!isNaN(sc)) sec += sc;
    } else if (parts.length === 2) {
      const [m, sc] = parts;
      if (!isNaN(m)) sec += m * 60;
      if (!isNaN(sc)) sec += sc;
    } else if (parts.length === 4) {
      const [d, h, m, sc] = parts;
      if (!isNaN(d)) sec += d * 86400;
      if (!isNaN(h)) sec += h * 3600;
      if (!isNaN(m)) sec += m * 60;
      if (!isNaN(sc)) sec += sc;
    }
    return sec;
  }
  
  let totalSecs = 0;
  const daysMatch = s.match(/(\d+)\s*(?:Hari|Day)/i);
  if (daysMatch) totalSecs += parseInt(daysMatch[1]) * 86400;
  
  const hoursMatch = s.match(/(\d+)\s*(?:Jam|Hour)/i);
  if (hoursMatch) totalSecs += parseInt(hoursMatch[1]) * 3600;
  
  const minsMatch = s.match(/(\d+)\s*(?:Menit|Minute)/i);
  if (minsMatch) totalSecs += parseInt(minsMatch[1]) * 60;
  
  const secsMatch = s.match(/(\d+)\s*(?:Detik|Second)/i);
  if (secsMatch) totalSecs += parseInt(secsMatch[1]);
  
  return totalSecs;
}

function parseExcelDate(val: any) {
  if (val === undefined || val === null || val === "") return null;
  if (typeof val === "number") {
    const msSinceEpoch = (val - 25569) * 86400 * 1000;
    return new Date(msSinceEpoch);
  }
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d;
  return null;
}

const REQUIRED_COLUMNS = ["namaPelanggan", "namaLayanan", "sid", "latestMutasi", "hargaPelanggan", "SalesOwner"];

const TICKETING_COLUMNS = [
  "idtiket", "idpelanggan", "idinsiden", "namapelanggan", "sidbaru", "sidlama", 
  "namakelompok", "namakondisi", "namasbu", "namakp", "laporanberulang", "namapelapor", 
  "isilaporan", "tanggapan", "status", "waktugangguan", "penerimalaporan", "produk", 
  "posisitiket", "idolt", "brandolt", "idsplitter", "penyebab", "penyebabdetail", 
  "namamitra", "petugaslapangan", "tipetiket", "namasumber", "detailSumberLaporan", 
  "segmenicon", "waktulapor", "waktulaporanselesai", "durasilaporan", "durasilaporanmenit", 
  "waktugangguan2", "waktugangguanselesai", "durasigangguan", "durasigangguanmenit", 
  "durasistopclock", "durasigangguaminusstopclock", "endcustomer", "terminatingalamat", 
  "originatingalamat", "sbuter", "kpter", "sbuori", "kpori", "namaqcpenyebab", 
  "namaqctindakan", "durasistopclockpelanggan", "durasigangguanminusstopclockpelanggan", 
  "keteranganclose", "segmenpelanggan", "bandwidth", "lastkomen", "terminatinglatlong", 
  "terminatingprovinsi", "terminatingkabupaten", "terminatingkecamatan", "terminatingkelurahan", 
  "tanggalinsiden", "tanggalsendnoc", "tanggalSendAgent", "priority", "namaPetugasClose", 
  "namaBidangClose", "namaPetugasResolve", "namaBidangResolve", "Convert SC", "Durasi Ticket", 
  "Frekuensi SID Gangguan", "DURASI (HH:MM:SS)", "OPEN TKT", "CLOSE TKT", "Durasi Incident", 
  "QTY TT Gangguan", "Duplikat ICD", "sbu owner", "periode"
];

// Health and Root Endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Fetch all saved periods from PostgreSQL
app.get("/api/periods", async (req, res) => {
  try {
    const p = getDbPool();
    const result = await p.query(
      `SELECT id, year, month, label, total_rows as "totalRows", 
              uploaded_at as "uploadedAt", file_name as "fileName", 
              file_type as "fileType", stats 
       FROM periods 
       ORDER BY year DESC, month DESC`
    );
    return res.json({ periods: result.rows });
  } catch (err: any) {
    console.error("Error fetching periods:", err);
    return res.status(500).json({ detail: err.message });
  }
});

// Fetch full period data from PostgreSQL by assembling chunks
app.get("/api/period-data", async (req, res) => {
  try {
    const { periodId } = req.query;
    if (!periodId || typeof periodId !== "string") {
      return res.status(400).json({ detail: "periodId parameter is required" });
    }
    const p = getDbPool();

    // Get period metadata
    const periodRes = await p.query(
      `SELECT id, year, month, label, total_rows as "totalRows", 
              uploaded_at as "uploadedAt", file_name as "fileName", 
              file_type as "fileType", stats 
       FROM periods 
       WHERE id = $1`,
      [periodId]
    );
    
    if (periodRes.rowCount === 0) {
      return res.status(404).json({ detail: `Period ${periodId} not found` });
    }
    const periodData = periodRes.rows[0];

    // Fetch chunks and aggregate them.
    const chunksRes = await p.query(
      `SELECT chunk_index as "chunkIndex", rows 
       FROM period_chunks 
       WHERE period_id = $1 
       ORDER BY chunk_index ASC`,
      [periodId]
    );

    let aggregatedRows: any[] = [];
    chunksRes.rows.forEach((c: any) => {
      if (Array.isArray(c.rows)) {
        aggregatedRows = aggregatedRows.concat(c.rows);
      }
    });

    return res.json({
      fileType: periodData.fileType || "ticketing",
      fileName: periodData.fileName || "Imported Database",
      columns: aggregatedRows.length > 0 ? Object.keys(aggregatedRows[0]) : [],
      totalRows: periodData.totalRows || aggregatedRows.length,
      originalData: aggregatedRows,
      stats: periodData.stats,
      periodId
    });
  } catch (err: any) {
    console.error("Error fetching period data:", err);
    return res.status(500).json({ detail: err.message });
  }
});

// Delete a period and its chunks from PostgreSQL
app.delete("/api/period", async (req, res) => {
  try {
    const { periodId } = req.query;
    if (!periodId || typeof periodId !== "string") {
      return res.status(400).json({ detail: "periodId parameter is required" });
    }
    const p = getDbPool();

    // ON DELETE CASCADE automatically deletes associated chunks!
    await p.query("DELETE FROM periods WHERE id = $1", [periodId]);

    return res.json({ success: true, message: `Successfully deleted period ${periodId}` });
  } catch (err: any) {
    console.error("Error deleting period:", err);
    return res.status(500).json({ detail: err.message });
  }
});

// Upload Endpoint
app.post("/api/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: "No file uploaded" });
    }
    
    const type = req.body.type || "standard";
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (type === "ticketing") {
      let processedRows = renameAndNormalize(rawRows, TICKETING_COLUMNS);

      // SBU Standardizations
      processedRows.forEach((row: any) => {
        if (row.namasbu !== undefined && row.namasbu !== null) {
          const sbu = String(row.namasbu).toUpperCase().trim();
          if (sbu === "JAWA TENGAH" || sbu === "JAWA BAGIAN TENGAH") {
            row.namasbu = "JAWA BAGIAN TENGAH";
          } else if (sbu === "NAN" || sbu === "NONE" || sbu === "") {
            row.namasbu = null;
          } else {
            row.namasbu = sbu;
          }
        } else {
          row.namasbu = null;
        }
      });

      // Status values counting
      const statusCounts: Record<string, number> = {};
      processedRows.forEach((row: any) => {
        const val = row.status !== undefined && row.status !== null ? String(row.status).trim() : "";
        if (val) {
          statusCounts[val] = (statusCounts[val] || 0) + 1;
        }
      });

      const getTopCounts = (colName: string) => {
        const counts: Record<string, number> = {};
        processedRows.forEach((row: any) => {
          const val = row[colName] !== undefined && row[colName] !== null ? String(row[colName]).trim() : "";
          if (val) {
            counts[val] = (counts[val] || 0) + 1;
          }
        });
        return Object.entries(counts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 50);
      };

      const sbuCounts = getTopCounts("namasbu");
      const kpCounts = getTopCounts("namakp");
      const customerCounts = getTopCounts("namapelanggan");

      // Time Accumulations
      const timeSummary: Record<string, any> = {};
      
      const timestampCols = ["waktulapor", "waktulaporanselesai", "waktugangguan2", "waktugangguanselesai"];
      timestampCols.forEach(col => {
        let minVal: Date | null = null;
        let maxVal: Date | null = null;
        processedRows.forEach((row: any) => {
          const d = parseExcelDate(row[col]);
          if (d) {
            if (!minVal || d < minVal) minVal = d;
            if (!maxVal || d > maxVal) maxVal = d;
          }
        });
        if (minVal || maxVal) {
          timeSummary[col] = {
            type: "timestamp",
            min: minVal ? minVal.toISOString() : null,
            max: maxVal ? maxVal.toISOString() : null
          };
        }
      });

      const numericDurationCols = ["durasilaporanmenit", "durasigangguanmenit"];
      numericDurationCols.forEach(col => {
        let total = 0;
        let hasValid = false;
        processedRows.forEach((row: any) => {
          const val = parseFloat(row[col]);
          if (!isNaN(val)) {
            total += val;
            hasValid = true;
          }
        });
        if (hasValid) {
          timeSummary[col] = {
            type: "numeric_duration",
            total,
            unit: "Minutes"
          };
        }
      });

      const stringDurationCols = [
        "durasilaporan", "durasigangguan", "Durasi Ticket", "DURASI (HH:MM:SS)", 
        "Durasi Incident", "durasistopclock", "durasigangguaminusstopclock"
      ];
      stringDurationCols.forEach(col => {
        let totalSeconds = 0;
        let hasValid = false;
        processedRows.forEach((row: any) => {
          if (row[col] !== undefined && row[col] !== null && row[col] !== "") {
            const sec = parseDurationToSeconds(row[col]);
            totalSeconds += sec;
            hasValid = true;
          }
        });
        if (hasValid) {
          const hours = Math.floor(totalSeconds / 3600);
          const rem = totalSeconds % 3600;
          const minutes = Math.floor(rem / 60);
          const seconds = rem % 60;
          const formatted = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
          timeSummary[col] = {
            type: "string_duration",
            total_seconds: totalSeconds,
            formatted
          };
        }
      });

      const stats = {
        status_counts: statusCounts,
        sbu_counts: sbuCounts,
        kp_counts: kpCounts,
        customer_counts: customerCounts,
        time_summary: timeSummary
      };

      saveCache({
        type: "ticketing",
        data: processedRows,
        stats
      });

      // Save to PostgreSQL asynchronously (so we don't block the client's quick upload response)
      (async () => {
        try {
          const p = getDbPool();

          // Determine period
          let periodId = "";
          const periodCounts: Record<string, number> = {};
          processedRows.forEach((row: any) => {
            const d = parseExcelDate(row.waktulapor) || parseExcelDate(row.tanggalinsiden);
            if (d) {
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
              periodCounts[key] = (periodCounts[key] || 0) + 1;
            }
          });

          let maxCount = 0;
          Object.entries(periodCounts).forEach(([p, count]) => {
            if (count > maxCount) {
              maxCount = count;
              periodId = p;
            }
          });

          // Use customPeriod if provided, or default to current year-month
          const reqCustomPeriod = req.body.customPeriod;
          if (reqCustomPeriod && /^\d{4}-\d{2}$/.test(reqCustomPeriod)) {
            periodId = reqCustomPeriod;
          } else if (!periodId) {
            const now = new Date();
            periodId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          }

          const [yearStr, monthStr] = periodId.split("-");
          const year = parseInt(yearStr);
          const month = parseInt(monthStr);
          const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          const label = `${monthNames[month - 1]} ${year}`;

          console.log(`Writing period metadata to PostgreSQL for period: ${periodId}`);
          
          const client = await p.connect();
          try {
            await client.query("BEGIN");

            // Insert or update period
            await client.query(
              `INSERT INTO periods (id, year, month, label, total_rows, uploaded_at, file_name, file_type, stats)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               ON CONFLICT (id) DO UPDATE SET 
                 year = EXCLUDED.year,
                 month = EXCLUDED.month,
                 label = EXCLUDED.label,
                 total_rows = EXCLUDED.total_rows,
                 uploaded_at = EXCLUDED.uploaded_at,
                 file_name = EXCLUDED.file_name,
                 file_type = EXCLUDED.file_type,
                 stats = EXCLUDED.stats`,
              [
                periodId,
                year,
                month,
                label,
                processedRows.length,
                new Date().toISOString(),
                req.file.originalname,
                "ticketing",
                JSON.stringify(stats)
              ]
            );

            // Since periods.id is updated, delete existing chunks for this period first
            await client.query("DELETE FROM period_chunks WHERE period_id = $1", [periodId]);

            // Chunk rows and insert
            const chunkSize = 150;
            for (let i = 0; i < processedRows.length; i += chunkSize) {
              const chunkRows = processedRows.slice(i, i + chunkSize);
              const chunkIdx = Math.floor(i / chunkSize);

              await client.query(
                `INSERT INTO period_chunks (period_id, chunk_index, rows)
                 VALUES ($1, $2, $3)`,
                [
                  periodId,
                  chunkIdx,
                  JSON.stringify(chunkRows)
                ]
              );
            }

            await client.query("COMMIT");
            console.log(`Successfully stored ${processedRows.length} rows to PostgreSQL in ${Math.ceil(processedRows.length / chunkSize)} chunks.`);
          } catch (txErr) {
            await client.query("ROLLBACK");
            throw txErr;
          } finally {
            client.release();
          }
        } catch (dbErr) {
          console.error("Failed to save ticketing data to PostgreSQL:", dbErr);
        }
      })();

      return res.json({
        fileType: "ticketing",
        fileName: req.file.originalname,
        columns: processedRows.length > 0 ? Object.keys(processedRows[0]) : [],
        totalRows: processedRows.length,
        originalData: processedRows,
        stats
      });

    } else {
      // Standard Import Logic
      let processedRows = renameAndNormalize(rawRows, REQUIRED_COLUMNS);

      // Forward fill namaPelanggan
      let lastNamaPelanggan = "";
      processedRows.forEach((row: any) => {
        if (row.namaPelanggan !== undefined && row.namaPelanggan !== null && String(row.namaPelanggan).trim() !== "") {
          lastNamaPelanggan = String(row.namaPelanggan).trim();
        }
        row.namaPelanggan = lastNamaPelanggan;
      });

      // Aggregate SIDs grouped by customer
      const customerSidMap = new Map<string, Set<any>>();
      processedRows.forEach((row: any) => {
        const cust = row.namaPelanggan || "Unknown";
        if (!customerSidMap.has(cust)) {
          customerSidMap.set(cust, new Set());
        }
        if (row.sid !== undefined && row.sid !== null) {
          customerSidMap.get(cust)!.add(row.sid);
        }
      });

      const customerSids: any[] = [];
      customerSidMap.forEach((sidsSet, customerName) => {
        customerSids.push({
          namaPelanggan: customerName,
          JumlahSID: sidsSet.size
        });
      });
      customerSids.sort((a, b) => b.JumlahSID - a.JumlahSID);

      // Map Jumlah_SID_Submitted back to each row
      processedRows.forEach((row: any) => {
        const cust = row.namaPelanggan || "Unknown";
        row.Jumlah_SID_Submitted = customerSidMap.get(cust)?.size || 0;
      });

      // Group by namaLayanan (service summary table)
      const serviceGroupMap = new Map<string, { sids: Set<any>; prices: number[]; customers: Set<any>; rowCount: number }>();
      processedRows.forEach((row: any) => {
        const svc = row.namaLayanan || "Unknown";
        if (!serviceGroupMap.has(svc)) {
          serviceGroupMap.set(svc, { sids: new Set(), prices: [], customers: new Set(), rowCount: 0 });
        }
        const group = serviceGroupMap.get(svc)!;
        if (row.sid !== undefined && row.sid !== null) group.sids.add(row.sid);
        if (row.namaPelanggan !== undefined && row.namaPelanggan !== null) group.customers.add(row.namaPelanggan);
        const price = parseFloat(row.hargaPelanggan);
        if (!isNaN(price)) {
          group.prices.push(price);
        }
        group.rowCount++;
      });

      const summaryData: any[] = [];
      serviceGroupMap.forEach((val, svcName) => {
        const sumPrice = val.prices.reduce((a, b) => a + b, 0);
        const avgPrice = val.prices.length > 0 ? sumPrice / val.prices.length : 0;
        summaryData.push({
          namaLayanan: svcName,
          Total_SID: val.sids.size,
          TotalRevenue: sumPrice,
          AveragePrice: Math.round(avgPrice * 100) / 100,
          CustomerCount: val.customers.size,
          TransactionCount: val.rowCount
        });
      });
      summaryData.sort((a, b) => b.TotalRevenue - a.TotalRevenue);

      // Group service customer breakdown
      const serviceCustomerMap = new Map<string, { sids: Set<any>; prices: number[] }>();
      processedRows.forEach((row: any) => {
        const svc = row.namaLayanan || "Unknown";
        const cust = row.namaPelanggan || "Unknown";
        const key = `${svc}:::${cust}`;
        if (!serviceCustomerMap.has(key)) {
          serviceCustomerMap.set(key, { sids: new Set(), prices: [] });
        }
        const val = serviceCustomerMap.get(key)!;
        if (row.sid !== undefined && row.sid !== null) val.sids.add(row.sid);
        const price = parseFloat(row.hargaPelanggan);
        if (!isNaN(price)) val.prices.push(price);
      });

      const serviceBreakdown: any[] = [];
      serviceCustomerMap.forEach((val, key) => {
        const [svc, cust] = key.split(":::");
        serviceBreakdown.push({
          namaLayanan: svc,
          namaPelanggan: cust,
          Jumlah_SID_Submitted: val.sids.size,
          TotalRevenue: val.prices.reduce((a, b) => a + b, 0)
        });
      });
      serviceBreakdown.sort((a, b) => {
        if (a.namaLayanan < b.namaLayanan) return -1;
        if (a.namaLayanan > b.namaLayanan) return 1;
        return b.TotalRevenue - a.TotalRevenue;
      });

      // Variable Analysis (top 50)
      const analyzeColumn = (colName: string) => {
        const counts: Record<string, number> = {};
        processedRows.forEach((row: any) => {
          const val = row[colName] !== undefined && row[colName] !== null ? String(row[colName]) : "None";
          counts[val] = (counts[val] || 0) + 1;
        });
        return Object.entries(counts)
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 50);
      };

      const variableAnalysis = {
        namaPelanggan: analyzeColumn("namaPelanggan"),
        namaLayanan: analyzeColumn("namaLayanan"),
        SalesOwner: analyzeColumn("SalesOwner"),
        latestMutasi: analyzeColumn("latestMutasi")
      };

      saveCache({
        summary: summaryData,
        detail: processedRows,
        customer_sids: customerSids,
        service_breakdown: serviceBreakdown
      });

      return res.json({
        fileType: "standard",
        fileName: req.file.originalname,
        columns: processedRows.length > 0 ? Object.keys(processedRows[0]) : [],
        originalData: processedRows.slice(0, 100),
        summaryData,
        groupingInfo: "Grouped by namaLayanan with SID and Revenue aggregation",
        extractedData: processedRows.slice(0, 2000),
        variableAnalysis
      });
    }
  } catch (err: any) {
    console.error("Upload handler error:", err);
    res.status(500).json({ detail: `Failed to process upload: ${err.message}` });
  }
});

// Export Endpoint
app.get("/api/export", (req, res) => {
  try {
    const reportType = (req.query.report_type || "all") as string;
    const sbuFilter = (req.query.sbu_filter || "All") as string;
    
    const cache = loadCache();
    if (!cache) {
      return res.status(404).json({ detail: "No processed data found in cache. Please upload a file first." });
    }

    const wb = xlsx.utils.book_new();

    if (reportType === "ticketing") {
      if (cache.type !== "ticketing") {
        return res.status(400).json({ detail: "Cached data is not of ticketing type. Please upload a ticketing file first." });
      }
      let rows = cache.data || [];
      if (sbuFilter && sbuFilter !== "All") {
        rows = rows.filter((row: any) => row.namasbu === sbuFilter);
      }
      const ws = xlsx.utils.json_to_sheet(rows);
      xlsx.utils.book_append_sheet(wb, ws, "Ticketing Data");

      const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
      const safeSbu = sbuFilter === "All" ? "" : `_${sbuFilter.replace(/\//g, "-")}`;
      res.setHeader("Content-Disposition", `attachment; filename="Ticketing_Data${safeSbu}.xlsx"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      return res.send(buf);

    } else {
      // Standard Excel Export Options
      if (cache.type === "ticketing") {
        // Fallback if cached data is ticketing but user requested standard export
        const ws = xlsx.utils.json_to_sheet(cache.data || []);
        xlsx.utils.book_append_sheet(wb, ws, "Ticketing Data");
        const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Disposition", 'attachment; filename="Ticketing_Data.xlsx"');
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        return res.send(buf);
      }

      const summaryData = cache.summary || [];
      const detailData = cache.detail || [];
      const customerSids = cache.customer_sids || [];

      if (reportType === "all") {
        // Sheet 1: Summary Report (Stacked tables)
        const aoa: any[][] = [];
        
        // 1. Add Service Summary Table
        aoa.push(["Service Summary Report"]);
        aoa.push([]); // spacing
        aoa.push(["Service Name", "Total SIDs", "Total Revenue", "Average Price", "Customer Count", "Transaction Count"]);
        summaryData.forEach((row: any) => {
          aoa.push([
            row.namaLayanan,
            row.Total_SID,
            row.TotalRevenue,
            row.AveragePrice,
            row.CustomerCount,
            row.TransactionCount
          ]);
        });

        // Add 4 empty rows gap
        for (let i = 0; i < 4; i++) aoa.push([]);

        // 2. Add Customer Summary Table
        aoa.push(["Customer Summary Report"]);
        aoa.push([]); // spacing
        aoa.push(["Customer Name", "Total SIDs Submitted"]);
        customerSids.forEach((row: any) => {
          aoa.push([row.namaPelanggan, row.JumlahSID]);
        });

        const wsSummary = xlsx.utils.aoa_to_sheet(aoa);
        xlsx.utils.book_append_sheet(wb, wsSummary, "Summary Report");

        // Sheet 2: Detail Data
        // Order: namaPelanggan, Jumlah_SID_Submitted, namaLayanan, sid, latestMutasi, hargaPelanggan, SalesOwner, then others
        const detailHeaders = ["namaPelanggan", "Jumlah_SID_Submitted", "namaLayanan", "sid", "latestMutasi", "hargaPelanggan", "SalesOwner"];
        const remainingHeaders = detailData.length > 0 
          ? Object.keys(detailData[0]).filter(k => !detailHeaders.includes(k))
          : [];
        const finalHeaders = [...detailHeaders, ...remainingHeaders];

        const wsDetail = xlsx.utils.json_to_sheet(detailData, { header: finalHeaders });
        xlsx.utils.book_append_sheet(wb, wsDetail, "Detail Data");

        const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Disposition", 'attachment; filename="Full_Data_Export.xlsx"');
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        return res.send(buf);

      } else if (reportType === "customer") {
        const ws = xlsx.utils.json_to_sheet(customerSids);
        xlsx.utils.book_append_sheet(wb, ws, "Customer Summary");
        const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Disposition", 'attachment; filename="Customer_Summary.xlsx"');
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        return res.send(buf);

      } else if (reportType === "service") {
        const ws = xlsx.utils.json_to_sheet(summaryData);
        xlsx.utils.book_append_sheet(wb, ws, "Service Summary");
        const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Disposition", 'attachment; filename="Service_Summary.xlsx"');
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        return res.send(buf);
      }
    }
  } catch (err: any) {
    console.error("Export error:", err);
    res.status(500).json({ detail: `Export failed: ${err.message}` });
  }
});

// Vite middleware integration for full-stack application
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    // Trigger schema setup and lazy seeding of PostgreSQL with cached local data
    setTimeout(async () => {
      await initializeDbSchema();
      await seedDbIfEmpty().catch(err => console.error("Async seeding error:", err));
    }, 1000);
  });
}

startServer();
