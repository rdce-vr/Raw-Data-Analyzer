export const REQUIRED_COLUMNS = ["namaPelanggan", "namaLayanan", "sid", "latestMutasi", "hargaPelanggan", "SalesOwner"];

export const TICKETING_COLUMNS = [
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

// Name standardization & case-insensitive header mapping with robust normalization
export function renameAndNormalize(rows: any[], targetColumns: string[]): any[] {
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
    if (norm === "sumberlaporan" || norm === "sumber") {
      colMap[h] = "namasumber";
      return;
    }
    if (norm === "waktugangguan1" || norm === "waktugangguan1") {
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
    const newRow: any = {};
    Object.keys(row).forEach(k => {
      const mappedKey = colMap[k] || k;
      newRow[mappedKey] = row[k];
    });
    return newRow;
  });
}

// Duration string parser
export function parseDurationToSeconds(val: any): number {
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

export function parseExcelDate(val: any): Date | null {
  if (val === undefined || val === null || val === "") return null;
  if (typeof val === "number") {
    const msSinceEpoch = (val - 25569) * 86400 * 1000;
    return new Date(msSinceEpoch);
  }
  
  const s = String(val).trim();
  
  // 1. Match DD/MM/YYYY or DD-MM-YYYY (Indonesian format) with optional time
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

  // 2. Match YYYY-MM-DD or YYYY/MM/DD with optional time
  const ymdRegex = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
  const ymdMatch = s.match(ymdRegex);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    const hours = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 0;
    const minutes = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0;
    const seconds = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0;

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(year, month - 1, day, hours, minutes, seconds);
    }
  }

  // 3. Fallback to default Javascript Date parser
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d;
  return null;
}
