# Ticketing Report & SLA Dashboard

Ticketing Report & SLA Dashboard is a high-performance full-stack web application designed to process, analyze, and visualize raw operational ticketing and SLA spreadsheets. It transforms unstructured Excel/CSV logs into key performance metrics, interactive visual charts, and searchable hierarchical registries.

---

## Key Features

* **Flexible File Ingestion**: Upload Excel (`.xlsx`, `.xls`, `.xlsb` binary format) or `.csv` files.
* **Automatic Data Standardization**: Cleans raw dates, standardizes duration strings, maps SBU owners, and handles case-insensitive columns automatically.
* **Jawa Tengah Branch Filter**: Toggleable branch customer list filter to isolate regional records. Users can upload custom customer/SID filter lists directly in the Dataset Manager.
* **High-Performance DB Batch Inserts**: Saves large datasets (e.g., 20,000+ rows) to PostgreSQL in under a second using multi-row batch chunking, preventing connection timeouts.
* **Responsive Visual Dashboards**:
  * KPI summary cards (Revenue, ticket volumes, and resolve times).
  * Interactive Recharts (Kantor Perwakilan performance, Revenue by service, and Service SID allocation).
  * Collapsible repeating incident analysis tables and top-cause rankings (automatically filtering out hyphen `"-"` causes).
* **Searchable Hierarchical Logs**: Tree-view explorer grouping data from **Customer ID/Name** &rarr; **Service ID (SID)** &rarr; **Individual Ticket History**.
* **PostgreSQL & Local Cache Dual-Storage**: Persistently saves periods to a PostgreSQL database with a automatic, seamless fallback to partitioned local JSON cache files if the database is offline.

---

## Project Architecture

The codebase has been refactored into a clean, modular structure:
* `/backend`: Decoupled services containing database pools (`db.ts`), partitioned cache managers (`cache.ts`), and Excel parsing engines (`excelParser.ts`).
* `/src/components/dashboard`: Decoupled frontend components for charts, metrics, detailed tables, and hierarchical logs.
* `server.ts`: Lightweight Express API server and entry point.
* `src/components/Dashboard.tsx`: Dashboard layout coordinator.

---

## Run Locally

### Prerequisites
* Node.js (v20+)
* PostgreSQL (or rely on the automatic partitioned local JSON file cache)

### Setup & Run
1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
   NODE_ENV=development
   ```

3. **Start the App (Vite + Node Server):**
   ```bash
   npm run dev
   ```

4. **Access the Dashboard:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Docker Deployment

The application is containerized and ready for production deployment using Docker.

1. **Start the application services (Node App + PostgreSQL DB):**
   ```bash
   docker-compose up -d --build
   ```

2. **Database Schema Seeding:**
   The database schema is initialized and seeded from cache automatically at boot time.

3. **Nginx Configuration Tip:**
   If running behind an Nginx reverse proxy, increase the client body size limit in your site configuration to allow uploading large spreadsheets (e.g., 12MB+ files):
   ```nginx
   server {
       ...
       client_max_body_size 50M;
       ...
   }
   ```
