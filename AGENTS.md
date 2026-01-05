# Repository Guidelines

## Project Structure & Module Organization
The application follows the Next.js 16 App Router layout. Core UI lives under `app/`, with `app/layout.tsx` configuring global wrappers and `app/page.tsx` providing the primary entry page. Shared UI primitives belong in `components/`; create feature-specific subfolders when splitting complex views. Utility helpers sit in `lib/` (e.g., `lib/utils.ts` for Tailwind helpers). Static assets, including icons and images, go in `public/`. Keep experimental or throwaway work out of source—use draft branches instead of cluttering the main tree.

## Build, Test, and Development Commands
- `bun dev` or `npm run dev`: start the local Next.js dev server at `http://localhost:3000/` with hot reload.  
- `bun run build` or `npm run build`: create the production bundle and surface type errors.  
- `bun start` or `npm start`: run the production build locally for smoke testing.  
- `bun lint` or `npm run lint`: execute ESLint using `eslint.config.mjs`.
- After all edits, run the checker (`bun run lint` or `npm run lint`) before handing off.

## Coding Style & Naming Conventions
We use TypeScript with strict typing. Favor React 19 hooks (`use`, `useState`, `useEffect`) and Next.js server components where appropriate. Stick to function components; co-locate component styles via Tailwind utility classes. Use PascalCase for components (`ButtonGroup.tsx`), camelCase for hooks/utilities (`useTheme.ts`). Prefer 2-space indentation (default from Next.js). Run `npm run lint` before pushing; it enforces formatting and accessibility checks.

## Testing Guidelines
Testing is not yet wired up. When adding tests, choose Vitest or Jest, store them alongside the module (`Button.test.tsx`) or in `__tests__/` folders, and ensure they run through a single `test` script. Focus on rendering behavior and accessibility. Aim for meaningful assertions rather than snapshot reliance. Update this guide once the testing harness is finalized.

## Commit & Pull Request Guidelines
The existing history uses descriptive sentences (“Initial commit from Create Next App”). Continue with clear, imperative summaries under 60 characters; optionally follow Conventional Commits for clarity (`feat: add hero banner`). Each pull request should include: concise description of the change, screenshots or recordings for UI updates, relevant issue links, and notes on testing performed. Request review early if you need feedback on architecture decisions; draft PRs are encouraged.

## Security & Configuration Tips
Environment variables should be managed via `.env.local` and never committed. Use `NEXT_PUBLIC_*` prefixes only when variables must reach the client. Review dependencies when adding new packages—prefer lightweight modules that support tree-shaking. Rotate credentials immediately if exposed.
