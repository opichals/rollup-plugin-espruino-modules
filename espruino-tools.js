const https = require('https');

const httpGET = (url, callback) => https.get(url, res => {
    const { statusCode } = res;

    let error;
    if (statusCode !== 200) {
        error = new Error('Request Failed.\nStatus Code: ' + statusCode);
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

const fetchEspruinoBoardJSON = function(boardName, callback) {
    httpGET(`https://www.espruino.com/json/${boardName}.json`, callback);
};

const fetchEspruinoModule = function(moduleName, callback) {
    httpGET(`https://www.espruino.com/modules/${moduleName}.js`, callback);
};


module.exports = {
    httpGET,
    fetchEspruinoBoardJSON,
    fetchEspruinoModule
};
