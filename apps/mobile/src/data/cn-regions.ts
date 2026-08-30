// 来源：cn-division@2026.0.0（民政部公开区划数据），仅保留省/市/区名称，约 43KB。
import regions from './cn-regions.json';

export type RegionTree = Record<string, Record<string, string[]>>;

export const cnRegions = regions as RegionTree;
