import dm from '@fastify/deepmerge';
import { join } from 'node:path';
import { replaceByClonedSource } from '../deepmerge';

const deepMerge = dm({
  all: true,
  mergeArray: replaceByClonedSource
});

export async function getTsConfig(
  cwd: string,
  entry = 'tsconfig.json',
  memoizeConfig: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  const { default: tsConfig } = await import(`${cwd}/${entry}`);
  if (!assertExtendsPresent(tsConfig)) {
    return deepMerge(tsConfig, memoizeConfig);
  }
  const { extends: strippedExtends, ...restConfig } = tsConfig;
  if (strippedExtends.startsWith('.')) {
    return getTsConfig(
      cwd,
      join(strippedExtends),
      deepMerge(restConfig, memoizeConfig)
    );
  }
  return getTsConfig(
    cwd,
    join('node_modules', strippedExtends),
    deepMerge(restConfig, memoizeConfig)
  );
}

function assertExtendsPresent(
  tsConfig: Record<string, unknown>
): tsConfig is { extends: string } & Record<string, unknown> {
  return `extends` in tsConfig && typeof tsConfig.extends === 'string';
}
