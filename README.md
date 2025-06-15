# Timeviz

A timeline visualization showing weather data from past days to future days, including temperature, UV index, precipitation, and energy prices.

## Setup

1. Copy `.env.example` to `.env` and configure your settings:
   ```bash
   cp .env.example .env
   ```

2. Add your API keys and location to `.env`:
   ```
   LAT=63.4305              # Your latitude
   LON=10.3951              # Your longitude
   FROST_CLIENT_ID=xxx      # Optional: For historical weather data from frost.met.no
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Run development server:
   ```bash
   npm run dev
   ```

## Features

- **Weather Timeline**: Visual timeline showing past and future weather
- **UV Index**: Color-coded UV index display (when UV ≥ 3)
- **Temperature Graph**: Continuous temperature curve with min/max markers
- **Precipitation**: Hourly precipitation bars
- **Energy Prices**: Electricity price visualization
- **Day/Night Markers**: Visual day/night cycle indicators

## API Testing

A helper script `frost-api.sh` is included for testing the Frost API:

### Usage

1. First, load your environment variables:
   ```bash
   source .env
   ```

2. Use the script to query Frost API:
   ```bash
   # Get station details
   ./frost-api.sh "/sources/v0.jsonld?ids=SN68860"

   # List available weather elements
   ./frost-api.sh "/elements/v0.jsonld"

   # Get temperature observations
   ./frost-api.sh "/observations/v0.jsonld?sources=SN68860&referencetime=2024-06-13T00:00:00Z/2024-06-13T12:00:00Z&elements=air_temperature"

   # Search stations by county (URL-encoded)
   ./frost-api.sh "/sources/v0.jsonld?county=TR%C3%98NDELAG"
   ```

### Common URL Encodings
- **Ø**: `%C3%98`
- **Æ**: `%C3%86`  
- **Å**: `%C3%85`
- **Space**: `%20`

## Data Sources

- **Forecast Data**: MET Norway Locationforecast API (no registration required)
- **Historical Data**: MET Norway Frost API (requires free registration at frost.met.no)
- **Energy Prices**: ENTSO-E Transparency Platform
- **Solar Data**: Calculated based on location coordinates
