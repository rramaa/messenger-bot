"use strict";
let request = require('request'),
    logger = require('../logger'),
    apiService = {};

apiService.request = function(options, target) {
    return new Promise(function(resolve, reject) {
        let requestObj = {};
        if(options.form) requestObj.form = options.form;
        if(options.auth) requestObj.auth = options.auth;
        if(options.method) requestObj.method = (options.method == "post") ? "post" : "get";
        if(options.url) requestObj.url = options.url;
        logger.info(`Fetching ${requestObj.url}`)
        if (target == undefined) {
            request(requestObj, function(err, httpResponse, body) {
                if (err == null) {
                    resolve(body);
                } else {
                    reject(err);
                }
            });
        }
    })
}

apiService.get = function(options, target){
    options.method = "get";
    return apiService.request(options, target);
}

module.exports = apiService;
