const path = require('path');
const fs = require('fs');
const tools = require('./espruino-tools');

function espruinoModules(options) {
	const plugin = {
        name: 'espruino-modules',
        options: function(opts) {
            plugin._opts = opts;
            plugin._opts._input = path.resolve(opts.input);
            options.job = {
                MODULE_URL: "https://www.espruino.com/modules",
                BOARD_JSON_URL: "https://www.espruino.com/json",
                MODULE_EXTENSIONS: ".min.js|.js",

                // options.mergeModules
                //  - no Modules.addCached()
                // options.minify
                //  - minify the app code
                // options.minifyModules
                //  - download minifed modules

                // ?
                MODULE_AS_FUNCTION: false,

                // TODO: add proxy setup for the local espruino-tools/httpGET
                MODULE_PROXY_ENABLED: false,
                MODULE_PROXY_URL: "",
                MODULE_PROXY_PORT: "",
            };

            let boardName = options.board;
            if (!boardName) {
                const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
                boardName = pkg.espruino && pkg.espruino.board;
            }

            console.log('board: ', boardName );
            plugin._opts._boardJSON = new Promise((resolve, reject) => {
                const boardJSONPath = path.resolve('./modules', '.board_' + boardName + '.json');
                fs.stat(boardJSONPath, function (err, stat) {
                    if (!err) {
                        const contents = fs.readFileSync(boardJSONPath, 'utf8');
                        resolve(contents);
                        return;
                    }
                    // ignore built-in modules
                    tools.fetchEspruinoBoardJSON(boardName, options, (err, contents) => {
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

        addModule(id, filename) {
            console.log('module', id, filename);
            if (!options.mergeModules) plugin._modules.push({ id, filename });
        },
        stringifyCachedModules(spacer) {
            function stringifyModule({id, filename}) {
                let code = fs.readFileSync(filename, 'utf8');
                if (id.endsWith('.json')) {
                    code = `module.exports=${code};`;
                }
                return `Modules.addCached('${id}',function() {${spacer}${code}${spacer}})`;
            }

            return plugin._modules.map(stringifyModule).join(spacer);
        },

        buildStart() {
            plugin._modules = [];
            // pending resolves
            plugin._resolves = {};
        },

		resolveId(importee, importer) {
            console.log('resolve', importee, importer);

            // external modules (non-entry modules that start with neither '.' or '/')
            // are skipped at this stage.
            if (importer === undefined) {
                return null;
            }
            if (path.isAbsolute(importee) || importee[0] === '.') {
                const modulesPath = path.resolve(importee);
                return plugin._resolves[modulesPath] || plugin.addModule(importee, modulesPath);
            }

            return plugin._opts._boardJSON.then(boardJSON => {
                if (boardJSON.info.builtin_modules.indexOf(importee) >= 0) {
                    // console.log('built-in', importee);
                    return false;
                }

                // check for modules/x.js
                const modulesPath = path.resolve('./modules', importee + '.js');

                return plugin._resolves[modulesPath] = plugin._resolves[modulesPath] || new Promise((resolvePromise, reject) => {
                    const resolve = (filename) =>
                        resolvePromise(options.mergeModules ? filename : false);

                    plugin.addModule(importee, modulesPath);

                    fs.stat(modulesPath, function (err, stat) {
                        if (!err) {
                            resolve(modulesPath)
                            return;
                        }

                        console.log(`fetching ${importee}...`);
                        tools.fetchEspruinoModule(importee, options, (err, source) => {
                            if (err) {
                                reject(err);
                                return;
                            }

                            console.log('...resolved', importee);
                            fs.writeFile(modulesPath, source, 'utf8', err => err
                                ? reject(err)
                                : resolve(modulesPath));
                        });
                    });
                });
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
                contents.code = contents.code
                    .replace(/,?\s*ESPRUINO_ROLLUP_MAIN\(\s*\(\)\s*=>\s*\{\s*onInit\(\);?\s*\}\s*\)/m, '');
                contents.code =
                    plugin.stringifyCachedModules(spacer) +
                    (options.minify ? '' : spacer+spacer) +
                    contents.code;
            });
        }
    };
    return plugin;
};

module.exports = espruinoModules;
