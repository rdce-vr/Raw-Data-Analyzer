export const COLORS = ['#00AFF0', '#fbbf24', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];
export const PIE_COLORS = ['#00AFF0', '#38bdf8', '#fbbf24', '#f59e0b', '#93c5fd', '#818cf8', '#34d399'];

// Helper to format minutes into human readable text
export const formatMinutes = (minutes: number): string => {
  if (!minutes || isNaN(minutes) || minutes <= 0) return '0m';
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remMin = Math.round(minutes % 60);
  if (hours < 24) {
    return `${hours}h ${remMin}m`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return `${days}d ${remHours}h`;
};

// Helper to format dates (supporting Excel serial numbers and string dates)
export const formatDateVal = (val: any): string => {
  if (val === undefined || val === null || val === "") return '-';
  
  let dateObj: Date | null = null;
  if (typeof val === "number") {
    const msSinceEpoch = (val - 25569) * 86400 * 1000;
    dateObj = new Date(msSinceEpoch);
  } else {
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
        dateObj = new Date(year, month - 1, day, hours, minutes, seconds);
      }
    } else {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        dateObj = d;
      }
    }
  }
  
  if (dateObj && !isNaN(dateObj.getTime())) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(dateObj.getDate())}/${pad(dateObj.getMonth() + 1)}/${dateObj.getFullYear()} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}`;
  }
  
  return String(val);
};

export function getFriendlyLabel(key: string): string {
  const map: Record<string, string> = {
    waktulapor: "Waktu Lapor",
    waktulaporanselesai: "Waktu Laporan Selesai",
    waktugangguan: "Waktu Gangguan",
    waktugangguan2: "Waktu Gangguan 2",
    waktugangguanselesai: "Waktu Gangguan Selesai",
    durasilaporanmenit: "Durasi Laporan (Menit)",
    durasigangguanmenit: "Durasi Gangguan (Menit)",
    durasilaporan: "Durasi Laporan",
    durasigangguan: "Durasi Gangguan",
    "Durasi Ticket": "Durasi Ticket",
    "DURASI (HH:MM:SS)": "Durasi (HH:MM:SS)",
    "Durasi Incident": "Durasi Incident",
    durasistopclock: "Durasi Stopclock",
    durasigangguaminusstopclock: "Durasi Gangguan - Stopclock",
    durasigangguanminusstopclock: "Durasi Gangguan - Stopclock",
    durasistopclockpelanggan: "Durasi Stopclock Pelanggan",
    durasigangguanminusstopclockpelanggan: "Durasi Gangguan - Stopclock Pelanggan",
    namapelanggan: "Nama Pelanggan",
    namasbu: "SBU Owner",
    namakp: "Kantor Perwakilan (KP)",
    status: "Status",
    idtiket: "ID Tiket",
    idpelanggan: "ID Pelanggan",
    idinsiden: "ID Insiden",
    sidbaru: "SID Baru",
    sidlama: "SID Lama",
    namakelompok: "Kelompok",
    namakondisi: "Kondisi",
    laporanberulang: "Laporan Berulang",
    namapelapor: "Nama Pelapor",
    isilaporan: "Isi Laporan",
    tanggapan: "Tanggapan",
    penerimalaporan: "Penerima Laporan",
    produk: "Produk",
    posisitiket: "Posisi Tiket",
    idolt: "ID OLT",
    brandolt: "Brand OLT",
    idsplitter: "ID Splitter",
    penyebab: "Penyebab",
    penyebabdetail: "Detail Penyebab",
    namamitra: "Nama Mitra",
    petugaslapangan: "Petugas Lapangan",
    tipetiket: "Tipe Tiket",
    namasumber: "Nama Sumber",
    detailSumberLaporan: "Detail Sumber Laporan",
    segmenicon: "Segmen Icon",
    tanggalinsiden: "Tanggal Insiden",
    priority: "Priority",
    "sbu owner": "SBU Owner (Asli)",
    periode: "Periode"
  };
  
  if (map[key]) return map[key];
  if (map[key.toLowerCase()]) return map[key.toLowerCase()];
  
  // Clean fallback
  return key.replace(/([A-Z0-9])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
