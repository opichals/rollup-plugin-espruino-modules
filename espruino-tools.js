const https = require('https');

const httpGET = (url, callback) => https.get(url, res => {
    const { statusCode } = res;

    let error;
    if (statusCode !== 200) {
        error = new Error(`Getting ${url}\nStatus Code: ${statusCode}`);
    }
    if (error) {
        res.resume();
        callback(error);
        return;
    }

    let rawData = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('error', err => callback(err));
    res.on('end', () => callback(null, rawData));
});

const fetchEspruinoBoardJSON = function(boardName, options, callback) {
    const boardJsonUrl = options.job.BOARD_JSON_URL || "http://www.espruino.com/json";
    httpGET(`${boardJsonUrl}/${boardName}.json`, callback);
};

const fetchEspruinoModule = function(moduleName, options, callback) {
    const moduleUrl = options.job.MODULE_URL || 'https://www.espruino.com/modules';
    const moduleExts = options.job.MODULE_EXTENSIONS.split('|')
        .filter(ext => !(options.minifyModules === false && ext.match('min.js')));

    function fetchModule(exts, cb) {
        const ext = exts.shift();
        httpGET(`${moduleUrl}/${moduleName}${ext}`, (err, code) => {
            if (err && exts.length) {
                fetchModule(exts, cb);
                return;
            }
            cb(err, code);
        });
    }

    fetchModule(moduleExts, callback);
};


module.exports = {
    httpGET,
    fetchEspruinoBoardJSON,
    fetchEspruinoModule
};
