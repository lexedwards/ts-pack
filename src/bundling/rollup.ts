import { rollup, RollupBuild } from 'rollup';
import { swc } from './swc';

async function writeToBundle(bundle: RollupBuild, ...options: unknown[]) {
  for (const opt of options) {
    await bundle.write(opt);
  }
}

export async function build() {
  const bundle = await rollup({
    plugins: [swc()]
  });

  await writeToBundle(bundle);

  await bundle.close();
}
