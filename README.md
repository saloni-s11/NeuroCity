# NeuroCity – AI-Powered Urban Intelligence Platform

<p align="center">
  <b>NeuroCity</b><br/>
  A next-generation Smart City Operating System powered by Digital Twin technology, AI-driven analytics, forecasting, simulations, and urban intelligence.
</p>

---

## Overview

NeuroCity is an AI-powered Urban Intelligence Platform designed to help city administrators monitor, analyze, and optimize city operations through a unified digital ecosystem.  

It combines **Digital Twin technology, Traffic Intelligence, Environmental Monitoring, Infrastructure Analytics, Sustainability Assessment, Simulation Modeling**, and **AI-driven decision support** into a single intelligent interface.

The platform acts as a centralized command center where administrators can visualize real-time city conditions, detect risks, forecast future scenarios, and make data-driven decisions to improve urban efficiency, sustainability, and resilience.

---

## Key Features

### 📊 Dashboard
- City Health Score
- Sustainability Score
- Real-time KPIs
- AI-generated insights
- Executive city overview

### 🌐 Digital Twin
- Interactive 3D city representation
- Multi-layer visualization (Traffic, Environment, Infrastructure, Utilities)
- Sector-level monitoring and analysis

### 🚦 Traffic Intelligence
- Congestion analysis
- Traffic hotspot detection
- Route recommendations
- Traffic forecasting
- Mobility trend monitoring

### 🌿 Environment Intelligence
- Air Quality Index (AQI) monitoring
- Pollution hotspot detection
- Temperature & humidity tracking
- Environmental risk analysis
- Air quality forecasting

### 🏗️ Infrastructure Intelligence
- Infrastructure health monitoring
- Asset management
- Maintenance recommendations
- Utility monitoring
- Failure prediction

### 🌱 Sustainability Module
- City health assessment
- Sustainability metrics
- Environmental performance tracking
- Long-term urban planning support

### 🧪 Simulation Engine
- Population growth simulation
- EV adoption modeling
- Renewable energy scenarios
- Climate event simulations
- Impact analysis

### 🤖 AI Intelligence & Narration
- Risk detection
- Forecasting
- Smart recommendations
- Human-readable AI insights
- Decision support system

### ⏳ Timeline Explorer
- Future city visualization
- Urban growth forecasts
- Infrastructure evolution tracking
- Sustainability roadmaps

---

## Technology Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- TanStack Router
- TanStack Query
- Recharts
- Lucide React
- React Three Fiber
- Three.js
- Drei
- Radix UI

### Backend
- Python
- FastAPI
- REST APIs

### Data Management
- JSON-based datasets
- Simulation models

### Development Tools
- Git
- GitHub
- Visual Studio Code
- npm

---

## Project Structure
NeuroCity
│
├── frontend/
│ ├── src/
│ │ ├── routes/
│ │ ├── components/
│ │ ├── hooks/
│ │ ├── services/
│ │ ├── data/
│ │ └── assets/
│ │
│ ├── package.json
│ └── vite.config.ts
│
├── backend/
│ ├── main.py
│ ├── requirements.txt
│ └── data/
│ ├── city_state.json
│ ├── traffic_data.json
│ ├── pollution_data.json
│ ├── infrastructure_data.json
│ └── ...
│
└── README.md

---

---

## Frontend Architecture

The frontend is built using a modern React + TypeScript stack focused on performance and scalability.

### Key Responsibilities
- Handles user interface and visualization of city data
- Renders Digital Twin using Three.js / React Three Fiber
- Manages state and server data using TanStack Query
- Provides routing and navigation using TanStack Router
- Displays charts, analytics, and dashboards

### Tech Stack
- React
- TypeScript
- Vite
- Tailwind CSS
- TanStack Router
- TanStack Query
- Recharts
- React Three Fiber
- Three.js
- Radix UI
- Lucide React

---

## Backend Architecture

The backend is built using FastAPI to provide high-performance APIs for city data processing and simulation.

### Key Responsibilities
- Serves city-wide datasets via REST APIs
- Handles simulation logic for urban forecasting
- Processes traffic, environment, and infrastructure data
- Provides AI-driven insights and analytics endpoints

### Tech Stack
- Python
- FastAPI
- Uvicorn (ASGI server)
- JSON-based datasets for simulation and analytics

### Data Handling
- `city_state.json` → Overall city status
- `traffic_data.json` → Traffic flow and congestion data
- `pollution_data.json` → Environmental metrics
- `infrastructure_data.json` → Asset and infrastructure health data

---

## Modules

| Module | Description |
|--------|-------------|
| Dashboard | Provides an executive-level overview of city performance with KPIs, health scores, and AI-generated insights |
| Digital Twin | Interactive 3D representation of the city with multi-layer visualization for traffic, environment, infrastructure, and utilities |
| Traffic Intelligence | Analyzes congestion patterns, detects hotspots, provides route recommendations, and forecasts traffic trends |
| Environment Intelligence | Monitors AQI, pollution hotspots, temperature, humidity, and environmental risks with forecasting capabilities |
| Infrastructure Intelligence | Tracks asset health, manages infrastructure data, predicts failures, and suggests maintenance actions |
| Sustainability Module | Evaluates city sustainability metrics, environmental performance, and supports long-term urban planning |
| Simulation Engine | Runs scenario-based simulations such as population growth, EV adoption, renewable energy shifts, and climate events |
| AI Intelligence & Narration | Provides risk detection, forecasting, recommendations, and human-readable AI-driven insights |
| Timeline Explorer | Visualizes future city growth, infrastructure evolution, and sustainability roadmaps |
