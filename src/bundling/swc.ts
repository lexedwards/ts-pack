import { extname, resolve, dirname, join } from 'node:path';
import { cwd } from 'node:process';
import { type Plugin as RollupPlugin } from 'rollup';
import {
  type FilterPattern as RollupFilterPattern,
  createFilter as rollupCreateFilter
} from '@rollup/pluginutils';

import {
  JscTarget,
  type Options as SwcOptions,
  type JsMinifyOptions,
  transform as swcTransform,
  minify as swcMinify
} from '@swc/core';
import {
  fileExists,
  isDirectory,
  resolveFile
} from '../fileSystem/verification';

import dm from '@fastify/deepmerge';
import { replaceByClonedSource } from '../deepmerge';

const deepmerge = dm({
  all: true,
  mergeArray: replaceByClonedSource
});

interface ConfigureTransformOptions {
  tsConfig: {
    importHelpers?: boolean;
  };
}

function configureTransform(): RollupPlugin['transform'] {
  return async function transform(code, id) {
    const filter = rollupCreateFilter(
      options.include || /\.[mc]?[jt]sx?$/,
      options.exclude || /node_modules/
    );
    if (!filter(id)) {
      return null;
    }

    const ext = extname(id);
    const isTypeScript = ext === '.ts' || ext === '.tsx';
    const isTsx = ext === '.tsx';
    const isJsx = ext === '.jsx';

    // Need to add support for SWC "preserve" jsx
    // https://github.com/swc-project/swc/pull/5661
    // Respect "preserve" after swc adds the support
    const useReact17NewTransform =
      tsconfigOptions.jsx === 'react-jsx' ||
      tsconfigOptions.jsx === 'react-jsxdev';

    const swcConfig: SwcOptions = {
      jsc: {
        externalHelpers: tsconfigOptions.importHelpers,
        parser: {
          syntax: isTypeScript ? 'typescript' : 'ecmascript',
          tsx: isTypeScript ? isTsx : undefined,
          jsx: !isTypeScript ? isJsx : undefined,
          decorators: tsconfigOptions.experimentalDecorators
        },
        transform: {
          decoratorMetadata: tsconfigOptions.emitDecoratorMetadata,
          react: {
            runtime: useReact17NewTransform ? 'automatic' : 'classic',
            importSource: tsconfigOptions.jsxImportSource,
            pragma: tsconfigOptions.jsxFactory,
            pragmaFrag: tsconfigOptions.jsxFragmentFactory,
            development:
              tsconfigOptions.jsx === 'react-jsxdev' ? true : undefined
          }
        },
        target: tsconfigOptions.target?.toLowerCase() as JscTarget | undefined,
        baseUrl: tsconfigOptions.baseUrl,
        paths: tsconfigOptions.paths
      }
    };

    const {
      filename: _1, // We will use `id` from rollup instead
      include: _2, // Rollup's filter is incompatible with swc's filter
      exclude: _3,
      tsconfig: _4, // swc doesn't have tsconfig option
      minify: _5, // We will disable minify during transform, and perform minify in renderChunk
      ...restSwcOptions
    } = options;

    const swcOption = deepmerge<SwcOptions[]>(swcConfig, restSwcOptions, {
      jsc: {
        minify: undefined // Disable minify on transform, do it on renderChunk
      },
      filename: id,
      minify: false // Disable minify on transform, do it on renderChunk
    });

    const { code: transformedCode, ...rest } = await swcTransform(
      code,
      swcOption
    );

    return {
      ...rest,
      code: transformedCode
    };
  };
}

function configureResolveId(): RollupPlugin['resolveId'] {
  const INCLUDE_REGEXP = /\.[mc]?[jt]sx?$/;
  const ACCEPTED_EXTENSIONS = ['.ts', '.tsx', '.mjs', '.js', '.cjs', '.jsx'];
  return async function resolveId(importee, importer) {
    // null characters belong to other plugins
    if (importee.startsWith('\0')) {
      return null;
    }

    if (importer && importee[0] === '.') {
      const resolved = resolve(importer ? dirname(importer) : cwd(), importee);

      let file = await resolveFile({
        resolved,
        include: INCLUDE_REGEXP,
        extensions: ACCEPTED_EXTENSIONS
      });
      if (file) return file;
      if (
        !file &&
        (await fileExists(resolved)) &&
        (await isDirectory(resolved))
      ) {
        file = await resolveFile({
          resolved,
          index: true,
          include: INCLUDE_REGEXP,
          extensions: ACCEPTED_EXTENSIONS
        });
        if (file) return file;
      }
    }
  };
}

function configureRenderChunk(): RollupPlugin['renderChunk'] {
  return function renderChunk(code: string) {
    if (
      options.minify ||
      options.jsc?.minify?.mangle ||
      options.jsc?.minify?.compress
    ) {
      return swcMinify(code, options.jsc?.minify);
    }

    return null;
  };
}

export function swc(): RollupPlugin {
  return {
    name: 'rollup-plugin-swc',
    resolveId: configureResolveId(),
    transform: configureTransform(),
    renderChunk: configureRenderChunk()
  };
}
