# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Timeviz is a SvelteKit-based timeline visualization application that displays time ranges from past days to future days. It uses Svelte 5 with TypeScript and D3-scale for time-based calculations.

## Common Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run check        # Type-check the codebase
npm run check:watch  # Type-check in watch mode
npm run lint         # Run prettier and eslint checks
npm run format       # Auto-format code with prettier
```

## Architecture

### Core Components

1. **Timeline Class** (`src/lib/Timeline.ts`)

   - Central data model for time visualization
   - Creates time ranges from `hoursPast` to `hoursFuture` relative to current time
   - Provides D3 time scale for date-to-pixel mapping with clamping
   - Generates hour ticks with special "now" marker
   - Configurable day width (default 200 units)

2. **SVGViz Component** (`src/lib/components/SVGViz.svelte`)
   - Reusable SVG container with responsive capabilities
   - Supports viewport-filling modes: `full="width"` or `full="height"`
   - Handles viewBox calculations with optional margins
   - Uses Svelte 5 snippets for content composition
   - Includes runtime validation and reactive state management

### Key Architectural Decisions

- **Separation of Concerns**: Timeline handles time logic, SVGViz handles rendering
- **Svelte 5 Runes**: Uses `$props()`, `$derived()` for reactive state
- **Type Safety**: Full TypeScript coverage with runtime validation
- **Responsive Design**: SVG-based with viewBox for scalability
- **Component Composition**: Uses snippet pattern for flexible content injection

### Project Structure

- Routes in `src/routes/` with file-based routing
- Shared components in `src/lib/components/`
- Core logic classes in `src/lib/`
- Global styles reset in `src/app.html`

## Development Notes

- When modifying SVGViz, ensure all derived values remain reactive
- Timeline scale clamps values outside the time range
- Hour ticks include both timestamp and formatted time string
- The "now" tick has special styling (red, thicker line)
