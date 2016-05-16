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
                    let receipientId = (message && message.receipient && message.receipient.id);
                    let tempObj = {
                        pageId,
                        time,
                        senderId,
                        receipientId
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
    } else if(message.message){
    	//Message Received Callback
    	obj.seq = message.message.seq;
    	obj.mid = message.message.mid;
    	obj.timestamp = message.timestamp;
    	obj.type = "message-received";
    	if(message.message.text){
    		//text message received
    		obj.text = message.message.text;
    	} else if(message.message.attachments){
    		//attachments received
    		//attachments maybe image/video/location/smiley/gif/audio
    		//Check by key: type
    		obj.attachments = message.message.attachments;
    	}
    } else if(message.delivery){
    	//Message delivered Callback
    	obj.messagesDelivered = message.delivery.mids;
    	obj.beforeTime = message.delivery.watermark;
    	obj.timestamp = message.timestamp;
    	obj.seq = message.delivery.seq;
    	obj.type = "message-delivered";
    } else if(message.postback){
    	//Postback Callback
    	obj.timestamp = message.timestamp;
    	obj.postback = message.postback.payload;
    	obj.type = "postback";
    }
    return obj;
}

message.createNewMessage = function(type, ref, params){
	switch(type){
		case "generic":
			return _genericTemplate(ref, params);
			break;
		case "receipt":
			return _receiptTemplate(ref, params);
			break;
		case "button": 
			return _buttonTemplate(ref, params);
			break;
		case "image":
			return _imageAttachment(ref, params);
			break;
		case "text":
		default: 
			return _textMessage(ref, params);
			break;
	}
}

function _textMessage(ref, params){

}

module.exports = message;
