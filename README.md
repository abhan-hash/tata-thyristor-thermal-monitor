# THERMOSENSE

Thermal monitor for the six thyristors in the Tata Steel hot strip mill DC drive. It estimates junction temperature (Tj) from heatsink RTDs and armature current with a 3-stage Foster RC model.

- `web/` is the app (Vite, React, TypeScript). It is what gets deployed.
- `thermosense_dashboard/` is the earlier Streamlit version, kept for reference.

## Run locally

Needs Node 20.19 or newer.

    cd web
    npm ci
    npm run dev      # http://localhost:5173
    npm run build    # output in web/dist
    npm test

Pages: `/` Overview, `/drive`, `/alarms`, `/trends`, `/settings`, `/about`, `/kit`.

Data is mocked in the browser (10 Hz simulator, shown with a MOCK badge). There is no backend yet.

## Deploy on Render

`render.yaml` defines a static site. In Render choose New, then Blueprint, and select this repo. It builds in `web/` with `npm ci && npm run build`, publishes `web/dist`, and rewrites all paths to `index.html`.
