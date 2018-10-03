const commonjs = require('rollup-plugin-commonjs');
const json = require('rollup-plugin-json');
const espruino = require('rollup-plugin-espruino');

const terser = require('./terser-sync-plugin');
const gitHubModules = require('./github-modules-plugin');
const espruinoModules = require('./espruino-modules-plugin');


const defaultOptions = {
    output: {
        format: 'cjs',
        exports: null,
        freeze: false,
        interop: false,
        strict: false
    }
};

const defaultMinifyOptions = { // -- Espruino compatible options --
        toplevel: true,
        mangle: {
            reserved: ['onInit'],
        },
        compress: {
            passes: 3,
            ecma: 5,
            keep_fnames: true, // to keep onInit
            reduce_funcs: false,
            inline: 0,
            dead_code: true,
            global_defs: {
                DEBUG: false
            }
        }
        // -- debug disable minification --
        // , output: { beautify: true }
        // , mangle: false, compress: false
    };

const buildPlugins = (options) => [
    gitHubModules(),
    espruinoModules(options.espruino),
    json(),
    commonjs(),
    options.espruino.minify === false ? { requireId: () => null } : terser.terser(defaultMinifyOptions),
    // espruino({
    //     //port: 'aa:bb:cc:dd:ee', // or ['/dev/ttyX', 'aa:bb:cc:dd:ee']
    //     //setTime: true,
    //     //save: true,
    // })
];

const buildEspruinoConfig = (baseOptions) => {
    const output = baseOptions.output;
    const defaultOutput = defaultOptions.output;
    const opts = Object.assign({},
        defaultOptions,
        baseOptions,
        { output: { ...defaultOutput, ...output } }
    );
    opts.plugins = buildPlugins(opts);
    delete opts.espruino;
    return opts;
};

const buildEspruinoMinifyConfig = (options) => {
    return {
        ...defaultMinifyOptions,
        ...options
    };
}

module.exports = {
    buildEspruinoConfig,
    espruinoModules,

    buildEspruinoMinifyConfig,
    espruinoMinify: terser.minify
};
