import fs from 'fs';
import path from 'path';
import { env } from '$env/dynamic/private';

// Import types for better TypeScript support
interface HomeyOptions {
	cache?: boolean;
	readFromCache?: boolean;
	cacheDir?: string;
}

interface DeviceData {
	id: string;
	name: string;
	driverId: string;
	class: string;
	zone: string;
	capabilities: string[];
	available: boolean;
	capabilitiesObj?: Record<string, { id: string; value: any }>;
}

interface VariableData {
	id: string;
	name: string;
	type: string;
	value: any;
}

interface ZoneData {
	id: string;
	name: string;
}

// Simple TypeScript implementations of the models
class Value {
	constructor(public id: string, public value: any) {}
}

class Entity {
	public id: string;
	public name: string;
	protected _rawData: any;
	protected zones: ZoneData[];
	protected zoneMap: Map<string, ZoneData>;

	constructor(data: any, zones: ZoneData[] = []) {
		this.id = data.id;
		this.name = data.name;
		this._rawData = data;
		this.zones = zones;
		this.zoneMap = new Map();

		if (zones && zones.length > 0) {
			zones.forEach((zone) => {
				this.zoneMap.set(zone.id, zone);
			});
		}
	}

	toString() {
		return `${this.constructor.name}(id: ${this.id}, name: ${this.name})`;
	}
}

class Device extends Entity {
	public driverId: string;
	public class: string;
	public zone: string;
	public capabilities: string[];
	public available: boolean;

	constructor(data: DeviceData, zones: ZoneData[] = []) {
		super(data, zones);
		this.driverId = data.driverId;
		this.class = data.class;
		this.zone = data.zone;
		this.capabilities = data.capabilities || [];
		this.available = data.available;
	}

	get zoneName() {
		if (this.zone && this.zoneMap.has(this.zone)) {
			const zone = this.zoneMap.get(this.zone);
			return zone?.name || null;
		}
		return null;
	}

	isAvailable() {
		return this.available;
	}

	hasCapability(capability: string) {
		return this._rawData.capabilities && this._rawData.capabilities.includes(capability);
	}

	getCapabilityValue(capability: string) {
		if (this._rawData.capabilitiesObj && this._rawData.capabilitiesObj[capability]) {
			return this._rawData.capabilitiesObj[capability].value;
		}
		return null;
	}

	getValue(type: string) {
		if (this._rawData.capabilitiesObj && this._rawData.capabilitiesObj[type]) {
			const capability = this._rawData.capabilitiesObj[type];
			return new Value(capability.id, capability.value);
		}
		return null;
	}
}

class Variable extends Entity {
	public type: string;
	public value: any;

	constructor(data: VariableData, zones: ZoneData[] = []) {
		super(data, zones);
		this.type = data.type;
		this.value = data.value;
	}

	toString() {
		return `Variable(id: ${this.id}, name: ${this.name}, type: ${this.type}, value: ${this.value})`;
	}
}

class Zone extends Entity {
	constructor(data: ZoneData) {
		super(data);
	}
}

class Items<T extends Entity> {
	public items: T[];
	private zones: ZoneData[];

	constructor(items: T[], zones: ZoneData[] = []) {
		this.items = items;
		this.zones = zones;
	}

	getByName(name: string): T | null {
		const found = this.items.find((item) => item.name.toLowerCase() === name.toLowerCase());
		return found || null;
	}

	getById(id: string): T | null {
		const found = this.items.find((item) => item.id === id);
		return found || null;
	}

	filterByZone(zoneName: string): Items<T> {
		const zone = this.zones.find((z) => z.name.toLowerCase() === zoneName.toLowerCase());
		if (!zone) {
			return new Items<T>([]);
		}

		const filtered = this.items.filter((item) => {
			const itemData = (item as any)._rawData;
			return itemData.zone === zone.id;
		});

		return new Items<T>(filtered, this.zones);
	}

	filter(predicate: (item: T) => boolean): Items<T> {
		const filtered = this.items.filter(predicate);
		return new Items<T>(filtered, this.zones);
	}
}

export class HomeyAdapter {
	private token: string;
	private homeyId: string;
	private baseUrl: string;
	private useCache: boolean;
	private readFromCache: boolean;
	private cacheDir: string;

	constructor(token: string, homeyId: string, options: HomeyOptions = {}) {
		this.token = token;
		this.homeyId = homeyId;
		this.baseUrl = `https://${homeyId}.connect.athom.com`;
		this.useCache = options.cache || false;
		this.readFromCache = options.readFromCache || false;
		
		// Use project cache directory
		this.cacheDir = options.cacheDir || path.join(process.cwd(), 'cache', 'homey');
	}

	private saveToCache(filename: string, data: any) {
		if (!this.useCache) return;

		try {
			if (!fs.existsSync(this.cacheDir)) {
				fs.mkdirSync(this.cacheDir, { recursive: true });
			}

			const filepath = path.join(this.cacheDir, filename);
			fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
		} catch (error) {
			console.error(`Error saving to cache: ${error}`);
		}
	}

	private loadFromCache(filename: string) {
		if (!this.readFromCache) return null;

		const filepath = path.join(this.cacheDir, filename);
		if (!fs.existsSync(filepath)) {
			return null;
		}

		try {
			const data = fs.readFileSync(filepath, 'utf8');
			return JSON.parse(data);
		} catch (error) {
			console.error(`Error reading cache file ${filepath}:`, error);
			return null;
		}
	}

	private async apiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
		try {
			const url = `${this.baseUrl}${endpoint}`;
			const config: RequestInit = {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${this.token}`,
					'Content-Type': 'application/json',
					...options.headers
				},
				...options
			};

			const response = await fetch(url, config);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`
				);
			}

			const data = await response.json();
			return data;
		} catch (error) {
			console.error(`API call failed for ${endpoint}:`, error);
			throw error;
		}
	}

	async getDevices(): Promise<Items<Device>> {
		// Get zones first for zone information
		const zones = await this.getZones();
		const zoneList = zones.items;

		const cachedData = this.loadFromCache('devices.json');
		if (cachedData) {
			const devices = Object.values(cachedData).map(
				(deviceData: any) => new Device(deviceData, zoneList)
			);
			return new Items(devices, zoneList);
		}

		const data = await this.apiCall('/api/manager/devices/device');
		this.saveToCache('devices.json', data);
		const devices = Object.values(data).map(
			(deviceData: any) => new Device(deviceData, zoneList)
		);
		return new Items(devices, zoneList);
	}

	async getLogicVariables(): Promise<Items<Variable>> {
		// Get zones first for zone information
		const zones = await this.getZones();
		const zoneList = zones.items;

		const cachedData = this.loadFromCache('logic.json');
		if (cachedData) {
			const variables = Object.values(cachedData).map(
				(variableData: any) => new Variable(variableData, zoneList)
			);
			return new Items(variables, zoneList);
		}

		const data = await this.apiCall('/api/manager/logic/variable/');
		this.saveToCache('logic.json', data);
		const variables = Object.values(data).map(
			(variableData: any) => new Variable(variableData, zoneList)
		);
		return new Items(variables, zoneList);
	}

	async getZones(): Promise<Items<Zone>> {
		const cachedData = this.loadFromCache('zones.json');
		if (cachedData) {
			const zones = Object.values(cachedData).map((zoneData: any) => new Zone(zoneData));
			return new Items(zones);
		}

		const data = await this.apiCall('/api/manager/zones/zone');
		this.saveToCache('zones.json', data);
		const zones = Object.values(data).map((zoneData: any) => new Zone(zoneData));
		return new Items(zones);
	}
}

// Factory function that uses environment variables
export function createHomeyClient(options: HomeyOptions = {}): HomeyAdapter {
	const token = env.HOMEY_TOKEN;
	const homeyId = env.HOMEY_ID;

	if (!token || !homeyId) {
		throw new Error('HOMEY_TOKEN and HOMEY_ID must be set in environment variables');
	}

	return new HomeyAdapter(token, homeyId, {
		cache: true,
		readFromCache: true,
		cacheDir: path.join(process.cwd(), 'cache', 'homey'),
		...options
	});
}