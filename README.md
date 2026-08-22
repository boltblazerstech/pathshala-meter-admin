# Pathshala Meter — Admin Panel

## Stack
- React 18 + TypeScript + Vite
- Tailwind CSS
- React Router v6
- Axios (with JWT interceptor)
- TanStack React Query v5

## Environment

Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` to your backend URL.

```
VITE_API_BASE_URL=http://localhost:3000/api
```

## Quick start

```bash
npm install
npm run dev
```

## Project structure

```
src/
  api/              — Typed API functions, one file per resource
  features/
    auth/
    paathshaalas/
    supervisors/
    teachers/
    trackingWindows/
    liveView/
    export/
  components/       — Shared UI: AppShell, Table, Modal, FormField, StatusPill
  lib/              — Axios instance with JWT interceptor + error toast
  types/            — Shared TypeScript types / interfaces
```
