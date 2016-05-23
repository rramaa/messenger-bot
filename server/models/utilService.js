'use strict';
let utils = {};

utils.returnPrice = function(val) {
    val = parseInt(val);
    if (val >= 10000000) val = `${(val / 10000000).toFixed(2)} Cr`;
    else if (val >= 100000) val = `${(val / 100000).toFixed(2)} L`;
    else if (val >= 1000) val = `${(val / 1000).toFixed(2)} K`;
    return val;
}

module.exports = utils;
