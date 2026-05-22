# N.E.X.U.S.
### Northern Environmental X-system for Universal Sanitation

> **UNICEF Hackathon 2025** — Climate-resilient sanitation solutions for the entire sanitation service chain under increasingly volatile climatic conditions.

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql)](https://neon.tech)
[![Gemini AI](https://img.shields.io/badge/Gemini-2.5_Flash-4285F4?logo=google)](https://ai.google.dev)

---

## The Problem

Northern Ghana faces a compounding crisis: climate change is intensifying flooding, increasing temperatures, and disrupting rainfall patterns — all of which directly destroy sanitation infrastructure, contaminate water sources, and create public health emergencies. Existing systems are fragmented, reactive, and invisible to decision-makers. Communities lack early warning. Sanitation workers operate without coordination. Data never reaches the people who need it.

---

## Our Solution

**N.E.X.U.S.** is an AI-powered, real-time sanitation intelligence platform that monitors, predicts, and coordinates the full sanitation service chain — from household toilet to fecal sludge treatment — under climate stress. It connects district officers, field workers, NGOs, and communities into one unified system with:

- **Real-time sensor monitoring** of sanitation units with AI overflow prediction
- **Automated flood assessments** triggered by rainfall thresholds, with per-asset inspection workflows
- **Fecal sludge chain tracking** from toilet pickup → transport → treatment facility → completion
- **AI hygiene educator** powered by Gemini, tailored to Northern Ghana communities
- **Weather heatmaps** with district-by-district 24-hour precipitation visualization and AI-generated plain-language briefings
- **Community health scores** — algorithmic district-wide sanitation health index
- **WhatsApp integration** for field reports via SMS commands (`FLOOD`, `REPORT DUMP`, `TOILETS NEAR`)
- **Vulnerability scoring** — climate resilience rating for every registered asset
- **Hackathon demo simulator** — one button triggers a full 3-step orchestrated scenario

---

## Team

| Name | Role | GitHub |
|------|------|--------|
| **Faaliha** | Climate Strategist | [@ffaalihatu-png](https://github.com/ffaalihatu-png) |
| **Abdul Hafis** | Software Developer | [@pious2847](https://github.com/pious2847) |
| **Taqiudeen** | Software Developer | [@taqiudeen275](https://github.com/taqiudeen275) |

---

## Architecture

```
nexus-frontend/          Next.js 16 · TypeScript · Tailwind v4 · Framer Motion
nexus-backend/           Node.js · Express · PostgreSQL (Neon) · Gemini 2.5 Flash
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Framer Motion |
| State / Data | TanStack React Query v5, React Context |
| Backend | Node.js, Express.js, REST API |
| Database | PostgreSQL on Neon (serverless) |
| AI | Google Gemini 2.5 Flash |
| Auth | JWT (RS256), role-based access control |
| Media | Cloudinary (photo uploads for field inspections) |
| Messaging | Arkesel SMS, Meta WhatsApp Cloud API |
| Maps | Leaflet.js with GeoJSON layers |
| Scheduling | node-cron (automated weather checks, vulnerability scoring) |

---

## Features

### Dashboard Pages
| Page | Description |
|------|-------------|
| Overview | District health score, active alerts, sensor status, flood risk |
| Map Explorer | GeoJSON layers: toilets, facilities, flood zones, vulnerability |
| Sludge Chain | Full fecal sludge job lifecycle tracking |
| Flood Assessments | Automated + manual flood event management with asset inspection |
| Alerts | Real-time sensor + flood alerts with AI recommendations |
| Toilet Registry | Registered toilets with verification, QR codes, condition tracking |
| Gatherers | Fecal sludge collection operators — availability, completion rates |
| Dump Sites | Illegal dump site registry with AI severity analysis |
| Schools MHM | Menstrual Hygiene Management metrics per school |
| AI Educator | Gemini-powered hygiene chatbot tailored to Northern Ghana |
| Broadcasts | Emergency broadcast feed with severity filtering |
| Weather | 24-hour precipitation & temperature heatmaps across all districts |
| News | AI-curated WASH and flood news with sentiment analysis |
| Reports | District PDF/CSV export, trend charts |
| Community Watch | Community incident reporting and watch events |

### Admin
| Page | Description |
|------|-------------|
| Admin Panel | Demo simulator (sensor spike / flood event / full 3-step demo) |
| User Management | Activate / deactivate platform accounts |

### API Endpoints (v1/v2/v4)
```
/api/v1/auth            User authentication & management
/api/v1/units           Sanitation unit CRUD + sensor data
/api/v1/sensors         IoT sensor readings + AI prediction trigger
/api/v1/predictions     AI overflow & flood risk predictions
/api/v1/alerts          Alert management
/api/v1/toilets         Toilet registry + QR code generation
/api/v1/gatherers       Sludge gatherer roster
/api/v1/facilities      Treatment facilities
/api/v1/dumps           Illegal dump sites
/api/v1/sludge-jobs     Full fecal sludge chain jobs
/api/v1/flood-assessments  Flood event assessments + asset inspection
/api/v1/weather         Real-time weather (Open-Meteo) + heatmap data
/api/v1/health-scores   Community sanitation health scores
/api/v1/educator        AI hygiene Q&A
/api/v1/broadcasts      Emergency broadcast system
/api/v1/news            AI-curated news feed
/api/v1/map             GeoJSON map layers + vulnerability layer
/api/v1/unicef          UNICEF child health metrics + MHM compliance
/api/v1/export          PDF & CSV district reports
/api/v1/simulator       Hackathon demo trigger (sensor spike / flood / full demo)
/api/v1/whatsapp        Meta WhatsApp webhook (REPORT, FLOOD, HEALTH commands)
/api/v1/community-watch Community incident watch
/api/v1/blog            Public blog posts
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (or Neon account)
- Google Gemini API key (free at [aistudio.google.com](https://aistudio.google.com))

### Backend Setup

```bash
cd nexus-backend
npm install
cp .env.example .env   # fill in your credentials
npm run seed           # seed the database
npm run dev            # starts on http://localhost:5000
```

### Frontend Setup

```bash
cd nexus-frontend
npm install
npm run dev            # starts on http://localhost:3000
```

### Environment Variables

```env
# nexus-backend/.env

DATABASE_URL=          # PostgreSQL connection string
JWT_SECRET=            # Any secure random string
GEMINI_API_KEY=        # Google AI Studio API key

# Optional
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
ARKESEL_API_KEY=       # SMS alerts
WHATSAPP_TOKEN=        # Meta WhatsApp Cloud API
FRONTEND_URL=http://localhost:3000
```

### Demo Credentials (seeded)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@nexus.gh | Admin@123 |
| District Officer | officer@tamale.gh | Officer@123 |
| Field Worker | worker@nexus.gh | Worker@123 |

---

## Hackathon Demo

The **Admin Panel** includes a one-click **Full Demo** button that runs a 3-step orchestrated scenario:

1. **Sensor Spike** — Simulates a critical overflow alert on a random sanitation unit
2. **Flood Event** — Triggers an automated flood assessment for the selected district, flagging all at-risk assets
3. **AI Broadcast** — Gemini generates and sends an emergency broadcast to all affected districts

Each step streams into a live event log in real time.

---

## UNICEF Alignment

| UNICEF Criterion | N.E.X.U.S. Feature |
|-----------------|-------------------|
| Climate resilience | Vulnerability scoring, flood-triggered assessments, weather heatmaps |
| Full service chain | Sludge job lifecycle (toilet → gatherer → facility → treatment) |
| Data for decisions | Community health scores, district PDF reports, GeoJSON map layers |
| Community inclusion | WhatsApp commands, AI hygiene educator, community watch |
| Child focus | Schools MHM compliance, school unit alerts, evacuation flags |
| Scalability | Multi-district, role-based, API-first architecture |

---

## License

Built for  Hackathon 2026. All rights reserved by the N.E.X.U.S. team.
