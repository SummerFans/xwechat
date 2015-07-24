
var http        = require('http');
var https       = require('https');
var debug       = require('debug')('interface:http');

var HttpRequest = module.exports = {};


HttpRequest.get=function(opts,cb){

  if (!(opts.path))
    return cb({msg : 'missing parameters', path : opts.path});

  var options = {
    hostname : 'api.weixin.qq.com',
    path     : opts.path,
    method   : 'GET',
    port     : opts.port||80,
  };

  var client = (options.port == 443) ? https : http;


  var timeout = setTimeout(function() {
    cb({msg : 'Connection timed out ' + opts.url, success:false});
  }, 7000);

  var req = client.request(options, function(res){
    var dt = '';

    res.on('data', function (chunk) {
      dt += chunk;
    });

    res.on('end',function(){
      clearTimeout(timeout);
      try {
        cb(null, JSON.parse(dt));
      } catch(e) {
        cb(e);
      }
    });

    res.on('error', function(e){
      clearTimeout(timeout);
      cb(e);
    });
  });

  req.on('error', function(e) {
    clearTimeout(timeout);
    cb(e);
  });

  req.end();

}





HttpRequest.post = function(opts, cb) {
  if (!(opts.data && opts.path))
    return cb({msg : 'missing parameters',data : opts.data, path : opts.path});

  //var port = 0;

  var options = {
    hostname : 'api.weixin.qq.com',
    path     : opts.path,
    method   : 'POST',
    port     : opts.port||80,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(JSON.stringify(opts.data))
    }
  };

  var client = (options.port == 443) ? https : http;

  var timeout = setTimeout(function() {
    cb({msg : 'Connection timed out ' + opts.url, success:false});
  }, 7000);

  var req = client.request(options, function(res){
    var dt = '';

    res.on('data', function (chunk) {
      dt += chunk;
    });

    res.on('end',function(){
      clearTimeout(timeout);
      try {
        cb(null, JSON.parse(dt));
      } catch(e) {
        cb(e);
      }
    });

    res.on('error', function(e){
      clearTimeout(timeout);
      cb(e);
    });
  });

  req.on('error', function(e) {
    clearTimeout(timeout);
    cb(e);
  });

  req.write(JSON.stringify(opts.data));

  req.end();
};
