import { build } from './bundling';

async function main() {
  console.info(`🚀 Running Pack`);
  await build();
}

main();
