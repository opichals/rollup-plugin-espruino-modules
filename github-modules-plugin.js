const path = require('path');
const fs = require('fs');
const tools = require('./espruino-tools');

function gitHubModules(options) {
	const plugin = {
        name: 'github-modules',

        buildStart() {
            // pending resolves
            plugin._resolves = {};
        },

        resolveId(importee, importer) {
            // console.log('[github] resolve', importee, importer);

            var match = importee && importee.match(/^https?:\/\/github.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.*)$/);
            if (!match) {
                return null;
            }

            var git = {
                owner : match[1],
                repo : match[2],
                branch : match[3],
                path : match[4]
            };

            var url = "https://raw.githubusercontent.com/"+git.owner+"/"+git.repo+"/"+git.branch+"/"+git.path;
            importee = git.owner+"/"+git.repo+"/"+git.branch+"/"+git.path;
            importee = 'github_'+importee.replace(/\//g, '-');

            return plugin._resolves[importee] = plugin._resolves[importee] || new Promise((resolve, reject) => {
                // check for modules/x.js
                const modulesPath = path.resolve('./modules', importee);
                fs.stat(modulesPath, function (err, stat) {
                    if (!err) {
                        resolve(modulesPath);
                        return;
                    }

                    console.log(`[github] fetching ${url}...`);
                    tools.httpGET(url, (err, source) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        console.log(`[github] ...resolved ${url}`);
                        fs.writeFile(modulesPath, source, 'utf8', err => err
                            ? reject(err)
                            : resolve(modulesPath));
                    });
                });
            });
        },
    };
    return plugin;
};

module.exports = gitHubModules;

