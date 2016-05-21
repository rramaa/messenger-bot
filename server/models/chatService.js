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
        if (time - connections[key].lastUpdated > 1000 * 60) {
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
    if (messageData.text) {
        socket.emit('new-message-for-agent', {
            message: messageData.text,
            deliveryId: messageData.senderId,
            index: messageData.seq
        });
    }
    _updateLastActiveTime(messageData.senderId);
}

function _joinUser(socket, senderId) {
    return new Promise((resolve, reject) => {
        connections[senderId] = {
            socket: socket,
            lastUpdated: Date.now(),
            messageConfirmation: {}
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

function _postMessage(data, message) {
    connections[data.deliveryId].messageConfirmation[Date.now()] = data;
    apiService.post({
        url: config.apis.sendMessage,
        qs: {
            access_token: config.pageAccessToken
        },
        json: message
    }).then((result) => {
        console.log("message sent", result);
    }, (err) => {
        console.log("message not sent", err);
    })
}

function _updateLastActiveTime(senderId) {
    connections[senderId].lastUpdated = Date.now();
}

function _setupListeners(socket, senderId) {
    socket.on('new-message-for-user', (data) => {
        connections[senderId].confirmData = data;
        chat.sendMessageToUser(data, socket);
    });

    socket.on('user-acquired', (data) => {
        connections[senderId].agentAssigned = data.userDetails;
        console.log(socket.json);
    })
}

function _acknowledgeMessage(socket, messageData, conn) {
    if (conn.messageConfirmation) {
        let sentDb = conn.messageConfirmation;
        for (let key in sentDb) {
            if (key < messageData.beforeTime) {
                socket.emit('user-confirms-agent', sentDb[key]);
                delete sentDb[key];
            }
        }
    }
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
            _acknowledgeMessage(socket, messageData, conn);
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

chat.sendMessageToUser = function(data, socket) {
    let message = {};
    if (data.appliedFilter) {
        let filter = data.filtered;
        if (filter === 'rating') {
            console.log(`Sending rating request to user`);
            message = messageService.createNewMessage({ senderId: data.deliveryId }, config.rating, "button")
        } else if(filter === 'email' || filter === "phone"){
            console.log(`Sending message to user: ${filter}`);
            message = messageService.createNewMessage({senderId: data.deliveryId}, JSON.parse(data.chatObj)[filter]);
        }
    } else {
        console.log(`Sending message to user: ${data.message}`);
        if(data.message.length > 320){
            _sendMessageToAgent(socket, {senderId:data.deliveryId, text: "Warning: Message length too long for facebook user", seq: "500"});
            console.warn("message length too long");
        }
        message = messageService.createNewMessage({ senderId: data.deliveryId }, data.message);
    }
    _postMessage(data, message);
}

module.exports = chat;
