import { extname, resolve, dirname } from 'node:path';
import { cwd } from 'node:process';
import { Plugin as RollupPlugin } from 'rollup';
import {
  FilterPattern as RollupFilterPattern,
  createFilter as rollupCreateFilter,
} from '@rollup/pluginutils';

import {
  JscTarget,
  Options as SwcOptions,
  Config as SwcConfig,
  transform as swcTransform,
  minify as swcMinify,
} from '@swc/core';
import {
  fileExists,
  isDirectory,
  resolveFile,
} from '../fileSystem/verification';

import dm from '@fastify/deepmerge';
import { replaceByClonedSource } from '../deepmerge';

const deepmerge = dm({
  all: true,
  mergeArray: replaceByClonedSource,
});

interface ConfigureTransformOptions {
  include?: RollupFilterPattern;
  exclude?: RollupFilterPattern;
  tsConfig?: {
    importHelpers?: boolean;
    jsx: string;
    experimentalDecorators: boolean;
    emitDecoratorMetadata: boolean;
    jsxImportSource: string;
    jsxFactory: string;
    jsxFragmentFactory: string;
    target: string;
    baseUrl: string;
    paths: Record<string, string[]>;
  };
  swcConfig?: SwcConfig;
}

function configureTransform({
  tsConfig,
  swcConfig,
  ...options
}: ConfigureTransformOptions = {}): RollupPlugin['transform'] {
  return async function transform(code, id) {
    const filter = rollupCreateFilter(
      options.include || /\.[mc]?[jt]sx?$/,
      options.exclude || /node_modules/,
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
      tsConfig?.jsx === 'react-jsx' || tsConfig?.jsx === 'react-jsxdev';

    const swcConfigFromTsConfig: SwcOptions = {
      jsc: {
        externalHelpers: tsConfig?.importHelpers,
        parser: {
          syntax: isTypeScript ? 'typescript' : 'ecmascript',
          tsx: isTypeScript ? isTsx : undefined,
          jsx: !isTypeScript ? isJsx : undefined,
          decorators: tsConfig?.experimentalDecorators,
        },
        transform: {
          decoratorMetadata: tsConfig?.emitDecoratorMetadata,
          react: {
            runtime: useReact17NewTransform ? 'automatic' : 'classic',
            importSource: tsConfig?.jsxImportSource,
            pragma: tsConfig?.jsxFactory,
            pragmaFrag: tsConfig?.jsxFragmentFactory,
            development: tsConfig?.jsx === 'react-jsxdev' ? true : undefined,
          },
        },
        target: tsConfig?.target?.toLowerCase() as JscTarget | undefined,
        baseUrl: tsConfig?.baseUrl,
        paths: tsConfig?.paths,
      },
    };

    // const {
    //   exclude: _3,
    //   minify: _5, // We will disable minify during transform, and perform minify in renderChunk
    //   ...restSwcOptions
    // } = swcConfig;

    const swcOption = deepmerge<SwcOptions[]>(
      swcConfigFromTsConfig,
      // restSwcOptions,
      {
        jsc: {
          minify: undefined, // Disable minify on transform, do it on renderChunk
        },
        filename: id,
        minify: false, // Disable minify on transform, do it on renderChunk
      },
    );

    const { code: transformedCode, ...rest } = await swcTransform(
      code,
      swcOption,
    );

    return {
      ...rest,
      code: transformedCode,
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
        extensions: ACCEPTED_EXTENSIONS,
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
          extensions: ACCEPTED_EXTENSIONS,
        });
        if (file) return file;
      }
    }
  };
}

function configureRenderChunk(options: SwcConfig): RollupPlugin['renderChunk'] {
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

export interface RollupSwcOptions {}

export function swc(options?: RollupSwcOptions): RollupPlugin {
  return {
    name: 'rollup-plugin-swc',
    resolveId: configureResolveId(),
    transform: configureTransform(),
    renderChunk: configureRenderChunk({ minify: true }),
  };
}
