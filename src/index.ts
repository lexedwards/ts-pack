import { cwd } from 'node:process';

import { getAggregatedConfig, getPkgJson, getTsConfig } from './configs';

async function main() {
  const currentDirectory = cwd();
  const pkgJson = await getPkgJson(currentDirectory);
  const packConfig = await getAggregatedConfig(pkgJson);
  const tsConfig = await getTsConfig(currentDirectory, packConfig.tsConfig);

  console.log(pkgJson);
  console.log(tsConfig);
  console.log(packConfig);
}

main();
