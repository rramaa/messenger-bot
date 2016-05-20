'use strict';
let chat = {},
    apiService = require('./apiService'),
    config = require('../../config'),
    messageService = require('./messageService'),
    connections = {},
    timerFlag = false, //set to true if timer is running
    io = require('socket.io-client');

let connResetter = function() {
    let time = Date.now();
    timerFlag = true;
    for (let key in connections) {
        if (time - connections[key].lastUpdated > 1000*60) {
            console.log(`${key} has left`);
            connections[key].socket.disconnect();
            delete connections[key];
        }
    }
    setTimeout(connResetter, 1000);
}
if (timerFlag === false) {
    connResetter();
}

function _setupSocketConnection() {
    return io.connect(process.env.SOCKET_ADDRESS);
}

function _sendMessageToAgent(socket, messageData) {
    socket.emit('new-message-for-agent', {
        message: messageData.text,
        deliveryId: messageData.senderId,
        index: messageData.seq
    });
    _updateLastActiveTime(messageData.senderId);
}

function _joinUser(socket, senderId) {
    return new Promise((resolve, reject) => {
        connections[senderId] = {
            socket: socket,
            lastUpdated: Date.now(),
            confirmData: {}
        };
        socket.emit("join-user", {
            deliveryId: senderId,
            joinedTime: new Date(),
            acquired: false,
            acquiredBy: undefined,
            location: "Facebook user",
            detected: false,
            type: 'facebook',
            name: '',
            isClosed: false,
            canClose: false
        }, (response) => {
            if (response.error) {
                reject(response);
            } else {
                resolve(response);
            }
        })
    })
}

function _updateLastActiveTime(senderId){
    connections[senderId].lastUpdated = Date.now();
}

function _setupListeners(socket, senderId) {
    socket.on('new-message-for-user', (data) => {
        connections[senderId].confirmData = data;
        chat.sendMessageToUser(data);
    });
}

chat.sendMessageToAgent = function(messageData) {
    let senderId = messageData.senderId;
    if (connections[senderId]) {
        //ongoing chat
        let conn = connections[senderId];
        if (messageData.type == 'message-received') {
            //new message received
            let socket = conn.socket;
            _sendMessageToAgent(socket, messageData);
        } else if (messageData.type == 'message-delivered') {
            //acknowledgement for message delivered to facebook user
            let socket = conn.socket;
            // _updateLastActiveTime(messageData.senderId);
            socket.emit('user-confirms-agent', conn.confirmData);
        }
    } else {
        //new user --> setup new socket and listeners
        console.log(`${senderId} connecting for the first time`);
        if (messageData.type == 'message-received') {
            //new message received for first time
            let socket = _setupSocketConnection();
            _joinUser(socket, senderId).then((result) => {
                _setupListeners(socket, messageData.senderId);
                chat.sendMessageToUser({ deliveryId: senderId, message: "An agent will get in touch with you in a moment." });
                _sendMessageToAgent(socket, messageData);
            }, (err) => {
                chat.sendMessageToUser({ deliveryId: senderId, message: "We are facing a temporary error. Please connect with us a little while later." });
            });
        }
    }
}

chat.sendMessageToUser = function(data) {
    apiService.post({
        url: config.apis.sendMessage,
        qs: {
            access_token: config.pageAccessToken
        },
        json: messageService.createNewMessage({ senderId: data.deliveryId }, data.message)
    }).then((result) => {
        console.log("message sent");
    }, (err) => {
        console.log("message not sent", err);
    })
}

module.exports = chat;
