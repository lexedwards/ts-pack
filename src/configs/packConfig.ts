import { parseArgs } from 'node:util';
import { z } from 'zod';

import dm from '@fastify/deepmerge';
import { replaceByClonedSource } from '../deepmerge';

const deepmerge = dm({
  all: true,
  mergeArray: replaceByClonedSource,
});

const argsReturn = parseArgs({
  options: {
    help: {
      type: 'boolean',
      short: 'h',
    },
    doctor: {
      type: 'boolean',
      short: 'd',
    },
    tsConfig: {
      type: 'string',
      short: 'c',
    },
    inputFile: {
      type: 'string',
      short: 'i',
    },
  },
});

const pkgSchema = z.object({
  help: z.boolean().optional(),
  doctor: z.boolean().optional(),
  tsConfig: z.string().optional(),
  inputFile: z.string().optional(),
});

export async function parsePackConfigFromPkgJson(pkgJson: unknown) {
  if (typeof pkgJson !== 'object') return {};
  if (!(`ts-pack` in pkgJson)) return {};
  const verifiedConfig = await pkgSchema.safeParseAsync(pkgJson['ts-pack']);
  if (verifiedConfig.success) {
    return verifiedConfig.data;
  }
  return {};
}

export const DEFAULT_CONFIG: z.infer<typeof pkgSchema> = {
  help: false,
  doctor: false,
  tsConfig: 'tsconfig.json',
  inputFile: 'src/index.ts',
};

const aggregateSchema = z.object({
  help: z.boolean().optional(),
  doctor: z.boolean(),
  tsConfig: z.string(),
  inputFile: z.string(),
});

export type PackConfig = z.infer<typeof aggregateSchema>;

export async function getAggregatedConfig(
  pkgJson: unknown,
): Promise<PackConfig> {
  const fromPkgJson = await parsePackConfigFromPkgJson(pkgJson);
  const combinedConfig = deepmerge(fromPkgJson, { ...argsReturn.values });
  const aggregate = {
    help: combinedConfig.help || DEFAULT_CONFIG.help,
    doctor: (combinedConfig.doctor ??= DEFAULT_CONFIG.doctor),
    tsConfig: combinedConfig.tsConfig || DEFAULT_CONFIG.tsConfig,
    inputFile: combinedConfig.inputFile || DEFAULT_CONFIG.inputFile,
  };
  return aggregateSchema.parse(aggregate);
}
