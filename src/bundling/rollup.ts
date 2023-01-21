import { cwd, exit } from 'node:process';
import { inspect } from 'node:util';
import { dirname } from 'node:path';
import { rollup, RollupBuild, OutputOptions } from 'rollup';

import {
  getAggregatedConfig,
  getPkgJson,
  getTsConfig,
  getSwcConfig,
} from '../configs';

import { swc } from './swc';

async function writeToBundle(bundle: RollupBuild, ...options: OutputOptions[]) {
  await Promise.all(
    options.map(async (opt) => {
      await bundle.write(opt);
    }),
  );
}

export async function build() {
  const currentDirectory = cwd();
  const pkgJson = await getPkgJson(currentDirectory);
  const packConfig = await getAggregatedConfig(pkgJson);
  const tsConfig = await getTsConfig(currentDirectory, packConfig.tsConfig);
  const swcConfig = await getSwcConfig(currentDirectory);

  // console.info(
  //   inspect(
  //     { currentDirectory, pkgJson, packConfig, tsConfig, swcConfig },
  //     { colors: true, depth: null, compact: false },
  //   ),
  // );

  const unresolvedImports = new Set<string>();

  const bundle = await rollup({
    input: packConfig.entryPoint,
    plugins: [swc()].filter(Boolean),
    perf: true,
    onwarn(warning, warn) {
      if (warning.code === 'THIS_IS_UNDEFINED') return;
      if (warning.code === 'UNRESOLVED_IMPORT') {
        unresolvedImports.add(warning.exporter);
        return;
      }
      warn(warning);
    },
  });
  let buildFailed = false;
  try {
    await writeToBundle(
      bundle,
      {
        dir: dirname(pkgJson.main as string),
        entryFileNames: `[name].js`,
        format: 'cjs',
      },
      {
        dir: dirname(pkgJson.module as string),
        entryFileNames: `[name].mjs`,
        format: `esm`,
      },
    );

    const bundleTimings = bundle.getTimings?.();

    console.info(
      `Bundle generated in ${bundleTimings['# GENERATE'][0].toFixed(2)} ms`,
    );
  } catch (error) {
    buildFailed = true;
    console.error(`Pack Error:`, error);
  }
  await bundle.close();
  if (unresolvedImports.size) {
    console.info(`Imports treated as external:`);
    Array.from(unresolvedImports)
      .sort((a, b) => a.localeCompare(b))
      .forEach((ext) => console.info('  \x1b[33m%s\x1b[0m', ext));
  }

  exit(buildFailed ? 1 : 0);
}
