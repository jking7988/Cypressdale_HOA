# Cypressdale HOA — Next.js + Sanity + Tailwind

## Prereqs
- Node.js 18 or 20 (LTS)
- VS Code recommended

## Setup
```bash
npm install

# Initialize or link a Sanity project (choose output path: ./sanity when prompted)
npm create sanity@latest -- --project "Create new" --dataset production --template clean --output-path sanity
```

Create `.env.local`:
```
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2025-01-01
```

## Run
```bash
npm run dev
# App: http://localhost:3000
# Studio: http://localhost:3000/studio
```
