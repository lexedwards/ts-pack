import { cwd } from 'node:process';
import { dirname, extname } from 'node:path';
import { rollup, RollupBuild, OutputOptions } from 'rollup';

import json from '@rollup/plugin-json';

import { getAggregatedConfig, getPkgJson } from '../configs';

import { swc, defineRollupSwcOption } from 'rollup-plugin-swc3';

async function writeToBundle(bundle: RollupBuild, ...options: OutputOptions[]) {
  await Promise.all(
    options.map(async (opt) => {
      await bundle.write(opt);
    }),
  );
}

function generateInputOptions(pkg: Record<string, unknown>): OutputOptions[] {
  const options: OutputOptions[] = [];
  if (pkg.main && typeof pkg.main === 'string') {
    options.push({
      dir: dirname(pkg.main),
      entryFileNames: `[name]${extname(pkg.main)}`,
      format: 'cjs',
    });
  }
  if (pkg.module && typeof pkg.module === 'string') {
    options.push({
      dir: dirname(pkg.module),
      entryFileNames: `[name]${extname(pkg.module)}`,
      format: `esm`,
    });
  }
  return options;
}

export async function transpile() {
  const currentDirectory = cwd();
  const pkgJson = await getPkgJson(currentDirectory);
  const packConfig = await getAggregatedConfig(pkgJson);

  const unresolvedImports = new Set<string>();

  const bundle = await rollup({
    input: packConfig.inputFile,
    plugins: [
      json(),
      swc(
        defineRollupSwcOption({
          tsconfig: packConfig.tsConfig,
          minify: true,
        }),
      ),
    ],
    perf: true,
    onwarn(warning, warn) {
      if (warning.code === 'THIS_IS_UNDEFINED') return;
      if (warning.code === 'UNRESOLVED_IMPORT') {
        if (
          warning.exporter.startsWith('node:') ||
          Object.keys(pkgJson.dependencies).findIndex((dep) =>
            warning.exporter.startsWith(dep),
          ) > -1
        ) {
          return;
        }
        unresolvedImports.add(warning.exporter);
      }
      warn(warning);
    },
    cache: true,
  });
  let buildFailed = false;
  try {
    await writeToBundle(bundle, ...generateInputOptions(pkgJson));
    const bundleTimings = bundle.getTimings?.();

    console.info(
      `Bundles generated in ${bundleTimings['# GENERATE'][0].toFixed(2)} ms`,
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
  if (buildFailed) {
    return Promise.reject();
  }
  return Promise.resolve();
}
