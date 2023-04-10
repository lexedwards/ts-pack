import { cwd } from 'node:process';
import { dirname } from 'node:path';
import { rollup, RollupBuild, OutputOptions } from 'rollup';

import { getAggregatedConfig, getPkgJson } from '../configs';

import dts from 'rollup-plugin-dts';

async function writeToBundle(bundle: RollupBuild, ...options: OutputOptions[]) {
  await Promise.all(
    options.map(async (opt) => {
      await bundle.write(opt);
    }),
  );
}

export async function emitTypes() {
  const currentDirectory = cwd();
  const pkgJson = await getPkgJson(currentDirectory);
  const packConfig = await getAggregatedConfig(pkgJson);

  const unresolvedImports = new Set<string>();

  const bundle = await rollup({
    input: packConfig.inputFile,
    plugins: [
      dts({
        tsconfig: packConfig.tsConfig,
        compilerOptions: {
          outDir: dirname(pkgJson.types as string),
          emitDeclarationOnly: true,
        },
      }),
    ],
    perf: true,
    watch: {
      clearScreen: true,
      include: dirname(packConfig.inputFile),
    },
    onwarn(warning, warn) {
      if (warning.code === 'THIS_IS_UNDEFINED') return;
      if (warning.code === 'UNRESOLVED_IMPORT') {
        if (!warning.exporter.startsWith('node:')) {
          unresolvedImports.add(warning.exporter);
        }
        return;
      }
      warn(warning);
    },
  });
  let buildFailed = false;
  try {
    await writeToBundle(bundle, {
      dir: dirname(pkgJson.types as string),
      entryFileNames: `[name].d.ts`,
      format: `esm`,
    });

    const bundleTimings = bundle.getTimings?.();

    console.info(
      `Type declarations generated in ${bundleTimings['# GENERATE'][0].toFixed(
        2,
      )} ms`,
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
