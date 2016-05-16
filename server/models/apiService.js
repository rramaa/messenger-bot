"use strict";
let request = require('request'),
    logger = require('../logger'),
    apiService = {};

let _request = function(options, target) {
    return new Promise(function(resolve, reject) {
        let requestObj = {};
        if(options.form) requestObj.form = options.form;
        if(options.auth) requestObj.auth = options.auth;
        if(options.qs) requestObj.qs = options.qs;
        if(options.json) requestObj.json = options.json;
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
    return _request(options, target);
}

apiService.post = function(options, target){
    options.method = "post";
    return _request(options, target);
}

module.exports = apiService;
