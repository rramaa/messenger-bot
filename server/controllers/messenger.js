'use strict';
let apiService = require('../models/apiService'),
    messageService = require('../models/messageService'),
    chatService = require('../models/chatService'),
    logger = require('../logger'),
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
    let facebookMessages = [];
    if (typeof req.body === 'object') {
        facebookMessages = messageService.parseReceivedMessage(req.body) || [];
        logger.info(JSON.stringify(facebookMessages, undefined, 4));
        for (let message of facebookMessages) {
            chatService.sendMessageToAgent(message);
        }
        res.send("Message Received");
    } else {
        if (flag === 1) {
            res.send("Please resend request")
        }
    }
}

module.exports = messenger;
