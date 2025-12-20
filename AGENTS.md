# AGENTS.md - Opencode Mobile

## Commands
- **Check syntax**: Run `npm run web -- --clear` or `expo start --web --clear` to validate without starting server
- **No lint/test commands** - add ESLint/Prettier if needed
- **No test runner** - add Jest if testsare added

## Development Workflow
- **Syntax Validation**: Always check for syntax errors after edits using web build command
- **Server Hosting**: Do not start dev server - user hosts separately in different terminal
- **File Changes**: Validate changes don't break app before committing

## Code Style Guidelines

### Imports
- Use ES6 imports: `import { Component } from 'react'`
- Relative paths: `import Component from './Component'`
- Group: React/React Native first, then local components/hooks/utils

### Formatting
- 2 spaces indentation
- Semicolons required
- Single quotes for strings
- Trailing commas in objects/arrays

### Naming
- **Variables/functions**: camelCase (`handleClick`, `isConnected`)
- **Components**: PascalCase (`MessageList`, `StatusBar`)
- **Files**: PascalCase for components, camelCase for utils/hooks
- **Constants**: UPPER_SNAKE_CASE if needed

### Types
- Use JSDoc comments: `/** @param {string} url */`
- Reference types from `opencode-types.js`
- Avoid TypeScript - stick to JS with JSDoc

### Error Handling
- `try/catch` for async operations
- `console.error()` for errors, `console.log()` for debug
- Graceful fallbacks, don't crash on errors

### React Patterns
- Functional components with hooks
- `useState` for state, `useEffect` for side effects
- Custom hooks in `/hooks` directory
- Components in `/components`, screens in `/screens`

### Best Practices
- No comments unless complex logic
- Keep functions small and focused
- Use meaningful variable names
- Follow existing patterns in codebase
