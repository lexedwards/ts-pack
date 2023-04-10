import pkgjson from '../../package.json' assert { type: 'json' };

export async function help() {
  console.info(`
  Pack v${pkgjson.version}

  A preconfigured bundler for typescript libraries

  Configurations via flags or package.json:
    --help, -h, pack.help
        Display this message

    --verify, -v, pack.verify
        Perform a check on package.json's configuration

    --tsConfig, -c, pack.tsConfig
        Specify the typescript config to use on build
        default: 'tsconfig.json'

    --inputFile, -i, pack.inputFile
        Specify the entry point to bundle.
        default: 'src/index.ts' 
`);
}
