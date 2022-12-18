export function replaceByClonedSource(options) {
  const clone = options.clone;
  return function (target: unknown[], source: unknown[]) {
    return clone(source);
  };
}
