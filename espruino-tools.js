const https = require('https');

const httpGetUrl = (url) => new Promise((resolve, reject) => https.get(url, res => {
    const { statusCode } = res;

    let error;
    if (statusCode !== 200) {
        error = new Error(`Getting ${url}\nStatus Code: ${statusCode}`);
    }
    if (error) {
        res.resume();
        reject(error);
        return;
    }

    let rawData = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('error', err => reject(err));
    res.on('end', () => resolve(rawData));
}));

const httpGET = (url, options) => {
    const getURL = options.externals && options.externals.getURL;
    return getURL ? getURL(url) : httpGetUrl(url);
};

const fetchEspruinoBoardJSON = (boardName, options) => {
    const boardJsonUrl = options.job.BOARD_JSON_URL || "http://www.espruino.com/json";
    return httpGET(`${boardJsonUrl}/${boardName}.json`, options);
};

const fetchEspruinoModule = (moduleName, options) => {
    const getModule = options.externals && options.externals.getModule;
    if (getModule) {
        return getModule(moduleName);
    }

    const moduleUrl = options.job.MODULE_URL || 'https://www.espruino.com/modules';
    const moduleExts = options.job.MODULE_EXTENSIONS.split('|')
        .filter(ext => !(options.minifyModules === false && ext.match('min.js')));

    const fetchModule = exts => {
        const ext = exts.shift();
        return httpGET(`${moduleUrl}/${moduleName}${ext}`, options).catch(err => {
            if (exts.length) {
                return fetchModule(exts);
            }
            throw err;
        });
    }

    return fetchModule(moduleExts);
};


module.exports = {
    httpGET,
    fetchEspruinoBoardJSON,
    fetchEspruinoModule
};
