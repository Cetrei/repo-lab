import { z } from "zod";
import * as s from "./schemas";

const none = z.undefined();
const counts = z.record(z.string(), z.int());

/** Every endpoint: the request Python reads and the data it answers with. Names match `repo_api`. */
export const endpoints = {
  "cosmetics.rulesets": { request: none, response: s.rulesets },
  "cosmetics.level": {
    request: z.strictObject({
      level: z.int(),
      bad_luck: z.int().optional(),
      ruleset: z.string().optional(),
    }),
    response: s.levelOutlook,
  },
  "cosmetics.run": {
    request: z.strictObject({
      start_level: z.int(),
      levels: z.int(),
      bad_luck: z.int().optional(),
      ruleset: z.string().optional(),
      horizon: z.int().optional(),
    }),
    response: s.runOutlook,
  },
  "monsters.catalog": { request: none, response: s.monsterCatalog },
  "monsters.lift": {
    request: z.strictObject({ upgrades: z.array(z.int()) }),
    response: s.liftTable,
  },
  "valuables.catalog": { request: none, response: s.valuableCatalog },
  "valuables.map": {
    request: z.strictObject({ location: z.string() }),
    response: s.mapValuables,
  },
  "upgrades.catalog": { request: none, response: s.upgradeCatalog },
  "upgrades.shop": {
    request: z.strictObject({ held: counts.optional(), consumed: z.array(z.string()).optional() }),
    response: s.shopOutlook,
  },
  "upgrades.stash": {
    request: z.strictObject({
      wanted: z.array(z.string()),
      held: counts.optional(),
      consumed: z.array(z.string()).optional(),
    }),
    response: s.stashPlan,
  },
  "upgrades.use": {
    request: z.strictObject({
      used: counts.optional(),
      held: counts.optional(),
      consumed: z.array(z.string()).optional(),
    }),
    response: s.useResult,
  },
  "upgrades.locate": {
    request: z.strictObject({ bought: z.array(z.string()) }),
    response: s.unitLocation,
  },
  "upgrades.reroll": {
    request: z.strictObject({ rerolls: z.int() }),
    response: s.rerollCost,
  },
  "spawning.rules": { request: none, response: s.spawnRules },
  "spawning.outlook": {
    request: z.strictObject({ level: z.int() }),
    response: s.spawnOutlook,
  },
  "spawning.despawn": { request: none, response: s.despawnWindow },
  "spawning.respawn": {
    request: z.strictObject({
      minutes_on_level: z.int(),
      killed: z.boolean().optional(),
      noise_seconds: z.int().optional(),
      final_extraction_done: z.boolean().optional(),
    }),
    response: s.respawnWindow,
  },
  "meta.sources": { request: none, response: s.sources },
} as const;

export type Endpoints = typeof endpoints;
export type EndpointName = keyof Endpoints;
export type RequestOf<N extends EndpointName> = z.input<Endpoints[N]["request"]>;
export type ResponseOf<N extends EndpointName> = z.output<Endpoints[N]["response"]>;

export function isEndpointName(name: string): name is EndpointName {
  return Object.hasOwn(endpoints, name);
}
