# PAN-OS Packet Flow Sequence — Interactive Educational Deck

An interactive, animated educational presentation deck built with **React**, **TypeScript**, and **Vite** that visualizes the **Palo Alto Networks PAN-OS Packet Flow Sequence** from ingress to egress.

---

## Overview

This project transforms the PAN-OS packet processing architecture into a 12-slide interactive deck with real-time SVG animations, branching decision paths, loop-back flows, drop exits, and hands-on educational widgets.

### Key Features

- **12 Structured Educational Slides** (`src/data/slidesData.ts`): Maps step-by-step through the PAN-OS packet flow lifecycle—from Ingress Interface & Packet Parsing, Session Lookup, Slow Path (Session Setup, Security Policy, ALG, NAT), Fast Path, App-ID & Content-ID Inspection, Decryption & Re-evaluation loop-backs, to Forwarding & Egress.
- **Animated SVG Packet Flow Diagram** (`src/components/PacketFlowDiagram.tsx`): Custom interactive SVG pipeline featuring animated packet traversal, stage highlighting, clickable nodes, loop-back arcs (e.g., Decryption/Tunnel re-injection), and drop exit indicators.
- **Pure Flow Simulator State Machine** (`src/engine/flowSimulator.ts`): Models 6 distinct packet-flow scenarios (`src/data/packetFlowModel.ts`) with step-by-step playback, play/pause, speed control, and reset capabilities.
- **Educational Widgets & Overlays** (`src/components/EducationalWidgets.tsx`, `src/components/DeckOverlays.tsx`): Interactive stage inspector, scenario selector, keyboard shortcut guide, and slide overview modal.
- **Accessibility & Responsive Design**: Full keyboard navigation (arrow keys, spacebar, modal focus trapping), `prefers-reduced-motion` support, and responsive layouts across desktop and smaller viewports.

---

## Project Structure

```text
├── e2e/
│   └── deck.spec.ts                 # Playwright end-to-end tests
├── src/
│   ├── __tests__/
│   │   └── flowSimulator.test.ts    # Vitest unit tests for the simulator engine
│   ├── components/
│   │   ├── DeckOverlays.tsx         # Help/overview modals with focus trapping
│   │   ├── EducationalWidgets.tsx   # Interactive stage & scenario controls
│   │   └── PacketFlowDiagram.tsx    # Animated SVG packet flow diagram
│   ├── data/
│   │   ├── packetFlowModel.ts       # Typed stages, arcs, drops, and 6 scenarios
│   │   └── slidesData.ts            # 12 educational slides mapped to PAN-OS stages
│   ├── engine/
│   │   └── flowSimulator.ts         # Pure state machine for packet flow playback
│   ├── styles/                      # Component & layout stylesheets
│   ├── App.tsx                      # Main deck layout & keyboard navigation
│   └── main.tsx                     # Application entry point
├── index.html
├── package.json
├── playwright.config.ts
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (tested with Node.js 24 LTS)
- **npm**

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
npm run preview
```

---

## Testing & Verification

### Unit Tests (Vitest)

```bash
npm test
```

### Type Checking

```bash
npx tsc --noEmit
```

### End-to-End Tests (Playwright)

```bash
npm run test:e2e
```
