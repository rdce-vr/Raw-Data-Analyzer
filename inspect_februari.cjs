const xlsx = require('xlsx');

try {
  const filePath = "E:\\Documents\\Kreshna\\Doc\\Monthly Report Februari 2026.xlsx";
  const workbook = xlsx.readFile(filePath);
  
  console.log("Sheet names found in February report:", workbook.SheetNames);
  
  // Try smart sheet selection
  let sheetName = "";
  const keywords = ["gangguan", "ticket", "data", "report"];
  for (const name of workbook.SheetNames) {
    const lname = name.toLowerCase();
    if (keywords.some(kw => lname.includes(kw))) {
      sheetName = name;
      break;
    }
  }
  if (!sheetName) {
    sheetName = workbook.SheetNames[0];
  }
  
  console.log("Smart selected sheet:", sheetName);
  
  const sheet = workbook.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json(sheet);
  console.log("Total parsed rows:", rawRows.length);
  
  if (rawRows.length > 0) {
    const headers = Object.keys(rawRows[0]);
    console.log("Headers found:", headers);
    
    // Check required columns normalization
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ""));
    console.log("Normalized headers:", normalizedHeaders);
    
    // Let's check for critical columns mapping: idtiket, idpelanggan, waktulapor, namapelanggan, penyebab
    const crucial = ["idtiket", "idpelanggan", "waktulapor", "namapelanggan", "penyebab"];
    crucial.forEach(col => {
      const matchIdx = normalizedHeaders.indexOf(col);
      if (matchIdx !== -1) {
        console.log(`- Crucial column '${col}' matched: '${headers[matchIdx]}'`);
      } else {
        console.log(`- Crucial column '${col}' NOT matched!`);
      }
    });

    console.log("\nSample row (First 1):", JSON.stringify(rawRows[0], null, 2));
  } else {
    console.log("No rows parsed. The sheet might be empty or formatted differently.");
  }
} catch (err) {
  console.error("Error reading February file:", err.message);
}
