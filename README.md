# PLN IconSLA Analytics Dashboard

PLN IconSLA Analytics Dashboard is a premium full-stack application designed to process and analyze raw ticketing and SLA spreadsheets. It transforms unstructured raw operational logs into key performance metrics, visual reports, and trend analysis charts.

---

## Features
- **File Ingestion**: Upload Excel (`.xlsx`, `.xls`) or CSV logs containing ticketing or standard operational data.
- **Data Standardization**: Automatically standardizes columns, handles case-insensitivity, cleans duration strings, and standardizes regional SBU groupings.
- **Rich Visual Analytics**:
  - SLA & Performance metrics cards.
  - Interactive charts for ticket status distributions, repeating tickets, and SBU performances.
  - Paginated customer databases and detailed cause analysis tables.
- **PostgreSQL Database**: Persistently stores uploaded metrics and period chunks for historical analysis.
- **Local File Cache Fallback**: Seamless fallback cache when database connectivity is offline.

---

## Run Locally

### Prerequisites
- Node.js (v18+)
- PostgreSQL (Optional, fallbacks to local JSON cache automatically)

### Setup & Run
1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Create a `.env.local` file or copy `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
   Set your database connection URL under `DATABASE_URL` (optional) and configure your `GEMINI_API_KEY`.

3. **Start the Development Server:**
   ```bash
   npm run dev
   ```

4. **Access the App:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.
