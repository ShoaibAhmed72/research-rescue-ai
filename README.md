# Research Rescue AI 🚀

An advanced, intelligent research assistant designed to streamline scholarly literature discovery, source validation, and academic inquiry. Built for hackathon submission to empower researchers with automated discovery workflows, credibility verification, and robust data reliability.

---

## 🌟 Key Features

* **Autonomous Scholarly Search:** Seamlessly queries and aggregates data from academic and scholarly indexes based on natural language research questions[cite: 6].
* **Smart Source Validation & Filtering:** Evaluates academic sources with detailed metadata tracking, including author attribution, publication dates, DOIs, and credibility scoring (`high` or `medium`)[cite: 6].
* **Robust API Architecture:** Designed with an OpenAPI 3.1.0 specification, featuring endpoints for real-time health checks, provider status monitoring, and deep literature discovery queries[cite: 6].
* **Live Web Interface:** Fully deployed, responsive user interface accessible online for real-time testing and evaluation.

---

## 🛠️ Tech Stack

* **Backend / API:** Node.js, Express, TypeScript, OpenAPI 3.1.0[cite: 6]
* **Frontend / UI:** React, TypeScript, Tailwind CSS
* **Deployment & Hosting:** Replit Cloud, GitHub

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/healthz` | Returns server health status[cite: 6]. |
| `GET` | `/api/research/status` | Checks the current availability of AI and scholarly search providers[cite: 6]. |
| `POST` | `/api/research/search` | Searches scholarly indexes based on a specific research question and source limit (minimum 5, maximum 15)[cite: 6]. |

---

## 🚀 Getting Started Locally

If you want to run or test the project locally on your machine:

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/ShoaibAhmed72/research-rescue-ai.git](https://github.com/ShoaibAhmed72/research-rescue-ai.git)
   cd research-rescue-ai
