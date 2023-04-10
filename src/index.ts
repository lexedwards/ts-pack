import { cwd } from 'node:process';
import { transpile, emitTypes } from './bundling';
import { getPkgJson, getAggregatedConfig } from './configs';
import { doctor, help } from './doctor';

async function pack() {
  const currentDirectory = cwd();
  const pkgJson = await getPkgJson(currentDirectory);
  const packConfig = await getAggregatedConfig(pkgJson);
  if (packConfig.help) {
    return help();
  }
  if (packConfig.doctor) {
    return doctor();
  }

  console.info(`🚀 Running Pack: "${pkgJson.name}@${pkgJson.version}"\n`);
  const packageTypes = !!pkgJson.types;
  await Promise.all(
    [transpile(), packageTypes ? emitTypes() : null].filter(Boolean),
  );
}

pack();
