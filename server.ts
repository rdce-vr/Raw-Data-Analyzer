import express from "express";
import compression from "compression";
import path from "path";
import fs from "fs";
import multer from "multer";
import * as xlsx from "xlsx";
import { createServer as createViteServer } from "vite";

import { getDbPool, initializeDbSchema, seedDbIfEmpty, ensureYearPartition } from "./backend/db";
import { saveCache, loadCache, loadCachePeriodData, saveCachePeriod, deleteCachePeriod, setParseExcelDate } from "./backend/cache";
import { REQUIRED_COLUMNS, TICKETING_COLUMNS, renameAndNormalize, parseDurationToSeconds, parseExcelDate } from "./backend/excelParser";

// Inject parseExcelDate into cache layer to prevent circular reference issues
setParseExcelDate(parseExcelDate);

const DASHBOARD_REQUIRED_KEYS = [
  "idtiket",
  "idpelanggan",
  "namapelanggan",
  "sidbaru",
  "sidlama",
  "namakp",
  "sbuter",
  "status",
  "waktulapor",
  "tanggalinsiden",
  "waktugangguan2",
  "durasigangguanmenit",
  "penyebab",
  "durasigangguan"
];

function trimRowsForDashboard(rows: any[]) {
  if (!Array.isArray(rows)) return rows;
  return rows.map(row => {
    const trimmed: any = {};
    DASHBOARD_REQUIRED_KEYS.forEach(key => {
      if (row[key] !== undefined) {
        trimmed[key] = row[key];
      }
    });
    return trimmed;
  });
}

// In-Memory Fast Cache for period/yearly aggregations to bypass DB/disk on repeated queries
export const inMemoryResponseCache = new Map<string, { payload: any; cachedAt: number }>();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const CACHE_FILE = path.join(process.cwd(), "server_cache_v2.json");

// Enable Gzip/Brotli HTTP compression for 70-85% smaller JSON payloads
app.use(compression());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Multer in-memory storage for handling file uploads
const upload = multer({ storage: multer.memoryStorage() });

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

    // Fast-path in-memory cache to return instant 0ms responses on repeated period view
    if (inMemoryResponseCache.has(periodId)) {
      const cached = inMemoryResponseCache.get(periodId)!;
      const etag = `W/"${periodId}-${cached.cachedAt}"`;
      if (req.headers["if-none-match"] === etag) {
        return res.status(304).end();
      }
      res.setHeader("ETag", etag);
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      return res.json(cached.payload);
    }
    
    try {
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

      // Fetch chunks using year partition key and period_id
      const chunksRes = await p.query(
        `SELECT chunk_index as "chunkIndex", rows 
         FROM period_chunks 
         WHERE year = $1 AND period_id = $2 
         ORDER BY chunk_index ASC`,
        [periodData.year, periodId]
      );

      const aggregatedRows: any[] = [];
      for (const c of chunksRes.rows) {
        if (Array.isArray(c.rows)) {
          aggregatedRows.push(...c.rows);
        }
      }

      const payload = {
        fileType: periodData.fileType || "ticketing",
        fileName: periodData.fileName || "Imported Database",
        columns: aggregatedRows.length > 0 ? Object.keys(aggregatedRows[0]) : [],
        totalRows: periodData.totalRows || aggregatedRows.length,
        originalData: periodData.fileType === "ticketing" ? trimRowsForDashboard(aggregatedRows) : aggregatedRows,
        stats: periodData.stats,
        periodId
      };

      const now = Date.now();
      inMemoryResponseCache.set(periodId, { payload, cachedAt: now });
      res.setHeader("ETag", `W/"${periodId}-${now}"`);
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      return res.json(payload);
    } catch (dbErr) {
      console.log("Database lookup failed, falling back to local JSON cache for period data:", dbErr);
      const cache = loadCache();
      if (!cache || !cache.periods || !cache.periods[periodId]) {
        return res.status(404).json({ detail: `Period ${periodId} not found in cache` });
      }
      const periodMetadata = cache.periods[periodId];
      const rows = loadCachePeriodData(periodId);
      const payload = {
        fileType: "ticketing",
        fileName: "Imported Cache",
        columns: rows.length > 0 ? Object.keys(rows[0]) : [],
        totalRows: rows.length,
        originalData: trimRowsForDashboard(rows),
        stats: periodMetadata.stats,
        periodId
      };
      const now = Date.now();
      inMemoryResponseCache.set(periodId, { payload, cachedAt: now });
      res.setHeader("ETag", `W/"${periodId}-${now}"`);
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      return res.json(payload);
    }
  } catch (err: any) {
    console.error("Error fetching period data:", err);
    return res.status(500).json({ detail: err.message });
  }
});

// Fetch aggregated yearly data from PostgreSQL or local cache in a single request
app.get("/api/yearly-data", async (req, res) => {
  try {
    const { year } = req.query;
    if (!year) {
      return res.status(400).json({ detail: "year parameter is required" });
    }
    const yearNum = parseInt(String(year), 10);
    const cacheKey = `yearly-${yearNum}`;

    // Fast-path in-memory cache for yearly summary
    if (inMemoryResponseCache.has(cacheKey)) {
      const cached = inMemoryResponseCache.get(cacheKey)!;
      const etag = `W/"${cacheKey}-${cached.cachedAt}"`;
      if (req.headers["if-none-match"] === etag) {
        return res.status(304).end();
      }
      res.setHeader("ETag", etag);
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      return res.json(cached.payload);
    }

    try {
      const p = getDbPool();
      // Direct single-partition scan (partition pruning automatically routes to period_chunks_y<year>)
      const result = await p.query(
        `SELECT rows 
         FROM period_chunks 
         WHERE year = $1
         ORDER BY chunk_index ASC`,
        [yearNum]
      );

      const allRows: any[] = [];
      for (const row of result.rows) {
        if (Array.isArray(row.rows)) {
          allRows.push(...row.rows);
        }
      }

      const payload = {
        fileType: "ticketing",
        fileName: `Yearly Dashboard Summary - ${yearNum}`,
        columns: allRows.length > 0 ? Object.keys(allRows[0]) : [],
        totalRows: allRows.length,
        originalData: trimRowsForDashboard(allRows),
        stats: null,
        periodId: cacheKey
      };

      const now = Date.now();
      inMemoryResponseCache.set(cacheKey, { payload, cachedAt: now });
      res.setHeader("ETag", `W/"${cacheKey}-${now}"`);
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      return res.json(payload);
    } catch (dbErr) {
      console.log("Database lookup failed, falling back to local JSON cache for yearly data:", dbErr);
      const cache = loadCache();
      const allRows: any[] = [];
      if (cache && cache.periods) {
        for (const [periodId, content] of Object.entries(cache.periods)) {
          const [yrStr] = periodId.split("-");
          if (parseInt(yrStr) === yearNum) {
            allRows.push(...loadCachePeriodData(periodId));
          }
        }
      }
      const payload = {
        fileType: "ticketing",
        fileName: `Yearly Dashboard Summary - ${yearNum}`,
        columns: allRows.length > 0 ? Object.keys(allRows[0]) : [],
        totalRows: allRows.length,
        originalData: trimRowsForDashboard(allRows),
        stats: null,
        periodId: cacheKey
      };
      const now = Date.now();
      inMemoryResponseCache.set(cacheKey, { payload, cachedAt: now });
      res.setHeader("ETag", `W/"${cacheKey}-${now}"`);
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      return res.json(payload);
    }
  } catch (err: any) {
    console.error("Error fetching yearly data:", err);
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

    // Invalidate in-memory caches
    inMemoryResponseCache.clear();

    // ON DELETE CASCADE automatically deletes associated chunks!
    await p.query("DELETE FROM periods WHERE id = $1", [periodId]);

    // Synchronize cache-level deletions
    deleteCachePeriod(periodId);

    return res.json({ success: true, message: `Successfully deleted period ${periodId}` });
  } catch (err: any) {
    console.error("Error deleting period:", err);
    return res.status(500).json({ detail: err.message });
  }
});

// Upload Endpoint
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: "No file uploaded" });
    }
    
    // Invalidate in-memory caches upon new upload
    inMemoryResponseCache.clear();

    const type = req.body.type || "standard";
    const workbook = xlsx.read(req.file.buffer, {
      type: "buffer",
      cellFormula: false,
      cellHTML: false,
      cellStyles: false,
      cellText: false
    });
    
    // Smart sheet selection: search for sheet containing ticketing keywords, default to sheet 0
    let sheetName = workbook.SheetNames[0];
    for (const name of workbook.SheetNames) {
      const norm = name.toLowerCase();
      if (norm.includes("gangguan") || norm.includes("ticket") || norm.includes("data") || norm.includes("report")) {
        sheetName = name;
        break;
      }
    }
    console.log(`Using sheet "${sheetName}" for data import`);
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

        if (row.sbuter !== undefined && row.sbuter !== null) {
          const sbu = String(row.sbuter).toUpperCase().trim();
          if (sbu === "JAWA TENGAH" || sbu === "JAWA BAGIAN TENGAH") {
            row.sbuter = "JAWA BAGIAN TENGAH";
          } else if (sbu === "NAN" || sbu === "NONE" || sbu === "") {
            row.sbuter = null;
          } else {
            row.sbuter = sbu;
          }
        } else {
          row.sbuter = null;
        }
      });

      // Determine dominant period and apply grouping mode
      const reqCustomPeriod = req.body.customPeriod;
      const forceCustom = reqCustomPeriod && /^\d{4}-\d{2}$/.test(reqCustomPeriod);
      const groupingMode = req.body.groupingMode || "dominant"; // "dominant" or "partition"

      let dominantPeriodId = "";
      if (forceCustom) {
        dominantPeriodId = reqCustomPeriod;
      } else {
        const counts: Record<string, number> = {};
        processedRows.forEach((row: any) => {
          const d = parseExcelDate(row.waktulapor) || parseExcelDate(row.tanggalinsiden);
          let periodKey = "";
          if (d) {
            periodKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          } else {
            const now = new Date();
            periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          }
          counts[periodKey] = (counts[periodKey] || 0) + 1;
        });

        let maxCount = 0;
        Object.entries(counts).forEach(([pId, count]) => {
          if (count > maxCount) {
            maxCount = count;
            dominantPeriodId = pId;
          }
        });
      }

      const partitionedPeriods: Record<string, any[]> = {};
      if (groupingMode === "dominant") {
        partitionedPeriods[dominantPeriodId] = processedRows;
      } else {
        processedRows.forEach((row: any) => {
          const d = parseExcelDate(row.waktulapor) || parseExcelDate(row.tanggalinsiden);
          let periodKey = "";
          if (d) {
            periodKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          } else {
            const now = new Date();
            periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          }
          if (!partitionedPeriods[periodKey]) {
            partitionedPeriods[periodKey] = [];
          }
          partitionedPeriods[periodKey].push(row);
        });
      }

      const periodStats: Record<string, any> = {};

      Object.entries(partitionedPeriods).forEach(([periodId, periodRows]) => {
        // Status values counting
        const statusCounts: Record<string, number> = {};
        periodRows.forEach((row: any) => {
          const val = row.status !== undefined && row.status !== null ? String(row.status).trim() : "";
          if (val) {
            statusCounts[val] = (statusCounts[val] || 0) + 1;
          }
        });

        const getTopCounts = (colName: string) => {
          const counts: Record<string, number> = {};
          periodRows.forEach((row: any) => {
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

        const sbuCounts = getTopCounts("sbuter");
        const kpCounts = getTopCounts("namakp");
        const customerCounts = getTopCounts("namapelanggan");

        // Time Accumulations
        const timeSummary: Record<string, any> = {};
        
        const timestampCols = ["waktulapor", "waktulaporanselesai", "waktugangguan2", "waktugangguanselesai"];
        timestampCols.forEach(col => {
          let minVal: Date | null = null;
          let maxVal: Date | null = null;
          periodRows.forEach((row: any) => {
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
          periodRows.forEach((row: any) => {
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
          periodRows.forEach((row: any) => {
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

        periodStats[periodId] = stats;

        // Save cache for this period inside multi-period cache
        saveCachePeriod(periodId, periodRows, stats);
      });

      // Save to PostgreSQL synchronously to prevent race conditions during immediate redirect
      try {
        const p = getDbPool();
        const client = await p.connect();
        try {
          for (const [periodId, periodRows] of Object.entries(partitionedPeriods)) {
            const stats = periodStats[periodId];
            const [yearStr, monthStr] = periodId.split("-");
            const year = parseInt(yearStr);
            const month = parseInt(monthStr);
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const label = `${monthNames[month - 1]} ${year}`;

            console.log(`Writing period metadata to PostgreSQL for period: ${periodId}`);
            
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
                periodRows.length,
                new Date().toISOString(),
                req.file.originalname,
                "ticketing",
                JSON.stringify(stats)
              ]
            );

            // Provision year partition if not already existing
            await ensureYearPartition(client, year);

            // Delete existing chunks for this period
            await client.query("DELETE FROM period_chunks WHERE year = $1 AND period_id = $2", [year, periodId]);

            // Chunk rows and insert
            const chunkSize = 150;
            const chunksToInsert: { periodId: string; chunkIdx: number; rowsJson: string }[] = [];
            for (let i = 0; i < periodRows.length; i += chunkSize) {
              const chunkRows = periodRows.slice(i, i + chunkSize);
              const chunkIdx = Math.floor(i / chunkSize);
              chunksToInsert.push({
                periodId,
                chunkIdx,
                rowsJson: JSON.stringify(chunkRows)
              });
            }

            if (chunksToInsert.length > 0) {
              const placeholders = chunksToInsert.map((_, idx) => {
                const base = idx * 4;
                return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
              }).join(", ");
              const values = chunksToInsert.flatMap(c => [c.periodId, year, c.chunkIdx, c.rowsJson]);
              await client.query(
                `INSERT INTO period_chunks (period_id, year, chunk_index, rows)
                 VALUES ${placeholders}`,
                values
              );
            }

            await client.query("COMMIT");
            console.log(`Successfully stored ${periodRows.length} rows to PostgreSQL for period ${periodId}.`);
          }
        } catch (txErr) {
          await client.query("ROLLBACK");
          console.error("Database transaction failed inside upload loop:", txErr);
        } finally {
          client.release();
        }
      } catch (dbErr) {
        console.error("Failed to save ticketing data to PostgreSQL:", dbErr);
      }

      return res.json({
        fileType: "ticketing",
        fileName: req.file.originalname,
        columns: partitionedPeriods[dominantPeriodId].length > 0 ? Object.keys(partitionedPeriods[dominantPeriodId][0]) : [],
        totalRows: partitionedPeriods[dominantPeriodId].length,
        originalData: trimRowsForDashboard(partitionedPeriods[dominantPeriodId]),
        stats: periodStats[dominantPeriodId],
        periodId: dominantPeriodId
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
app.get("/api/export", async (req, res) => {
  try {
    const reportType = (req.query.report_type || "all") as string;
    const sbuFilter = (req.query.sbu_filter || "All") as string;
    const periodId = req.query.periodId as string | undefined;
    const yearParam = req.query.year as string | undefined;
    const limitToBranch = req.query.limit_to_branch === "true";
    const filterVersionId = req.query.filter_version_id as string | undefined;

    const wb = xlsx.utils.book_new();

    if (reportType === "ticketing") {
      let allRows: any[] = [];

      try {
        const p = getDbPool();
        if (periodId && !periodId.startsWith("yearly-")) {
          const yr = parseInt(periodId.split("-")[0], 10);
          const result = await p.query(
            `SELECT rows FROM period_chunks 
             WHERE year = $1 AND period_id = $2 
             ORDER BY chunk_index ASC`,
            [yr, periodId]
          );
          for (const r of result.rows) {
            if (Array.isArray(r.rows)) allRows.push(...r.rows);
          }
        } else {
          // Yearly or all
          const yr = periodId?.startsWith("yearly-") 
            ? parseInt(periodId.replace("yearly-", ""), 10) 
            : (yearParam ? parseInt(yearParam, 10) : new Date().getFullYear());
          
          const result = await p.query(
            `SELECT rows FROM period_chunks 
             WHERE year = $1 
             ORDER BY chunk_index ASC`,
            [yr]
          );
          for (const r of result.rows) {
            if (Array.isArray(r.rows)) allRows.push(...r.rows);
          }
        }
      } catch (dbErr) {
        console.warn("PostgreSQL export query fallback to local cache:", dbErr);
      }

      // Fallback if DB yielded no rows
      if (allRows.length === 0) {
        const cache = loadCache();
        if (periodId && cache?.periods?.[periodId]) {
          allRows = loadCachePeriodData(periodId);
        } else if (cache?.data) {
          allRows = cache.data;
        }
      }

      if (allRows.length === 0) {
        return res.status(404).json({ detail: "No ticketing data found for the requested period." });
      }

      // 1. SBU Terminating Filter
      if (sbuFilter && sbuFilter !== "All") {
        allRows = allRows.filter((row: any) => row.sbuter === sbuFilter || row.namasbu === sbuFilter);
      }

      // 2. Branch Customer Filter
      if (limitToBranch) {
        try {
          const p = getDbPool();
          let query = `SELECT item_value FROM branch_filter_items WHERE version_id = (SELECT id FROM branch_filter_versions WHERE is_active = true LIMIT 1)`;
          const params: any[] = [];
          if (filterVersionId) {
            query = `SELECT item_value FROM branch_filter_items WHERE version_id = $1`;
            params.push(filterVersionId);
          }
          const filterRes = await p.query(query, params);
          if (filterRes.rows.length > 0) {
            const branchSet = new Set(filterRes.rows.map(r => String(r.item_value).toLowerCase().trim()));
            allRows = allRows.filter((row: any) => {
              const idPel = String(row.idpelanggan || "").toLowerCase().trim();
              const namePel = String(row.namapelanggan || "").toLowerCase().trim();
              const sidBaru = String(row.sidbaru || "").toLowerCase().trim();
              const sidLama = String(row.sidlama || "").toLowerCase().trim();
              return branchSet.has(idPel) || branchSet.has(namePel) || branchSet.has(sidBaru) || branchSet.has(sidLama);
            });
          }
        } catch (filterErr) {
          console.warn("Branch filter lookup error during export:", filterErr);
        }
      }

      const ws = xlsx.utils.json_to_sheet(allRows);
      xlsx.utils.book_append_sheet(wb, ws, "Ticketing Data");

      const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
      const safeSbu = sbuFilter === "All" ? "" : `_${sbuFilter.replace(/[/\\?%*:|"<>]/g, "-")}`;
      const periodLabel = periodId || yearParam || "Dataset";
      res.setHeader("Content-Disposition", `attachment; filename="Ticketing_Data_${periodLabel}${safeSbu}.xlsx"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      return res.send(buf);

    } else {
      // Standard Excel Export Options
      const cache = loadCache();
      if (!cache) {
        return res.status(404).json({ detail: "No processed data found in cache. Please upload a file first." });
      }

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

// Get all branch customer filter versions
app.get("/api/branch-filter-versions", async (req, res) => {
  try {
    const p = getDbPool();
    const result = await p.query(
      `SELECT id, name, item_count as "itemCount", is_active as "isActive", 
              file_name as "fileName", created_at as "createdAt"
       FROM branch_filter_versions 
       ORDER BY created_at DESC`
    );
    return res.json({ versions: result.rows });
  } catch (err: any) {
    console.error("Error fetching filter versions:", err);
    return res.status(500).json({ detail: err.message });
  }
});

// Create and upload a new branch customer filter version
app.post("/api/branch-filter-versions", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: "No file uploaded" });
    }

    const versionName = (req.body.name || "").trim() || `Branch Filter ${new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}`;
    const setActive = req.body.setActive !== "false";

    const workbook = xlsx.read(req.file.buffer, {
      type: "buffer",
      cellFormula: false,
      cellHTML: false,
      cellStyles: false,
      cellText: false
    });
    const sheetName = workbook.SheetNames[0];
    const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (rawRows.length === 0) {
      return res.status(400).json({ detail: "Uploaded spreadsheet is empty" });
    }

    // Extract all unique values from all cells in the sheet
    const valuesSet = new Set<string>();
    rawRows.forEach((row: any) => {
      Object.values(row).forEach((val: any) => {
        if (val !== undefined && val !== null && val !== "") {
          const s = String(val).trim();
          if (s) valuesSet.add(s);
        }
      });
    });

    const values = Array.from(valuesSet);
    if (values.length === 0) {
      return res.status(400).json({ detail: "No valid customer values found in file" });
    }

    const versionId = `v-${Date.now()}`;
    const p = getDbPool();
    const client = await p.connect();
    try {
      await client.query("BEGIN");

      if (setActive) {
        await client.query("UPDATE branch_filter_versions SET is_active = false");
      }

      await client.query(
        `INSERT INTO branch_filter_versions (id, name, item_count, is_active, file_name)
         VALUES ($1, $2, $3, $4, $5)`,
        [versionId, versionName, values.length, setActive, req.file.originalname]
      );

      // Insert items in batches
      const batchSize = 100;
      for (let i = 0; i < values.length; i += batchSize) {
        const batch = values.slice(i, i + batchSize);
        const placeholders = batch.map((_, idx) => `($1, $${idx + 2})`).join(", ");
        const insertVals = [versionId, ...batch];
        await client.query(
          `INSERT INTO branch_filter_items (version_id, value) VALUES ${placeholders}`,
          insertVals
        );
      }

      // If active, also synchronize to legacy table and cache
      if (setActive) {
        await client.query("DELETE FROM branch_customers");
        for (let i = 0; i < values.length; i += batchSize) {
          const batch = values.slice(i, i + batchSize);
          await client.query(
            `INSERT INTO branch_customers (value) VALUES ${batch.map((_, idx) => `($${idx + 1})`).join(", ")} ON CONFLICT (value) DO NOTHING`,
            batch
          );
        }
        let cache = loadCache() || { type: "multi-period-ticketing", periods: {} };
        cache.branchCustomers = values;
        saveCache(cache);
      }

      await client.query("COMMIT");
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }

    return res.json({
      success: true,
      version: {
        id: versionId,
        name: versionName,
        itemCount: values.length,
        isActive: setActive,
        fileName: req.file.originalname,
        createdAt: new Date().toISOString()
      },
      values
    });
  } catch (err: any) {
    console.error("Error creating branch filter version:", err);
    return res.status(500).json({ detail: err.message });
  }
});

// Switch active branch customer filter version
app.put("/api/branch-filter-versions/:id/activate", async (req, res) => {
  try {
    const { id } = req.params;
    const p = getDbPool();
    const client = await p.connect();
    let values: string[] = [];
    try {
      await client.query("BEGIN");
      await client.query("UPDATE branch_filter_versions SET is_active = false");
      const updateRes = await client.query(
        "UPDATE branch_filter_versions SET is_active = true WHERE id = $1 RETURNING id, name, item_count",
        [id]
      );
      if (updateRes.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ detail: "Version not found" });
      }

      const itemsRes = await client.query(
        "SELECT value FROM branch_filter_items WHERE version_id = $1",
        [id]
      );
      values = itemsRes.rows.map(r => r.value);

      // Sync to legacy table & cache
      await client.query("DELETE FROM branch_customers");
      const batchSize = 100;
      for (let i = 0; i < values.length; i += batchSize) {
        const batch = values.slice(i, i + batchSize);
        await client.query(
          `INSERT INTO branch_customers (value) VALUES ${batch.map((_, idx) => `($${idx + 1})`).join(", ")} ON CONFLICT (value) DO NOTHING`,
          batch
        );
      }
      let cache = loadCache() || { type: "multi-period-ticketing", periods: {} };
      cache.branchCustomers = values;
      saveCache(cache);

      await client.query("COMMIT");
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }

    return res.json({ success: true, activeVersionId: id, values });
  } catch (err: any) {
    console.error("Error activating filter version:", err);
    return res.status(500).json({ detail: err.message });
  }
});

// Rename a branch customer filter version
app.put("/api/branch-filter-versions/:id/rename", async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ detail: "A valid filter version name is required" });
    }
    const p = getDbPool();
    const result = await p.query(
      "UPDATE branch_filter_versions SET name = $1 WHERE id = $2 RETURNING id, name, item_count as \"itemCount\", is_active as \"isActive\"",
      [name.trim(), id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ detail: "Version not found" });
    }
    return res.json({ success: true, version: result.rows[0] });
  } catch (err: any) {
    console.error("Error renaming filter version:", err);
    return res.status(500).json({ detail: err.message });
  }
});

// Delete a specific branch filter version
app.delete("/api/branch-filter-versions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const p = getDbPool();
    const client = await p.connect();
    try {
      await client.query("BEGIN");
      const verRes = await client.query(
        "SELECT is_active FROM branch_filter_versions WHERE id = $1",
        [id]
      );
      if (verRes.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ detail: "Version not found" });
      }
      const wasActive = verRes.rows[0].is_active;

      // Delete version (cascade deletes items)
      await client.query("DELETE FROM branch_filter_versions WHERE id = $1", [id]);

      // If deleted version was active, activate the most recent remaining version if available
      if (wasActive) {
        const nextVer = await client.query(
          "SELECT id FROM branch_filter_versions ORDER BY created_at DESC LIMIT 1"
        );
        if (nextVer.rowCount && nextVer.rowCount > 0) {
          const nextId = nextVer.rows[0].id;
          await client.query("UPDATE branch_filter_versions SET is_active = true WHERE id = $1", [nextId]);
          const nextItems = await client.query("SELECT value FROM branch_filter_items WHERE version_id = $1", [nextId]);
          const values = nextItems.rows.map(r => r.value);
          await client.query("DELETE FROM branch_customers");
          const batchSize = 100;
          for (let i = 0; i < values.length; i += batchSize) {
            const batch = values.slice(i, i + batchSize);
            await client.query(
              `INSERT INTO branch_customers (value) VALUES ${batch.map((_, idx) => `($${idx + 1})`).join(", ")} ON CONFLICT (value) DO NOTHING`,
              batch
            );
          }
          let cache = loadCache() || { type: "multi-period-ticketing", periods: {} };
          cache.branchCustomers = values;
          saveCache(cache);
        } else {
          await client.query("DELETE FROM branch_customers");
          let cache = loadCache();
          if (cache) {
            delete cache.branchCustomers;
            saveCache(cache);
          }
        }
      }

      await client.query("COMMIT");
      return res.json({ success: true, message: `Version ${id} deleted` });
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("Error deleting filter version:", err);
    return res.status(500).json({ detail: err.message });
  }
});

// Upload a list of customers belonging to the branch (legacy route adapter)
app.post("/api/branch-customers", upload.single("file"), async (req, res) => {
  // Delegate directly to branch-filter-versions
  req.url = "/api/branch-filter-versions";
  return app._router.handle(req, res);
});

// Fetch all registered branch customer list values and active version info
app.get("/api/branch-customers", async (req, res) => {
  try {
    const p = getDbPool();
    try {
      // First check active version
      const activeVerRes = await p.query(
        "SELECT id, name, item_count as \"itemCount\", file_name as \"fileName\", created_at as \"createdAt\" FROM branch_filter_versions WHERE is_active = true LIMIT 1"
      );
      if (activeVerRes.rowCount && activeVerRes.rowCount > 0) {
        const activeVer = activeVerRes.rows[0];
        const itemsRes = await p.query(
          "SELECT value FROM branch_filter_items WHERE version_id = $1",
          [activeVer.id]
        );
        return res.json({
          values: itemsRes.rows.map(r => r.value),
          activeVersion: activeVer
        });
      }

      // Fallback to legacy branch_customers table
      const legacyRes = await p.query("SELECT value FROM branch_customers");
      const list = legacyRes.rows.map((r: any) => r.value);
      return res.json({ values: list, activeVersion: null });
    } catch (dbErr) {
      const cache = loadCache();
      return res.json({ values: cache?.branchCustomers || [], activeVersion: null });
    }
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// Clear registered branch customer list
app.delete("/api/branch-customers", async (req, res) => {
  try {
    const cache = loadCache();
    if (cache) {
      delete cache.branchCustomers;
      saveCache(cache);
    }

    try {
      const p = getDbPool();
      await p.query("DELETE FROM branch_filter_versions");
      await p.query("DELETE FROM branch_filter_items");
      await p.query("DELETE FROM branch_customers");
    } catch (dbErr) {
      console.error("Database delete failed for branch customers:", dbErr);
    }

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
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
