'use strict';
let chat = {},
    apiService = require('./apiService'),
    config = require('../../config'),
    messageService = require('./messageService'),
    utilService = require('./utilService'),
    connections = {},
    timerFlag = false, //set to true if timer is running
    io = require('socket.io-client');

let connResetter = function() {
    let time = Date.now();
    timerFlag = true;
    for (let key in connections) {
        if (time - connections[key].lastUpdated > 1000 * 60) {
            console.log(`${key} has left`);
            _deleteConnection(key);
        }
    }
    setTimeout(connResetter, 1000);
}
if (timerFlag === false) {
    connResetter();
}

function _deleteConnection(id) {
    connections[id].socket.disconnect();
    delete connections[id];
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
            timer: null
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

function _postMessage(data, message, socket) {
    apiService.post({
        url: config.apis.sendMessage,
        qs: {
            access_token: config.pageAccessToken
        },
        json: message
    }).then((result) => {
        console.log("message sent", result);
        socket.emit('user-confirms-agent', data);
    }, (err) => {
        console.log("message not sent", err);
    })
}

function _reAssignAgent(senderId) {
    _deleteConnection(senderId);
    let socket = _setupSocketConnection();
    _joinUser(socket, senderId).then((result) => {
        _setupListeners(socket, senderId);
        console.log("Agent is reconnected");
        // chat.sendMessageToUser({ deliveryId: senderId, message: "We are back online" });
    })
}

function _updateLastActiveTime(senderId) {
    connections[senderId].lastUpdated = Date.now();
}

function _setupListeners(socket, senderId) {
    socket.on('connect', () => {
        console.info(`Socket connected for user ${senderIds}`);
    });

    socket.on('connectError', () => {
        console.info(`Socket error for user ${senderIds}`);
        chat.sendMessageToUser({ deliveryId: senderId, message: "We are facing a temporary error. Please connect with us a little while later." });
    });

    socket.on('agent-left', (data) => {
        //start timer
        connections[senderId].timer = setTimeout(() => {
            _reAssignAgent(senderId);
        }, 1000 * 20);
    })

    socket.on('acquire-again', (data) => {
        //end timer
        clearTimeout(connections[senderId].timer);
    })

    socket.on('agent-logs-out', (data) => {
        // chat.sendMessageToUser({ deliveryId: senderId, message: "We will be back soon." });
        console.log("Agent logs out");
        _reAssignAgent(senderId);
    })

    socket.on('new-message-for-user', (data) => {
        connections[senderId].confirmData = data;
        chat.sendMessageToUser(data, socket);
    });

    socket.on('update-close-users', (data) => {
        _deleteConnection(data.deliveryId);
    });

    socket.on('user-acquired', (data) => {
        connections[senderId].agentAssigned = data.userDetails;
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
            // _acknowledgeMessage(socket, messageData, conn);
        }
    } else {
        //new user --> setup new socket and listeners
        console.log(`${senderId} connecting for the first time`);
        if (messageData.type == 'message-received') {
            //new message received for first time
            let socket = _setupSocketConnection();
            _joinUser(socket, senderId).then((result) => {
                _setupListeners(socket, messageData.senderId);
                chat.sendMessageToUser({ deliveryId: senderId, message: "m will get in touch with you in a moment." });
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
        let chatObj = JSON.parse(data.chatObj);
        console.log(`Sending message to user: ${filter}`);
        switch (filter) {
            case 'email':
            case 'phone':
            case 'plainLink':
                let text = chatObj[filter] || chatObj.link;
                message = messageService.createNewMessage({ senderId: data.deliveryId }, text);
                break;
            case 'MAKAAN_PROJECT_OVERVIEW':
            case 'MAKAAN_PROPERTY_BUY':
            case 'MAKAAN_PROPERTY_RENT':
                message = messageService.createNewMessage({ senderId: data.deliveryId }, {
                    bubbles: [{
                        title: `${chatObj.locality}, ${chatObj.area}`,
                        subtitle: `${utilService.returnPrice(chatObj.price)}`,
                        item_url: `${process.env.MAKAAN_BASE}${chatObj.href || ""}`,
                        image_url: `${chatObj.image}`
                    }]
                }, 'generic')
                break;
            case 'MAKAAN_LOCALITY_RESIDENTIAL_BUY':
            case 'MAKAAN_LOCALITY_LISTING_RENT':
                message = messageService.createNewMessage({ senderId: data.deliveryId }, {
                    bubbles: [{
                        title: `${chatObj.label}`,
                        subtitle: `${chatObj.localityName || ""}, ${chatObj.cityName || ""}`,
                        image_url: `${chatObj.image}`,
                        item_url: `${process.env.MAKAAN_BASE}${chatObj.url || ""}`
                    }]
                }, 'generic');
                break;
            case 'MAKAAN_NEARBY_LISTING':
                message = messageService.createNewMessage({ senderId: data.deliveryId }, {
                    bubbles: [{
                        title: `${chatObj.label}`,
                        item_url: `${process.env.MAKAAN_BASE}${chatObj.url || ""}`,
                        image_url: `${chatObj.image}`
                    }]
                }, 'generic');
                break;
            case 'MAKAAN_LOCALITY_OVERVIEW':
                message = messageService.createNewMessage({ senderId: data.deliveryId }, {
                    bubbles: [{
                        title: `${chatObj.label}, ${chatObj.cityName}`,
                        subtitle: `${chatObj.cityName}`,
                        item_url: `${process.env.MAKAAN_BASE}${chatObj.url || ""}`,
                        image_url: `${chatObj.image}`
                    }]
                }, 'generic');
                break;
            case 'MAKAAN_CITY_LISTING_BUY':
            case 'MAKAAN_CITY_LISTING_RENT':
            case 'MAKAAN_SUBURB_LISTING_BUY':
                message = messageService.createNewMessage({ senderId: data.deliveryId }, {
                    bubbles: [{
                        title: `${chatObj.label}`,
                        subtitle: `${chatObj.cityName || ""}`,
                        image_url: `${chatObj.image}`,
                        item_url: `${process.env.MAKAAN_BASE}${chatObj.url || ""}`
                    }]
                }, 'generic');
                break;
            case 'rating':
                // console.log(`Sending rating request to user`);
                // message = messageService.createNewMessage({ senderId: data.deliveryId }, config.rating, "button")
                return;
            default:
                break;
        }
    } else {
        console.log(`Sending message to user: ${data.message}`);
        if (data.message.length > 320) {
            _sendMessageToAgent(socket, { senderId: data.deliveryId, text: "Warning: Message length too long for facebook user", seq: "500" });
            console.warn("message length too long");
        }
        message = messageService.createNewMessage({ senderId: data.deliveryId }, data.message);
    }
    _postMessage(data, message, socket);
}

module.exports = chat;
