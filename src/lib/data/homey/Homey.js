import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Variable from "./models/Variable.js";
import Device from "./models/Device.js";
import Zone from "./models/Zone.js";
import Items from "./models/Items.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import environment variables for SvelteKit compatibility
let env;
try {
  const envModule = await import('$env/dynamic/private');
  env = envModule.env;
} catch {
  // Fallback to process.env if not in SvelteKit context
  env = process.env;
}

class Homey {
  constructor(token, homeyId, options = {}) {
    this.token = token;
    this.homeyId = homeyId;
    this.baseUrl = `https://${homeyId}.connect.athom.com`;
    this.useCache = options.cache || false;
    this.readFromCache = options.readFromCache || false;
    // Use project cache directory for SvelteKit compatibility
    this.cacheDir = options.cacheDir || path.join(process.cwd(), 'cache', 'homey');
  }

  saveToCache(filename, data) {
    if (!this.useCache) return;

    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
        // Debug: Created cache directory
      }

      const filepath = path.join(this.cacheDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
      // Debug: Data saved to cache
    } catch (error) {
      console.error(`Error saving to cache: ${error instanceof Error ? error.message : error}`);
      console.error(`Cache directory: ${this.cacheDir}`);
      console.error(`Current working directory: ${process.cwd()}`);
    }
  }

  loadFromCache(filename) {
    if (!this.readFromCache) return null;

    const filepath = path.join(this.cacheDir, filename);
    if (!fs.existsSync(filepath)) {
      // Debug: Cache file not found
      return null;
    }

    try {
      const data = fs.readFileSync(filepath, "utf8");
      // Debug: Data loaded from cache
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading cache file ${filepath}:`, error instanceof Error ? error.message : error);
      return null;
    }
  }

  async _apiCall(endpoint, options = {}) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const config = {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      };
      // Debug logging removed for MCP compatibility

      const response = await fetch(url, config);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${response.statusText}${
            errorText ? ` - ${errorText}` : ""
          }`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // Log to stderr instead of stdout to avoid MCP interference
      console.error(`API call failed for ${endpoint}:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  async getDevices() {
    // Get zones first for zone information
    const zones = await this.getZones();
    const zoneList = zones.items;

    const cachedData = this.loadFromCache("devices.json");
    if (cachedData) {
      const devices = Object.values(cachedData).map(
        (deviceData) => new Device(deviceData, zoneList)
      );
      return new Items(devices, zoneList);
    }

    const data = await this._apiCall("/api/manager/devices/device");
    this.saveToCache("devices.json", data);
    const devices = Object.values(data).map(
      (deviceData) => new Device(deviceData, zoneList)
    );
    return new Items(devices, zoneList);
  }

  async getLogicVariables() {
    // Get zones first for zone information
    const zones = await this.getZones();
    const zoneList = zones.items;

    const cachedData = this.loadFromCache("logic.json");
    if (cachedData) {
      const variables = Object.values(cachedData).map(
        (variableData) => new Variable(variableData, zoneList)
      );
      return new Items(variables, zoneList);
    }

    const data = await this._apiCall("/api/manager/logic/variable/");
    this.saveToCache("logic.json", data);
    const variables = Object.values(data).map(
      (variableData) => new Variable(variableData, zoneList)
    );
    return new Items(variables, zoneList);
  }

  async getZones() {
    const cachedData = this.loadFromCache("zones.json");
    if (cachedData) {
      const zones = Object.values(cachedData).map(
        (zoneData) => new Zone(zoneData)
      );
      return new Items(zones);
    }

    const data = await this._apiCall("/api/manager/zones/zone");
    this.saveToCache("zones.json", data);
    const zones = Object.values(data).map((zoneData) => new Zone(zoneData));
    return new Items(zones);
  }

  async getInsights() {
    const cachedData = this.loadFromCache("insights.json");
    if (cachedData) {
      return cachedData;
    }

    const data = await this._apiCall("/api/manager/insights/log/");
    this.saveToCache("insights.json", data);
    return data;
  }

  async getInsightLogs(logId, options = {}) {
    const { resolution = '1hour', start, end } = options;
    
    // Build query parameters
    const params = new URLSearchParams();
    if (resolution) params.append('resolution', resolution);
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    
    const queryString = params.toString();
    const endpoint = `/api/manager/insights/log/${logId}${queryString ? `?${queryString}` : ''}`;
    
    // Use a cache key that includes the parameters
    const cacheKey = `insights_${logId}_${resolution}_${start || 'nostart'}_${end || 'noend'}.json`;
    
    const cachedData = this.loadFromCache(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const data = await this._apiCall(endpoint);
    this.saveToCache(cacheKey, data);
    return data;
  }
}

// Factory function that uses environment variables for SvelteKit compatibility
export function createHomeyClient(options = {}) {
  const token = env.HOMEY_TOKEN;
  const homeyId = env.HOMEY_ID;

  if (!token || !homeyId) {
    throw new Error('HOMEY_TOKEN and HOMEY_ID must be set in environment variables');
  }

  return new Homey(token, homeyId, {
    cache: true,
    readFromCache: true,
    cacheDir: path.join(process.cwd(), 'cache', 'homey'),
    ...options
  });
}

export default Homey;