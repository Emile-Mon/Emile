# Epoch Labs - Autonomous Robinhood Chain Token Survival Platform

<p align="center">
  <img src="docs/images/epc-live-mainnet.jpg" alt="EPC Is Live On Mainnet - Robinhood Chain" width="100%" />
</p>

> **Epoch Labs** is an autonomous machine learning intelligence platform that observes every Robinhood Chain token launched that crosses **$10,000 peak market cap**, and learns which of them go on to reach **$30,000 peak market cap**. Epoch Labs publishes everything it learns, live, on a public research dashboard.

[![GitHub Repository](https://img.shields.io/badge/GitHub-epochlabshq%2FEpochLabs-181717?style=for-the-badge&logo=github)](https://github.com/epochlabshq/EpochLabs)
[![X / Twitter](https://img.shields.io/badge/X-@EpochLabsHQ-000000?style=for-the-badge&logo=x)](https://x.com/EpochLabsHQ)

**Network:** Robinhood Chain Mainnet  
**Contract Address (CA):** `0xb71463fbe6a6edef8d9d8cb0ccb5ab84cd0a353e`  
**Research Engine:** Machine Learning Binary Classification (LightGBM)

Epoch Labs does **not** launch a token of its own until its model's proven performance floor clears **ROC-AUC 0.60**. That threshold is enforced strictly by mathematical bounds in code, not by arbitrary timelines. The jar and hourglass on the dashboard serve as the visual representation of that strict mathematical gate.

---

## ⚠️ What Epoch Labs Is & What It Is Not

### What Epoch Labs Is
* A conditional probability estimator answering: *"Given a token already reached $10K peak market cap, what is the probability it reaches $30K peak market cap?"*
* A 100% transparent, open-data research platform publishing raw labeled CSV datasets (`/api/dataset.csv`) and machine-readable methodology specs (`/api/methodology.json`).
* An automated pipeline enforcing Vapnik–Chervonenkis (VC) capacity bounds and Bootstrap resample percentile limits.

### What Epoch Labs Is Not
* Epoch Labs **does not predict price**.
* Epoch Labs **does not have an edge that guarantees returns**. Four feature families cannot forecast an entire market.
* The jar **is not decorative**. If the model is insufficient or sample size is thin, the jar stays empty and the site explicitly names the failing gate (`blocked_by`).

---

## 🛠️ Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL DATA SOURCES                         │
│  ┌──────────────────────┐  ┌─────────────────────┐  ┌────────────────┐  │
│  │ Robinhood Token Mints│  │ DexScreener API     │  │ Chain RPC      │  │
│  │ (Ingest Worker)      │  │ (Market Cap Poller) │  │ (Holders DAS)  │  │
│  └──────────┬───────────┘  └──────────┬──────────┘  └───────┬────────┘  │
└─────────────┼─────────────────────────┼─────────────────────┼───────────┘
              │                         │                     │
┌─────────────▼─────────────────────────▼─────────────────────▼───────────┐
│                            WORKER LAYER (Python 3.11)                   │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐    │
│  │ Ingest Worker    │ │ Label Worker      │ │ Lore Safety Worker    │    │
│  │ (every 60s)      │ │ (every 15m)       │ │ (on ingest)          │    │
│  └──────────┬───────┘ └──────────┬────────┘ └───────────┬───────────┘    │
│             │                    │                       │               │
│             │         ┌──────────▼────────┐              │               │
│             │         │ ML Training Job   │              │               │
│             │         │ (every 1h)        │              │               │
│             │         └──────────┬────────┘              │               │
│             │                    │                       │               │
└─────────────┼────────────────────┼───────────────────────┼───────────────┘
              │                    │                       │
              ▼                    ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     DATA & EVENT BUS LAYER                              │
│  ┌─────────────────────────────────────┐  ┌──────────────────────────┐  │
│  │ PostgreSQL 15+                      │  │ Redis 7.x (Pub/Sub)      │  │
│  │ (Tokens, Daily Universe, Model Runs)│  │ (Live Event Streaming)   │  │
│  └─────────────────────────────────────┘  └────────────┬─────────────┘  │
└────────────────────────────────────────────────────────┼────────────────┘
                                                         │
┌────────────────────────────────────────────────────────▼────────────────┐
│                         API LAYER (FastAPI)                             │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ REST (/api/state, /api/dataset.csv, /api/methodology.json, ...)  │  │
│  │ WebSocket Server (wss://.../stream)                               │  │
│  └──────────────────────────────────┬────────────────────────────────┘  │
└─────────────────────────────────────┼───────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────────┐
│                       FRONTEND LAYER (Next.js 16 / App Router)          │
│  ┌──────────────────────────┐ ┌──────────────────┐ ┌─────────────────┐ │
│  │ Hero Scene (Video)       │ │ CRT Live Screen  │ │ Proof Panel     │ │
│  │ + Live Video Feed        │ │ (lore sanitized) │ │ (sliders & gates│ │
│  └──────────────────────────┘ └──────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

| Layer | Technology | Function |
|---|---|---|
| **Backend** | Python 3.11 + FastAPI | Async ASGI server, REST endpoints & WebSocket broadcaster. |
| **ML Engine** | `LightGBM`, `scikit-learn`, `sentence-transformers` | 5-Fold Stratified CV, MiniLM-L6-v2 embedding -> PCA 24 dims. |
| **Database** | PostgreSQL 15+ + SQLAlchemy 2.0 Async | Connection pool optimization, indexed writes for ingest & label workers. |
| **Cache & Bus** | Redis 7.x | Pub/Sub realtime event streaming & in-memory state caching. |
| **Frontend** | Next.js 16 (App Router) + Zustand | Glassmorphic CRT dashboard, rAF event batching, interactive math verification. |

---

## 🧮 Machine Learning & Mathematical Formulations

### 1. Feature Families (4 Families, Capacity $d = 28$)
1. `launch_hour`: $\sin$ / $\cos$ encoding of UTC hour-of-day (2 columns).
2. `launch_dow`: One-hot encoded day-of-week (7 columns).
3. `holders`: $\log(1 + \text{holders})$ sampled ONCE at 48-hour mark via RPC.
4. `lore`: Text embedding (`sentence-transformers/all-MiniLM-L6-v2`) reduced via PCA to 24 dimensions + `lore_len` + `lore_missing` + `name_tokens`.

### 2. Proven Performance Floor Formula
$$\text{proven}_{\text{floor}} = \min(\text{floor}_{\text{VC}}, \text{floor}_{\text{boot}})$$

Where:
* **VC Capacity Penalty**:
  $$\epsilon_{\text{VC}} = \sqrt{\frac{d(\ln(2n/d) + 1) + \ln(4/\delta)}{n}}$$
  $$\text{floor}_{\text{VC}} = \text{AUC}_{\text{mean}} - \epsilon_{\text{VC}}$$
* **Bootstrap Lower Bound**:
  $$\text{floor}_{\text{boot}} = \text{Percentile}_{2.5}(\text{Bootstrap}_{\text{AUCs}})$$
* **Jar Level**:
  $$\text{jar}_{\text{level}} = \text{clamp}\left(\frac{\text{proven}_{\text{floor}} - 0.50}{0.60 - 0.50}, 0.0, 1.0\right)$$

### 3. Hard Gates Verification
All 4 gates must pass to allow `jar_level` to reach `1.0`. If any gate fails, `jar_level` is capped at `0.95` and `blocked_by` publishes the failing gate name:
* `n_samples >= 2000`
* `n_positive >= 200`
* `auc_std < 0.05`
* `time_split_gap <= 0.04` (sanity check against temporal data leakage)

---

## 📂 Repository Structure

```
EpochLabs/
├── backend/
│   ├── app/
│   │   ├── api/               # REST Endpoints (/api/state, /api/dataset.csv, /api/methodology.json) & WebSocket
│   │   ├── core/              # Config & environment settings
│   │   ├── db/                # Database connection & SQLAlchemy models (optimized pool)
│   │   ├── ml/                # Feature extraction, LightGBM training, VC & Bootstrap math
│   │   ├── services/          # Ingest, DexScreener batch poller, Lore safety, Holder sampler
│   │   └── workers/           # Background scheduler loops
│   ├── tests/                 # Test suite (test_lore_safety, test_jar_math, test_leakage)
│   ├── DDL.sql                # PostgreSQL 15+ database schema
│   ├── main.py                # ASGI application entrypoint
│   └── requirements.txt       # Python dependencies
├── frontend/
│   ├── public/
│   │   ├── videos/            # Stone_golem_types_at_keyboard.mp4
│   │   ├── epoch-logo.png     # Glossy Golden Hourglass Brand Icon
│   │   └── favicon.ico
│   ├── src/
│   │   ├── app/               # Next.js App Router pages (/, /about)
│   │   ├── components/        # HeroScene, CrtTerminal, ProofPanel, StatsStrip, HeaderBar, FooterBar
│   │   ├── store/             # Zustand state store with rAF batching & background tab drop
│   │   └── styles/            # CSS Design System tokens & CRT scanline effects
│   ├── next.config.ts         # Next.js configuration
│   └── package.json           # Frontend dependencies
└── README.md                  # System documentation
```

---

## 🚀 Getting Started

### Prerequisites
* **Python**: 3.10 or 3.11
* **Node.js**: v18+ (npm or pnpm)
* **PostgreSQL**: 15+
* **Redis**: 7.x (optional for local mock mode)

### 1. Database Setup
```bash
# Create PostgreSQL database
createdb epochlabs_db

# Execute DDL schema migration
psql -d epochlabs_db -f backend/DDL.sql
```

### 2. Backend Setup (FastAPI & ML Engine)
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run Unit Tests
python -m unittest discover tests

# Start FastAPI Server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
* **Swagger API Documentation**: `http://localhost:8000/docs`

### 3. Frontend Setup (Next.js 16)
```bash
cd frontend

# Install dependencies
npm install

# Start Development Server
npm run dev

# Or Build & Run Production Server
npm run build
npm run start
```
* **Web Application**: `http://localhost:3000` (or `http://localhost:3003` if port 3000 is occupied)

---

## 🔌 API Contract Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/state` | Full snapshot: latest 100 tokens, counters, latest model run with 15s cache. |
| `GET` | `/api/model/history?days=30` | Model run history for AUC-over-time chart. |
| `GET` | `/api/methodology.json` | Machine-readable methodology specification. |
| `GET` | `/api/dataset.csv` | **Public downloadable labeled dataset CSV.** |
| `WS` | `wss://.../stream` | Realtime event stream (`token`, `counters`, `model`, `code`). |

---

## 📄 License & Disclaimer

* **Disclaimer**: Epoch Labs is an open quantitative research platform and machine learning experiment, not a financial adviser. Four feature families cannot forecast market anomalies. This platform rigorously measures historical survival probabilities under statistical capacity bounds, not price targets.
