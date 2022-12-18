export async function getPkgJson(cwd: string) {
  const { default: pkgJson } = await import(`${cwd}/package.json`, {
    assert: {
      type: 'json'
    }
  });
  return pkgJson as Record<string, unknown>;
}
