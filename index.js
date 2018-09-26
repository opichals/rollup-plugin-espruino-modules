const commonjs = require('rollup-plugin-commonjs');
const terser = require('rollup-plugin-terser').terser;
const espruino = require('rollup-plugin-espruino');
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

const buildPlugins = (options) => [
    commonjs(),
    espruinoModules(options.espruino),
    terser({ // -- Espruino compatible options --
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
    }),
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

module.exports = {
    buildEspruinoConfig,
    espruinoModules
};
