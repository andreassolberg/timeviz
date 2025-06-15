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

## Configuration

### Fixed Timestamp Mode

You can lock the timeline to a specific point in time for historical analysis or debugging by adding `fixedNow` to config.json:

```json
{
  "data": {
    "timeline": {
      "hoursPast": 48,
      "hoursFuture": 48,
      "fixedNow": "2024-01-15T14:00:00+01:00"
    }
  }
}
```

When `fixedNow` is set:
- The timeline will be centered on this timestamp instead of current time
- The "now" line will be displayed in orange instead of black
- A yellow indicator box will show the fixed timestamp
- All data fetching will be relative to this fixed point

## Environment Variables

Create a `.env` file in the project root with:

```env
# Koordinater for værstasjon
LAT=63.4305
LON=10.3951

# Frost API klient-ID (valgfri - kun for historiske data)
FROST_CLIENT_ID=your-frost-client-id
FROST_CLIENT_SECRET=your-frost-client-secret

# User agent for API-kall
USER_AGENT=Timeviz/1.0 (kontakt@example.com)

# Norwegian energy area (NO1-NO5)
ENERGY_AREA=NO3

# Homey integration (optional)
HOMEY_TOKEN=your-homey-bearer-token
HOMEY_ID=your-homey-id
```

Use `.env.example` as a template. Environment variables are automatically excluded from git.

## Data Integration Architecture

### Weather Data (YrDataProvider)
- **Locationforecast API**: Free weather forecasts (no registration required)
- **Frost API**: Historical weather data (requires client ID from frost.met.no)
- Server-side data loading ensures API keys stay secure
- Weather data is converted to TimeTick format for timeline visualization

### Energy Data (EnergyPricesProvider)
- **Norwegian electricity prices** from hvakosterstrommen.no API
- Supports all price zones (NO1-NO5): Oslo, Kristiansand, Trondheim, Tromsø, Bergen
- Hourly price data with NOK/kWh and EUR/kWh values
- Handles multi-day date ranges with multiple API calls

### Homey Smart Home Integration
- **Device Management**: Fetches devices, zones, and logic variables
- **Historical Data**: Uses Insights API for temperature, power, and other sensor data
- **Endpoint Format**: `/api/manager/insights/log/{device_uri}/{full_log_id}/entry`
- **Caching System**: File-based caching for improved performance
- **Resolutions**: Supports lastHour, last6Hours, last24Hours, last7Days, last14Days, last31Days

### Solar Data
- **SolarCalculations**: Computes sunrise/sunset times based on coordinates
- Uses astronomical algorithms for accurate day/night visualization

## Layout System (SectionStack)

The `SectionStack` class manages complex layout calculations:

- **Dependency Resolution**: Sections can reference other sections via 'from' property
- **Dynamic Heights**: Supports `heightRel` arrays for relative height calculations
- **Validation**: Circular dependency detection and comprehensive error handling
- **Fail-Fast**: Throws descriptive errors for invalid configurations

Example configuration:
```json
{
  "sections": {
    "header": { "height": 15, "from": null },
    "temperature": { "height": 150, "from": "header" },
    "main": { "heightRel": ["header", "temperature"], "from": null }
  }
}
```

## Weather Icons

The application uses SVG weather icons from the `@yr/weather-symbols` npm package:

- Icons are provided by the official Yr weather symbols package
- SVG files are accessed from `/node_modules/@yr/weather-symbols/dist/svg/`
- Weather symbols use numeric codes (e.g., "01d", "02n", "04") mapped from API `symbol_code` values
- Icons support day (d), night (n), and polar twilight (m) variants

## Testing and Debugging

- **Frost API Helper**: Use `frost-api.sh` script for testing weather API endpoints
- **Fixed Timestamp Mode**: Lock timeline to specific time for historical debugging
- **Caching System**: All data providers support file-based caching for development
- **Error Handling**: Comprehensive error types in layout system for debugging

## Development Notes

- When modifying SVGViz, ensure all derived values remain reactive
- Timeline scale clamps values outside the time range
- Hour ticks include both timestamp and formatted time string
- The "now" tick has special styling (red, thicker line)
- Weather data points are color-coded: blue for historical, orange for forecast
- Weather icons appear as 16x16px SVG images in timeline visualization
- All data providers use server-side loading to protect API keys
