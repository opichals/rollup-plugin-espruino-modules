const commonjs = require('rollup-plugin-commonjs');
const json = require('rollup-plugin-json');

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

const defaultMinifyOptions = { // -- terser, Espruino compatible options --
        toplevel: true,
        mangle: {
            reserved: ['onInit'],
        },
        compress: {
            unused: true,
            dead_code: true,
            passes: 3,

            inline: 0,
            top_retain: ['onInit'],
            keep_fnames: true,  // to Function.name
            reduce_funcs: false,

            ecma: 5,
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
    options.espruino.minify === false ? { requireId: () => null } : terser.plugin(defaultMinifyOptions),
];

const buildRollupConfig = (baseOptions) => {
    const opts = Object.assign({},
        defaultOptions,
        baseOptions,
        { output: { ...defaultOptions.output, ...baseOptions.output } }
    );
    opts.espruino = opts.espruino || {};
    opts.plugins = buildPlugins(opts);
    delete opts.espruino;
    return opts;
};

const buildMinifyConfig = (options) => {
    return {
        ...defaultMinifyOptions,
        ...options
    };
}

module.exports = {
    espruinoModules,

    buildRollupConfig,
    buildMinifyConfig,

    minify: terser.minify
};
