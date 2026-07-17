import path from "path";
import fs from "fs";

// Forward-declare parseExcelDate to break the circular dependency.
// The actual implementation is provided by excelParser.ts and injected at boot via setParseExcelDate().
let _parseExcelDate: (val: any) => Date | null = () => null;

export function setParseExcelDate(fn: (val: any) => Date | null) {
  _parseExcelDate = fn;
}

const CACHE_FILE = path.join(process.cwd(), "server_cache_v2.json");

function getCachePeriodDataFile(periodId: string): string {
  return path.join(process.cwd(), `cache_data_${periodId}.json`);
}

// Helper to write to JSON cache
export function saveCache(data: any) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Cache saving error:", err);
  }
}

// Load a specific period's row data from its dedicated cache file
export function loadCachePeriodData(periodId: string): any[] {
  const file = getCachePeriodDataFile(periodId);
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    }
  } catch (err) {
    console.error(`Error loading cache period data for ${periodId}:`, err);
  }
  return [];
}

// Helper to load from JSON cache with automatic migration and data partitioning
export function loadCache(): any {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
      
      // 1. Migrate old single-period ticketing format to multi-period
      if (cache && cache.type === "ticketing" && cache.data) {
        console.log("Migrating legacy single-period ticketing cache to multi-period...");
        const rows = cache.data || [];
        const stats = cache.stats || {};

        let periodId = "";
        const periodCounts: Record<string, number> = {};
        rows.forEach((row: any) => {
          const d = _parseExcelDate(row.waktulapor) || _parseExcelDate(row.tanggalinsiden);
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

        if (!periodId) {
          const now = new Date();
          periodId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        }

        // Save rows separately
        const file = getCachePeriodDataFile(periodId);
        fs.writeFileSync(file, JSON.stringify(rows), "utf8");

        const migratedCache = {
          type: "multi-period-ticketing",
          periods: {
            [periodId]: {
              stats: stats
            }
          }
        };
        saveCache(migratedCache);
        return migratedCache;
      }
      
      // 2. Migrate existing multi-period cache: extract large data arrays to separate files
      if (cache && cache.type === "multi-period-ticketing" && cache.periods) {
        let modified = false;
        Object.entries(cache.periods).forEach(([periodId, content]: [string, any]) => {
          if (content && content.data) {
            console.log(`Extracting period data array for ${periodId} to dedicated cache file...`);
            const file = getCachePeriodDataFile(periodId);
            fs.writeFileSync(file, JSON.stringify(content.data), "utf8");
            delete content.data;
            modified = true;
          }
        });
        if (modified) {
          saveCache(cache);
        }
      }
      return cache;
    }
  } catch (err) {
    console.error("Cache loading/migration error:", err);
  }
  return null;
}

// Save or update a specific period inside the multi-period cache
export function saveCachePeriod(periodId: string, data: any[], stats: any) {
  try {
    let cache = loadCache();
    if (!cache || cache.type !== "multi-period-ticketing") {
      cache = {
        type: "multi-period-ticketing",
        periods: {}
      };
    }
    if (!cache.periods) {
      cache.periods = {};
    }
    
    // Store only stats in the main cache file
    cache.periods[periodId] = {
      stats
    };
    saveCache(cache);

    // Save actual data array in a separate file
    const file = getCachePeriodDataFile(periodId);
    fs.writeFileSync(file, JSON.stringify(data), "utf8");
    console.log(`Saved ${data.length} rows to dedicated cache: ${file}`);
  } catch (err) {
    console.error("Error saving period to cache:", err);
  }
}

// Delete a specific period from the multi-period cache
export function deleteCachePeriod(periodId: string) {
  try {
    const cache = loadCache();
    if (cache && cache.type === "multi-period-ticketing" && cache.periods) {
      if (cache.periods[periodId]) {
        delete cache.periods[periodId];
        saveCache(cache);
        console.log(`Deleted period ${periodId} from metadata cache.`);
      }
    }
    const file = getCachePeriodDataFile(periodId);
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`Deleted cache file: ${file}`);
    }
  } catch (err) {
    console.error("Error deleting period from cache:", err);
  }
}
