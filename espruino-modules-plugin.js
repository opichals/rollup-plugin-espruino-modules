const path = require('path');
const fs = require('fs');
const tools = require('./espruino-tools');

function espruinoModules(options) {
	const plugin = {
        name: 'espruino-modules',
        options: function(opts) {
            plugin._opts = opts;
            plugin._opts._input = path.resolve(opts.input);

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
                    tools.fetchEspruinoBoardJSON(boardName, (err, contents) => {
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

		resolveId(importee, importer) {
            // console.log('resolve', importee, importer);

            // external modules (non-entry modules that start with neither '.' or '/')
            // are skipped at this stage.
            if (importer === undefined || path.isAbsolute(importee) || importee[0] === '.') return null;

            return plugin._opts._boardJSON.then(boardJSON => {
                if (boardJSON.info.builtin_modules.indexOf(importee) >= 0) {
                    // console.log('built-in', importee);
                    return false;
                }

                return new Promise((resolve, reject) => {
                    // check for modules/x.js
                    const modulesPath = path.resolve('./modules', importee + '.js');
                    fs.stat(modulesPath, function (err, stat) {
                        if (!err) {
                            resolve(modulesPath);
                            return;
                        }

                        console.log(`fetching ${importee}...`);
                        tools.fetchEspruinoModule(importee, (err, source) => {
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
            Object.entries(bundle).forEach(([name, contents]) => {
                contents.code = contents.code
                    .replace(/,?\s*ESPRUINO_ROLLUP_MAIN\(\s*\(\)\s*=>\s*\{\s*onInit\(\);?\s*\}\s*\)/m, '');
            });
        }
    };
    return plugin;
};

module.exports = espruinoModules;
