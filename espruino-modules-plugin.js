const debug = require('debug')('espruino-modules');
const debug_modules = require('debug')('espruino-modules:modules');
const path = require('path');
const fs = require('fs');
const tools = require('./espruino-tools');

function espruinoModules(options) {
	const plugin = {
        name: 'espruino-modules',
        options: function(opts) {
            plugin._opts = opts;
            plugin._opts._input = path.resolve(opts.input);
            options.job = opts.job || {
                MODULE_URL: "https://www.espruino.com/modules",
                BOARD_JSON_URL: "https://www.espruino.com/json",
                MODULE_EXTENSIONS: ".min.js|.js",

                MODULE_AS_FUNCTION: true,

                // TODO: add proxy setup for the local espruino-tools/httpGET
                MODULE_PROXY_ENABLED: false,
                MODULE_PROXY_URL: "",
                MODULE_PROXY_PORT: "",
            };

            // no Modules.addCached()
            if (options.mergeModules === undefined) {
                options.mergeModules  = !!options.job.MODULE_MERGE;
            }
            // minify the app code
            if (options.minify === undefined) {
                options.minify = !!options.job.MINIFICATION_LEVEL;
            }
            // download minifed modules
            if (options.minifyModules === undefined) {
                options.minifyModules = !!options.job.MODULE_MINIFICATION_LEVEL;
            }

            let firmwareVersion = options.version;

            let board = options.board;
            if (!board) {
                // custom, try package.json#espruino.board
                try {
                    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
                    board = pkg.espruino && pkg.espruino.board;
                } catch(e) {
                    // fallthrough
                }
            }
            if (typeof board === 'object') {
                // options.board considered to be the parsed board JSON file
                plugin._opts._boardJSON = new Promise(resolve => resolve(board));
                return;
            }

            console.log('board: ', board);
            plugin._opts._boardJSON = new Promise((resolve, reject) => {

                const boardJSONPath = path.resolve('./modules', '.board_' + board + '.json');
                fs.stat(boardJSONPath, function (err, stat) {
                    if (!err) {
                        const contents = fs.readFileSync(boardJSONPath, 'utf8');
                        resolve(contents);
                        return;
                    }
                    // ignore built-in modules
                    tools.fetchEspruinoBoardJSON(board, options, (err, contents) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        fs.writeFile(boardJSONPath, contents, 'utf8', err => err
                            ? reject(err)
                            : resolve(contents));
                    });
                });
            }).then(json => JSON.parse(json));
        },
        isEntryId(id) {
            return id === plugin._opts._input;
        },

        addModule(id, filename, resolver) {
            debug_modules('addModule', id, plugin._resolves[filename]);

            return plugin._resolves[filename] = plugin._resolves[filename] || resolver().then(() => {
                debug_modules('module', id, filename);

                if (!options.mergeModules) {
                    // treat as built-in (added via Modules.addCached)
                    plugin._modules.push({ id, filename });
                    //return filename;
                    return false;
                }

                return filename;
            });
        },
        stringifyCachedModules(spacer) {
            function stringifyModule({id, filename}) {
                let code = fs.readFileSync(filename, 'utf8');
                if (id.endsWith('.json')) {
                    code = `module.exports=${JSON.stringify(JSON.parse(code))};`;
                }
                return `Modules.addCached('${id}',function() {${spacer}${code}${spacer}})`;
            }

            // \n needs to be in between the addCached() for later acorn.parse()
            return plugin._modules.map(stringifyModule).join('\n') +
                  (plugin._modules.length ? '\n' : '');
        },

        buildStart() {
            plugin._modules = [];
            // pending resolves
            plugin._resolves = {};
        },

        resolveId(importee, importer) {
            debug('resolve', importee, importer);

            // external modules (non-entry modules that start with neither '.' or '/')
            // are skipped at this stage.
            if (importer === undefined || importee === importer || importee[0] === '\0') {
                return null;
            }

            if (path.isAbsolute(importee) || importee[0] === '.') {
                // no local module file via addCached
                return null;
            }

            return plugin._opts._boardJSON.then(boardJSON => {
                if (boardJSON.info.builtin_modules.indexOf(importee) >= 0) {
                    // built-in module
                    return false;
                }

                // check for modules/x.js
                const modulesPath = path.resolve('./modules', importee + '.js');

                // module to be resolved from www.espruino.com/modules/
                return plugin.addModule(importee, modulesPath, () => new Promise((resolve, reject) => {

                    fs.stat(modulesPath, function (err, stat) {
                        if (!err) {
                            // module found in ./modules folder
                            resolve(modulesPath)
                            return;
                        }

                        console.log(`fetching ${importee}...`);
                        tools.fetchEspruinoModule(importee, options, (err, source) => {
                            if (err) {
                                // not tound in www.espruino.com/modules/ or another network error
                                reject(err);
                                return;
                            }

                            console.log('...resolved', importee);
                            // cache the module into ./modules folder
                            fs.writeFile(modulesPath, source, 'utf8', err => err
                                ? reject(err)
                                : resolve(modulesPath));
                        });
                    });
                }));
            });
        },

        transform(code, id) {
            if (plugin.isEntryId(id)) {
                code += `ESPRUINO_ROLLUP_MAIN(() => { onInit(); });`;
            }
            return code;
        },
        generateBundle(outputOptions, bundle, isWrite) {
            const spacer = options.minifyModules === false?'\n':'';

            Object.entries(bundle).forEach(([name, contents]) => {
                // strip the ESPRUINO_ROLLUP_MAIN() call added to entry chunk by transform
                // to ensures the onInit() is never dropped as unused
                contents.code = contents.code
                    .replace(/(,?)\s*ESPRUINO_ROLLUP_MAIN\(\s*\(\)\s*=>\s*\{\s*onInit\(\);?\s*\}\s*\)\s*(,?)/m,
                             (match, comma1, comma2) => (comma1 && comma2 ? ',' : ''));

                contents.code =
                    plugin.stringifyCachedModules(spacer) +
                    (options.minify ? '' : spacer) +
                    contents.code;
            });
        }
    };
    return plugin;
};

module.exports = espruinoModules;
