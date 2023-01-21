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
    noVerify: {
      type: 'boolean',
    },
    tsConfig: {
      type: 'string',
      short: 'c',
    },
    formats: {
      type: 'string',
      short: 'f',
    },
  },
});

const pkgSchema = z.object({
  noVerify: z.boolean().optional(),
  tsConfig: z.string().optional(),
  formats: z.string().optional(),
  entryPoint: z.string().optional(),
});

async function parsePackConfigFromPkgJson(pkgJson: unknown) {
  if (typeof pkgJson !== 'object') return {};
  if (!(`pack` in pkgJson)) return {};
  const verifiedConfig = await pkgSchema.safeParseAsync(pkgJson.pack);
  if (verifiedConfig.success) {
    return verifiedConfig.data;
  }
  return {};
}

const DEFAULT_CONFIG: z.infer<typeof pkgSchema> = {
  formats: 'cjs,esm',
  noVerify: true,
  tsConfig: 'tsconfig.json',
  entryPoint: 'src/index.js',
};

const aggregateSchema = z.object({
  noVerify: z.boolean(),
  tsConfig: z.string(),
  formats: z.enum(['esm', 'cjs']).array(),
  entryPoint: z.string(),
});

export async function getAggregatedConfig(pkgJson: unknown) {
  const fromPkgJson = await parsePackConfigFromPkgJson(pkgJson);
  const combinedConfig = deepmerge(fromPkgJson, { ...argsReturn.values });
  const aggregate = {
    formats: String(combinedConfig.formats || DEFAULT_CONFIG.formats).split(
      ',',
    ),
    noVerify: (combinedConfig.noVerify ??= DEFAULT_CONFIG.noVerify),
    tsConfig: combinedConfig.tsConfig || DEFAULT_CONFIG.tsConfig,
    entryPoint: combinedConfig.entryPoint || DEFAULT_CONFIG.entryPoint,
  };
  return aggregateSchema.parse(aggregate);
}
