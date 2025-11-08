# PathFundAI Frontend

A production-ready React (Vite + TypeScript) UI for PathFundAI with a SharkByte/MDC-inspired color system.

## Tech Stack

- **React 19** with **TypeScript**
- **Vite** for build tooling
- **TailwindCSS v4** for styling
- **shadcn/ui** (Radix UI primitives) for components
- **React Router v6** for routing
- **Zod** + **react-hook-form** for form validation
- **ESLint** + **Prettier** for code quality

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/            # shadcn/ui primitives
│   ├── Navbar.tsx
│   ├── ConnectWalletButton.tsx
│   ├── Timeline.tsx
│   ├── ScholarshipCard.tsx
│   └── ProposalModal.tsx
├── pages/              # Route pages
│   ├── CareerPathway.tsx
│   └── Scholarships.tsx
├── lib/                # Utility functions
│   ├── utils.ts
│   ├── ai.ts          # Proposal generation
│   └── wallet.ts      # Wallet connection (placeholder)
├── data/               # Mock data
│   ├── pathway.sample.ts
│   └── scholarships.sample.ts
├── types.ts            # TypeScript type definitions
└── App.tsx             # Main app with routing
```

## Features

### Career Pathway Page (`/`)
- Hero section with product branding
- Vertical timeline of career milestones
- Status tracking (Planned, In Progress, Done)
- NFT minting placeholder (disabled in MVP)

### Scholarships Page (`/scholarships`)
- Filter scholarships by program, award range, and search
- Grid layout of scholarship cards
- AI-powered proposal generator
- Markdown preview and download

## Theme

The app uses the SharkByte/MDC Sharks color palette:

- **Primary**: `#24468E` (MDC Sharks blue)
- **Gray-700**: `#596B6E`
- **Black**: `#2D2926`
- **White**: `#FFFFFF`

Colors are defined in `src/index.css` using Tailwind v4's `@theme` directive.

## Deployment

The app is configured for deployment to **Cloudflare Pages**. Build output is in the `dist/` directory after running `npm run build`.

## License

Private project for PathFundAI.
