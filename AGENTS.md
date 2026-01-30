# Repository Guidelines

## Project Structure & Module Organization
- `src/app/` contains Next.js App Router routes, layouts, and pages.
- `src/components/` holds reusable UI and domain components (e.g., boutique, reservation).
- `src/lib/` contains client utilities (Supabase, Stripe helpers, calendar utils).
- `src/styles/` and `src/app/globals.css` define global styles; Tailwind CSS is configured in `tailwind.config.js`.
- `public/` holds static assets.
- Root `*.md` files and `setup-guide/` document Stripe/Supabase setup and operational notes.
- Root `*.sql` files are Supabase schema/data scripts; apply intentionally and track which environment they target.

## Build, Test, and Development Commands
- `npm run dev`: start local dev server (Next.js, hot reload).
- `npm run build`: create a production build.
- `npm run start`: serve the production build.
- `npm run lint`: run ESLint using the Next.js core rules.

## Coding Style & Naming Conventions
- TypeScript + React (Next.js 15). Keep 2‑space indentation, semicolons, and follow existing import ordering.
- Prefer double quotes in TS/TSX unless the surrounding file uses single quotes.
- Component files use `PascalCase` and match their default export (e.g., `CustomerForm.tsx`).
- Hooks should be named `useX` and live near their consumers or in `src/lib`.
- Use the `@/` path alias for `src` imports (see `tsconfig.json`).
- Lint with `npm run lint` before opening a PR.

## Testing Guidelines
- No automated test runner is configured yet.
- Validate changes with manual smoke tests: run `npm run dev`, navigate critical flows (booking, boutique checkout, admin screens).
- If you add a test framework, document commands and placement (e.g., `*.test.tsx`) here.

## Commit & Pull Request Guidelines
- Recent commits use short, descriptive Spanish summaries without prefixes (e.g., “Actualizados componentes…”). Keep the subject concise.
- PRs should include: purpose/summary, testing notes, and screenshots for UI changes.
- For database or Stripe changes, link the relevant `*.sql` or setup doc and state the target environment.

## Security & Configuration Tips
- Copy `env.example` to `.env.local` and keep secrets out of source control.
- Stripe/Supabase setup docs are in `STRIPE_*.md`, `SUPABASE_SETUP.md`, and `DEPLOY.md`; follow them for keys, webhooks, and policies.
- Supabase access: the only project to use in the Supabase console is `tvdwepumtrrjpkvnitpw`.
