# AGENTS.md - Opencode Mobile

## Commands
- **Syntax check**: `npm run web -- --clear --port 8082` (validates without starting server)
- **Quick test**: `timeout 10 npm run web -- --clear --port 8082` (runs for 10 seconds to check for errors, then auto-stops)
- **iOS build**: `expo run:ios` (uses stack navigation, no reanimated required)
- **No lint/test commands** - add ESLint/Prettier if needed
- **Testing note**: Use `timeout` with web command to prevent continuous server running during quick validation
- **No test runner** - add Jest if tests are added

## Code Style Guidelines
- **Architecture**: Domain-driven with `features/` (hooks/services/utils/types), `services/` for APIs, `shared/` for cross-cutting
- **Imports**: Relative paths only; group React/React Native first, then relative imports
- **Formatting**: 2 spaces, semicolons, single quotes, trailing commas; <100 chars/line
- **Naming**: PascalCase components/files, camelCase hooks/utils, UPPER_SNAKE_CASE constants
- **Types**: JSDoc comments; import from `shared/types/opencode.types.js`; no TypeScript
- **Error Handling**: Try/catch with fallbacks; console.error/log; never crash
- **React**: Functional components with hooks; custom hooks in feature dirs; useState/useEffect
- **Best Practices**: Single responsibility; meaningful names; no comments unless complex; consistent patterns
