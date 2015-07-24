var events = require('events'),
	emitter = new events.EventEmitter(),
	redis = require('redis'),
	xml2js = require('xml2js'),
	crypto = require('crypto'),
	r = require('./HttpRequest');


/**
 * xwechat初始配置
 * @param {Object} opts      [微信信息配置]
 * @param {Object} redisConf [redis参数配置]
 */
var XWechat = function(opts, redisConf) {
	_self = this;

	_self.AppId = opts.AppId ? opts.AppId : null;
	_self.AppSecret = opts.AppSecret ? opts.AppSecret : null;
	_self.Token = opts.Token ? opts.Token : null;

	_self.reids = redis.createClient(redisConf.port, redisConf.host, {});


	_self.tokenKey = 'AccessTokenKey';
	_self.ticketkey = 'TickitKey';

};


/**
 * 判断返回数据是否成功
 * @param  {Object}   data     [请求数据对象]
 * @param  {Function} callback [结果]
 */
XWechat.prototype.errorCode = function(data, callback) {


	if (data.errcode && data.errcode != 0) {
		callback(data);
		return false;
	}

	callback(null, data);


}

/**
 * 获取微信accessToken
 * @param  {Function} callback [返回accessToken]
 */
XWechat.prototype.getAccessToken = function(callback) {

	if (XWechat.AppId && AppSecret) throw new Error('not AppId or AppSecret');

	_self.reids.get(_self.tokenKey, function(err, resultTonken) {
		if (resultTonken) {
			try {
				callback(null, JSON.parse(resultTonken));
			} catch (e) {
				callback(e);
			}
			return false;
		}

		r.get({
				port: 443,
				path: '/cgi-bin/token?grant_type=client_credential&appid=' + _self.AppId + '&secret=' + _self.AppSecret
			},
			function(err, result) {
				//校验是否错误
				_self.errorCode(result, function(err, result) {
					if (err) {
						callback(err)
						return false;
					};

					_self.reids.set(_self.tokenKey, JSON.stringify(result));
					_self.reids.expire(_self.tokenKey, 7200);

					callback(null, result);
				})

			})
	})

}

/**
 * 获取Ticket
 * @return {[type]} [返回值]
 */
XWechat.prototype.getTicket = function(callback) {

	_self.reids.get(_self.ticketkey, function(err, resultTicket) {

		if (err) {
			callback(err);
			return false;
		}

		if (resultTicket) {
			try {
				callback(null, JSON.parse(resultTicket));
			} catch (e) {
				callback(e);
			}
			return false;
		}

		_self.getAccessToken(function(err, resultTonken) {
			if (err) {
				callback(err);
				return false;
			}
			r.get({
				path: '/cgi-bin/ticket/getticket?access_token=' + resultTonken.access_token + '&type=wx_card',
				port: 443
			}, function(err, result) {
				if (err) {
					callback(err);
					return false;
				}
				_self.errorCode(result, function(err, resultData) {


					if (err) {
						callback(err)
						return false;
					};

					_self.reids.set(_self.ticketkey, JSON.stringify(resultData));
					_self.reids.expire(_self.ticketkey, 7200);

					callback(null, result);
				})
			})
		})

	})

}

/**
 * 获取Signature
 * @param  {String}   url      [请求页面的url地址]
 * @param  {Function} callback [返回值]
 */
XWechat.prototype.getSign = function(url, callback) {

	// 计算签名
	_self.calcSignature = function(ticket, noncestr, timestamp, url) {
		var str = 'jsapi_ticket=' + ticket + '&noncestr=' + noncestr + '&timestamp=' + timestamp + '&url=' + url;

		var sha1 = crypto.createHash('sha1'),
			sha1Str = sha1.update(str).digest('hex');

		return sha1Str;
	};


	_self.getTicket(function(err, result) {
		if (err) {
			callback(err);
			return false;
		}

		var nonceStr = Math.random().toString(36).substr(2, 15),
			timestamp = parseInt(new Date().getTime() / 1000),
			ticket = result.ticket,
			signature = _self.calcSignature(ticket, nonceStr, timestamp, url),
			_sign = {
				nonceStr: nonceStr,
				appid: _self.AppId,
				timestamp: timestamp,
				signature: signature,
				url: url
			};

		callback(null, _sign);

	})

}


/**
 * 创建菜单
 * @param  {Object}   data     [菜单数据]
 * @param  {Function} callback [返回值]
 */
XWechat.prototype.createMeun = function(data, callback) {

	//https://api.weixin.qq.comACCESS_TOKEN

	_self.getAccessToken(function(err, resultAccessToken) {
		if (err) {
			callback(err);
			return false;
		};

		r.post({
			path: '/cgi-bin/menu/create?access_token=' + resultAccessToken.access_token,
			port: 443,
			data: data

		}, function(err, result) {
			if (err) {
				callback(err);
				return false;
			}

			callback(null, result);

		})


	})

}

/**
 * 查询菜单内容
 * @param  {Function} callback [返回值]
 */
XWechat.prototype.queryMeun = function(callback) {

	_self.getAccessToken(function(err, resultAccessToken) {
		if (err) {
			callback(err);
			return false;
		};

		r.get({
			port: 443,
			path: '/cgi-bin/menu/get?access_token=' + resultAccessToken.access_token

		}, function(err, result) {

			if (err) {
				callback(err);
				return false;
			}

			//校验是否错误
			_self.errorCode(result, function(err, result) {
				if (err) {
					callback(err);
					return false;
				}

				callback(null, result);
			})


		})
	})
}

/**
 * 删除菜单
 * @param  {Function} callback [返回值]
 */
XWechat.prototype.removeMeun = function(callback) {
	_self.getAccessToken(function(err, resultAccessToken) {

		if (err) {
			callback(err);
			return false;
		}

		r.get({
			port: 443,
			path: '/cgi-bin/menu/delete?access_token=' + resultAccessToken.access_token
		}, function(err, result) {
			if (err) {
				callback(err);
				return false;
			}

			callback(null, result);
		})

	})
}



/**
 * XML to JSON  解析器
 * @param  {String} xml [传入xml值]
 */
XWechat.prototype.toJSON = function(xml) {
	var msg = {};
	xml2js.parseString(xml, function(err, result) {
		if (!result) {
			return 'xml parseString error';
		}

		var data = result.xml;
		msg.ToUserName = data.ToUserName[0];
		msg.FromUserName = data.FromUserName[0];
		msg.CreateTime = data.CreateTime[0];
		msg.MsgType = data.MsgType[0];

		switch (msg.MsgType) {
			case 'text':
				msg.Content = data.Content[0];
				msg.MsgId = data.MsgId[0];

				emitter.emit('text', msg);
				break;
			case 'image':
				msg.PicUrl = data.PicUrl[0];
				msg.MsgId = data.MsgId[0];
				msg.MediaId = data.MediaId[0];

				emitter.emit('image', msg);
				break;
			case 'event':
				msg.Event = data.Event[0];
				msg.EventKey = data.EventKey[0];

				emitter.emit('event', msg);
				break;
		}
	})

	return msg;

}

/**
 * JSON to XML 解析器
 * @param  {Object} object [传入Object]
 */
XWechat.prototype.toXML = function(object) {

}


/**
 * 接收文本消息
 * @param  {Function} callback [返回值]
 */
XWechat.prototype.clientText = function(callback) {
	emitter.on('text', callback);
	return this;
}

/**
 * 接收图片消息
 * @param  {Function} callback [返回值]
 */
XWechat.prototype.clientImage = function(callback) {
	emitter.on('image', callback);
	return this;
}

/**
 * 接收事件消息
 * @param  {Function} callback [返回值]
 */
XWechat.prototype.clientEvent = function(callback) {
	emitter.on('event', callback);
	return this;
}



module.exports = XWechat;