'use strict';
let dbService = require('./dbService'),
 	messageParserService = require('./messageParserService'),
 	chatService = require('./chatService'),
    apiService = require('./apiService'),

module.exports = {
    apiService,
    db,
    messageParserService
};