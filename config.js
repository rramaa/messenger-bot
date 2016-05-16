var path = require('path'),
    config;

// config = {
//     verifyToken: "makaanMessengerDummyToken",
//     pageAccessToken: "EAAENniVqwyQBABAZCNQO4CtSM3FkPCGm2uWZCqi9vH24xjwLS0Lbwyty5StZAGIGGR5MoxT3hJhYYyRfd0wyqCuPooMgCCGaun2WdWOAkbp8ZCBv4Di3SdaD9yL289loZBU7wACHUoZAh8IltCRkctDNP0aHck5jhZCXC4gmVZAIkwZDZD"
// };

config = {
    verifyToken: "testing",
    pageAccessToken: "EAADsqRgS5XsBAIa8psrKg3FSDjV6X0rhgtGRfJrZCl9dU6pFZAram1SzCM9BPuPcSsgGVFzhgXb9eU9QapChki9nPWGHosn2XEuvJZBvJwmyNVCYcxhcLSdTBOoXknLKXlqiXglapo9jXqJwa0t1WjwhBOwGTRGwRvT58stLQZDZD",
    apis: {
    	sendMessage: "https://graph.facebook.com/v2.6/me/messages",
    	welcomeMessage: function(pageId) {
    		if (pageId){
    			return `https://graph.facebook.com/v2.6/${pageId}/thread_settings`;
    		} else {
    			return "";
    		}
    	},
    	userProfile: function(userId) {
    		if(userId){
    			return `https://graph.facebook.com/v2.6/${userId}`;
    		} else {
    			return "";
    		}
    	},
    	subscribePage: "https://graph.facebook.com/v2.6/me/subscribed_apps"
    }
};

// Export config
module.exports = config;
