'use strict';
let message = {};

message.parseReceivedMessage = function(obj) {
    let messages = [];
    if (obj.object === 'page' && obj.entry instanceof Array) {
        for (let pageEntry of obj.entry) {
            let pageId = pageEntry.id,
                time = pageEntry.time;
            if (pageEntry.messaging instanceof Array) {
                for (let message of pageEntry.messaging) {
                    let senderId = (message && message.sender && message.sender.id);
                    let recipientId = (message && message.recipient && message.recipient.id);
                    let tempObj = {
                        pageId,
                        time,
                        senderId,
                        recipientId
                    }
                    tempObj = _parseTypeOfMessage(message, tempObj);
                    messages.push(tempObj);
                }
            }
        }
    }
    return messages;
}

function _parseTypeOfMessage(message, obj) {
    if (message.optin) {
        //Authentication Callback
        obj.refParam = message.optin.ref;
        obj.timestamp = message.timestamp;
        obj.type = "auth";
    } else if (message.message) {
        //Message Received Callback
        obj.seq = message.message.seq;
        obj.mid = message.message.mid;
        obj.timestamp = message.timestamp;
        obj.type = "message-received";
        if (message.message.text) {
            //text message received
            obj.text = message.message.text;
        } else if (message.message.attachments) {
            //attachments received
            //attachments maybe image/video/location/smiley/gif/audio
            //Check by key: type
            obj.attachments = message.message.attachments;
        }
    } else if (message.delivery) {
        //Message delivered Callback
        obj.messagesDelivered = message.delivery.mids;
        obj.beforeTime = message.delivery.watermark;
        obj.timestamp = message.timestamp;
        obj.seq = message.delivery.seq;
        obj.type = "message-delivered";
    } else if (message.postback) {
        //Postback Callback
        obj.timestamp = message.timestamp;
        obj.postback = message.postback.payload;
        obj.type = "postback";
    }
    return obj;
}

/**
 * @param  {Object} ref: The parsed message which is being replied to
 * @param  {Object} params: Params as defined by the type of message
 * @return {Object} Object in a format which can be parsed by facebook
*/
message.createNewMessage = function(ref, params, type) {
    switch (type) {
        case "generic":
            return _genericTemplate(ref, params);
            break;
        case "receipt":
            return _receiptTemplate(ref, params);
            break;
        case "button":
            return _buttonTemplate(ref, params);
            break;
        case "attachment":
            return _attachment(ref, params);
            break;
        case "text":
        default:
            return _textMessage(ref, params);
            break;
    }
}


/**
 * @param  {Object} ref: The parsed message which is being replied to
 * @param  {Object} params: The TEXT which is to be sent.
 * @return {Object} Object in a format which can be parsed by facebook
*/
function _textMessage(ref, params) {
    return {
        recipient: {
            id: ref.senderId
        },
        message: {
            text: (typeof params === 'string') ? params : (params && params.text) || ref.text || "Hi"
        }
    }
}

/**
 * @param  {Object} ref: The parsed message which is being replied to
 * @param  {Object} params: The type of attachment and its URL/PAYLOAD as required
 * @return {Object} Object in a format which can be parsed by facebook
 * only image supported by facebook for now
*/
function _attachment(ref, params) {
    let obj = {
        recipient: {
            id: ref.senderId
        },
        message: {
            attachment: {
                type: params.type || "image",
                payload: {}
            }
        }
    }
    if (obj.message.attachment.type === "image" || obj.message.attachment.type === "video" || obj.message.attachment.type === "audio") {
        obj.message.attachment.payload.url = params.url || "";
    } else if (obj.message.attachment.type === 'location') {
        obj.message.attachment.payload = {
            coordinates: {
                lat: params.lat || 0,
                long: params.long || 0
            }
        }
    }
    return obj;
}

/**
 * @param  {Object} ref: The parsed message which is being replied to
 * @param  {Object} params: An array of buttons containing TITLE, TYPE and PAYLOAD/URL as required
 * @return {Object} Object in a format which can be parsed by facebook
*/
function _buttonTemplate(ref, params) {
    let obj = {
        recipient: {
            id: ref.senderId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: params.text || "",
                    buttons: []
                }
            }
        }
    };
    _createButtons(params.buttons, obj.message.attachment.payload.buttons);
    return obj;
}

/**
 * @param  {Object} ref: The parsed message which is being replied to
 * @param  {Object} params: An array of bubbles containing TITLE, subtitle, item_url, image_url, and buttons
 * @return {Object} Object in a format which can be parsed by facebook
 * image dimensions: 1.91:1
*/
function _genericTemplate(ref, params){
    let obj = {
        recipient: {
            id: ref.senderId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: []
                }
            }
        }
    };
    if(params.bubbles instanceof Array){        
        for(let bubble of params.bubbles){
            let bubbleObj = {};
            bubbleObj.title = bubble.title || "Title";
            bubbleObj.subtitle = bubble.subtitle;
            bubbleObj.item_url = bubble.item_url;
            bubbleObj.image_url = bubble.image_url;
            if(bubble.buttons instanceof Array){
                bubbleObj.buttons = [];
                _createButtons(bubble.buttons, bubbleObj.buttons)
            }
            obj.message.attachment.payload.elements.push(bubbleObj);
        }
    };
    console.log(JSON.stringify(obj, undefined, 4));
    return obj;
}

function _receiptTemplate(ref, params) {
    return _textMessage(ref, "Under Construction");
}

function _createButtons(source, target) {
    if (source instanceof Array) {
        for (let btn of source) {
            let tmpButton = {};
            tmpButton.title = btn.title;
            tmpButton.type = btn.type || "postback";
            if (tmpButton.type === 'postback') {
                tmpButton.payload = btn.payload
            } else {
                tmpButton.url = btn.url
            }
            target.push(tmpButton);
        }
    }
}

module.exports = message;
