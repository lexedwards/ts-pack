import { cwd } from 'node:process';
import { getAggregatedConfig, DEFAULT_CONFIG, PackConfig } from '../configs';
import { green, logResult, logWarning } from '../std';
import { fileExists } from '../fileSystem/verification';
import { join } from 'node:path';

const packRules = [
  {
    name: 'inputFile',
    verify: async (agg: PackConfig): Promise<boolean | undefined> => {
      if (agg.inputFile !== DEFAULT_CONFIG.inputFile) return true;
      return undefined;
    },
    message: (result: boolean | undefined) => {
      logResult(result, `Input file configured`);
      if (!result) {
        logWarning(
          `Pack is using a default configuration for it's input file (${DEFAULT_CONFIG.inputFile})`,
        );
      }
    },
  },
  {
    name: 'Verify inputFile exists',
    verify: async (agg: PackConfig): Promise<boolean> => {
      const currentDirectory = cwd();
      return fileExists(join(currentDirectory, agg.inputFile));
    },
    message: (result: boolean | undefined) => {
      logResult(result, `Input file found`);
    },
  },
  {
    name: 'tsconfig',
    verify: async (agg: PackConfig): Promise<boolean | undefined> => {
      if (agg.tsConfig !== DEFAULT_CONFIG.tsConfig) return true;
      return undefined;
    },
    message: (result: boolean | undefined) => {
      logResult(result, `Typescript configured`);
      if (!result) {
        logWarning(
          `Pack is using a default configuration for it's typescript (${DEFAULT_CONFIG.tsConfig})`,
        );
      }
    },
  },
  {
    name: 'Verify tsconfig exists',
    verify: async (agg: PackConfig): Promise<boolean> => {
      const currentDirectory = cwd();
      return fileExists(join(currentDirectory, agg.tsConfig));
    },
    message: (result: boolean | undefined) => {
      logResult(result, `tsconfig file found`);
    },
  },
];

export async function inspectPackConfigs(pkgJson: Record<string, unknown>) {
  console.info(green(`📦 Verifying Pack Config... \n`));
  const packConfig = await getAggregatedConfig(pkgJson);

  packRules.forEach(async (rule) =>
    rule.message(await rule.verify(packConfig)),
  );
}
