import { join } from 'node:path';
import { readFile } from 'node:fs/promises';

export async function getPkgJson(cwd: string) {
  const file = await readFile(join(cwd, 'package.json'), { encoding: 'utf-8' });
  return JSON.parse(file) as Record<string, unknown>;
}
