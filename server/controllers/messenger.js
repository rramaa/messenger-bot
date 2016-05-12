'use strict';
let messenger = {}

messenger.get = function(req, res, next){
	if(req.query['hub.verify_token']){
		if(req.query['hub.verify_token'] === process.env.VERIFY_TOKEN){
			res.send(req.query['hub.challenge']);
		} else {
			res.send("Error, wrong validation token");
		}
	} else {
		//messages handling
		res.send("message handling");
	}
}

messenger.post = function(req, res, next){

}

module.exports = messenger;