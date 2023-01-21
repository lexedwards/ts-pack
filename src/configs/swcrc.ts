import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { Config as SwcConfig } from '@swc/core';

export async function getSwcConfig(cwd: string): Promise<SwcConfig> {
  try {
    const file = await readFile(join(cwd, 'package.json'), {
      encoding: 'utf-8',
    });
    return JSON.parse(file);
  } catch (e) {
    return {};
  }
}
