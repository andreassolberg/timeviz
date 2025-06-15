// Type definitions for Homey API

export interface HomeyOptions {
  cache?: boolean;
  readFromCache?: boolean;
  cacheDir?: string;
}

export interface ZoneData {
  id: string;
  name: string;
}

export interface DeviceData {
  id: string;
  name: string;
  driverId: string;
  class: string;
  zone: string;
  capabilities: string[];
  available: boolean;
  capabilitiesObj?: Record<string, { id: string; value: any }>;
}

export interface VariableData {
  id: string;
  name: string;
  type: string;
  value: any;
}

export class Value {
  constructor(type: string, value: any);
  type: string;
  value: any;
  toString(): string;
}

export class Entity {
  constructor(data: any, zones?: ZoneData[]);
  id: string;
  name: string;
  hasCapability(capability: string): boolean;
  getValue(type: string): Value | null;
}

export class Device extends Entity {
  constructor(data: DeviceData, zones?: ZoneData[]);
  driverId: string;
  class: string;
  zone: string;
  capabilities: string[];
  available: boolean;
  zoneName: string | null;
  isAvailable(): boolean;
  getCapabilityValue(capability: string): any;
}

export class Variable extends Entity {
  constructor(data: VariableData, zones?: ZoneData[]);
  type: string;
  value: any;
}

export class Zone extends Entity {
  constructor(data: ZoneData);
}

export class Items<T extends Entity> {
  constructor(entities: T[], zones?: ZoneData[]);
  items: T[];
  getByName(name: string): T | null;
  getById(id: string): T | null;
  getItemById(id: string): T | null;
  getItemByName(name: string): T | null;
  filterByZone(zoneName: string): Items<T>;
  filter(predicate: (item: T) => boolean): Items<T>;
  length: number;
}

export interface InsightLogOptions {
  resolution?: string;
  start?: string;
  end?: string;
}

export class Homey {
  constructor(token: string, homeyId: string, options?: HomeyOptions);
  getDevices(): Promise<Items<Device>>;
  getLogicVariables(): Promise<Items<Variable>>;
  getZones(): Promise<Items<Zone>>;
  getInsights(): Promise<any>;
  getInsightLogs(logId: string, options?: InsightLogOptions): Promise<any>;
}

export function createHomeyClient(options?: HomeyOptions): Homey;