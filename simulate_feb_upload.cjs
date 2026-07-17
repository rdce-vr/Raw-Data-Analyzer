const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Import helper functions (since backend compiles to JS/CJS eventually or we can just import the TS files using ts-node or duplicate the logic for testing)
// Let's replicate the exact code in server.ts:
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

function renameAndNormalize(rows, targetColumns) {
  if (rows.length === 0) return rows;
  const colMap = {};
  const headers = Object.keys(rows[0]);

  headers.forEach(h => {
    const norm = h.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    
    if (norm === "durasilaporansemenit" || norm === "durasilaporanmenit") {
      colMap[h] = "durasilaporanmenit";
      return;
    }
    if (norm === "durasigangguanminusstopclock" || norm === "durasigangguaminusstopclock") {
      colMap[h] = "durasigangguaminusstopclock";
      return;
    }
    if (norm === "sumberlaporan" || norm === "sumber") {
      colMap[h] = "namasumber";
      return;
    }
    if (norm === "waktugangguan1" || norm === "waktugangguan1" || norm === "waktugangguan_1") {
      colMap[h] = "waktugangguan2";
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
    const newRow = {};
    Object.keys(row).forEach(k => {
      const mappedKey = colMap[k] || k;
      newRow[mappedKey] = row[k];
    });
    return newRow;
  });
}

function parseDurationToSeconds(val) {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") return Math.round(val * 86400);
  const s = String(val).trim();
  if (!s.includes(":") && !isNaN(Number(s))) return Math.round(Number(s) * 86400);
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
    }
    return sec;
  }
  return 0;
}

function parseExcelDate(val) {
  if (val === undefined || val === null || val === "") return null;
  if (typeof val === "number") {
    const msSinceEpoch = (val - 25569) * 86400 * 1000;
    return new Date(msSinceEpoch);
  }
  const s = String(val).trim();
  const dmyRegex = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
  const dmyMatch = s.match(dmyRegex);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    const hours = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const minutes = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const seconds = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(year, month - 1, day, hours, minutes, seconds);
    }
  }
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d;
  return null;
}

try {
  const filePath = "E:\\Documents\\Kreshna\\Doc\\Monthly Report Februari 2026.xlsx";
  const workbook = xlsx.readFile(filePath);
  
  let sheetName = workbook.SheetNames[0];
  for (const name of workbook.SheetNames) {
    const norm = name.toLowerCase();
    if (norm.includes("gangguan") || norm.includes("ticket") || norm.includes("data") || norm.includes("report")) {
      sheetName = name;
      break;
    }
  }
  
  console.log("Reading sheet:", sheetName);
  const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
  console.log("Total rows:", rawRows.length);
  
  // Try processing
  console.log("Normalizing rows...");
  const processedRows = renameAndNormalize(rawRows, TICKETING_COLUMNS);
  console.log("Normalized rows sample:", JSON.stringify(processedRows[0], null, 2));

  // Try parsing period
  console.log("Determining dominant period...");
  const counts = {};
  processedRows.forEach((row, idx) => {
    try {
      const d = parseExcelDate(row.waktulapor) || parseExcelDate(row.tanggalinsiden);
      let periodKey = "";
      if (d) {
        periodKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      } else {
        const now = new Date();
        periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      }
      counts[periodKey] = (counts[periodKey] || 0) + 1;
    } catch (e) {
      console.error(`Error parsing date at row ${idx}:`, e.message, row);
    }
  });

  console.log("Period counts:", counts);
} catch (err) {
  console.error("Execution failed:", err);
}
