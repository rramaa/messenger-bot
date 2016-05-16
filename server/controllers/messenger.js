'use strict';
let apiService = require('../models/apiService'),
    messageService = require('../models/messageService'),
    config = require('../../config'),
    messenger = {};

messenger.get = function(req, res, next) {
    if (req.query['hub.verify_token']) {
        if (req.query['hub.verify_token'] === config.verifyToken) {
            res.send(req.query['hub.challenge']);
        } else {
            res.send("Error, wrong validation token");
        }
    } else if (req.query['subscribe_to_webhook']) {
        if (req.query['subscribe_to_webhook'] === config.pageAccessToken) {
            apiService.post({
                url: config.apis.subscribePage,
                qs: {
                    access_token: config.pageAccessToken
                }
            }).then((result) => {
                res.setHeader("Content-Type", "application/json");
                res.send(result);
            }, (err) => {
                res.setHeader("Content-Type", "application/json");
                res.send(err);
            })
        } else {
            res.sendStatus(401);
        }
    } else {
        res.send(req.body);
    }
}

messenger.post = function(req, res, next) {
    let facebookMessages = [],
        flag = 1;
    if (typeof req.body === 'object') {
        facebookMessages = messageService.parseReceivedMessage(req.body) || [];
        console.log(JSON.stringify(facebookMessages, undefined, 4));
        let arr = [];
        for (let message of facebookMessages) {
            if (message.type === 'message-received') {
                flag = 0;
                arr.push(apiService.post({
                    url: config.apis.sendMessage,
                    qs: {
                        access_token: config.pageAccessToken
                    },
                    json: messageService.createNewMessage(message, "FD")
                }).then((result) => {
                    console.log(result);
                }, (err) => {
                    console.log(err);
                }))
            } else {
                res.send("fddok");
            }
        }
        Promise.all(arr).then((result) => {
            res.send("multiple");
        }, (err) => {
            res.send("multiple error");
        })
    } else {
        if (flag === 1) {
            res.send("Please resend request")
        }
    }
}

module.exports = messenger;
