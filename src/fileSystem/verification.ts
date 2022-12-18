import { access, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';

export async function fileExists(path: string) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

interface ResolveFileOptions {
  resolved: string;
  index?: boolean;
  include: RegExp;
  extensions: string[];
}

export async function resolveFile({
  resolved,
  index = false,
  include,
  extensions
}: ResolveFileOptions) {
  const fileWithoutExt = resolved.replace(include, '');

  for (const ext of extensions) {
    const file = index
      ? join(resolved, `index${ext}`)
      : `${fileWithoutExt}${ext}`;
    if (await fileExists(file)) return file;
  }
  return null;
}

export async function isDirectory(pathOrFile: string) {
  try {
    const pathOrFileStats = await stat(pathOrFile);
    return pathOrFileStats.isDirectory();
  } catch (error) {
    return Promise.reject(error);
  }
}
