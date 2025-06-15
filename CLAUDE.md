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
npm run cloc         # Count lines of code in src directory
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

## Environment Variables

Create a `.env` file in the project root with:

```env
# Koordinater for værstasjon
LAT=63.4305
LON=10.3951

# Frost API klient-ID (valgfri - kun for historiske data)
FROST_CLIENT_ID=your-frost-client-id

# User agent for API-kall
USER_AGENT=Timeviz/1.0 (kontakt@example.com)
```

Use `.env.example` as a template. Environment variables are automatically excluded from git.

## Weather Data Integration

- **YrDataProvider**: Fetches weather data from MET Norway APIs
- **Locationforecast API**: Free weather forecasts (no registration required)
- **Frost API**: Historical weather data (requires client ID from frost.met.no)
- Server-side data loading ensures API keys stay secure
- Weather data is converted to TimeTick format for timeline visualization

## Weather Icons

The application uses SVG weather icons from the `@yr/weather-symbols` npm package:

- Icons are provided by the official Yr weather symbols package
- SVG files are accessed from `/node_modules/@yr/weather-symbols/dist/svg/`
- Weather symbols use numeric codes (e.g., "01d", "02n", "04") mapped from API `symbol_code` values
- Icons support day (d), night (n), and polar twilight (m) variants

## Development Notes

- When modifying SVGViz, ensure all derived values remain reactive
- Timeline scale clamps values outside the time range
- Hour ticks include both timestamp and formatted time string
- The "now" tick has special styling (red, thicker line)
- Weather data points are color-coded: blue for historical, orange for forecast
- Weather icons appear as 16x16px SVG images in timeline visualization
