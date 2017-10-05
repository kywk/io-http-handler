'use strict';

/**
 * Module requirement
 */
let path = require('path');
let fs = require('fs');
let assert = require('assert');
let http = require('http');
let https = require('https');

let express = require('express');
let bodyParser = require('body-parser');
let compression = require('compression');
let methodOverride = require('method-override');
let errorhandler = require('errorhandler');
let morgan = require('morgan');
let timeout = require('connect-timeout');


module.exports = function(app, opts) {
  return new Http(app, opts);
};

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 3001;
const DEFAULT_ROOT = 'app/servers';


let createExpressLogger = function (logger) {
  return express.logger({
    format: 'short',
    stream: {
      write: function(str) {
        logger.debug(str);
      }
    },
  })
};

let defaultLogger = {
  debug:  console.log,
  info:   console.log,
  warn:   console.warn,
  error:  console.error
}


let Http = function (app, opts) {
  opts = opts || {};

  this.app = app;
  this.http = express();

  // self.logger.info('Http opts:', opts);
  this.host = opts.host || DEFAULT_HOST;
  this.port = opts.port || DEFAULT_PORT;
  this.route = opts.route || 'route';

  if (!!opts.isCluster) {
    let serverId = app.getServerId();
    let params = serverId.split('-');
    let idx = parseInt(params[params.length - 1], 10);

    if (/\d+\+\+/.test(this.port)) {
      this.port = parseInt(this.port.substr(0, this.port.length - 2));
    } else {
      assert.ok(false, 'http cluster expect http port format like "3000++"');
    }

    this.port = this.port + idx;
  }

  this.useSSL = !!opts.useSSL;
  this.sslOpts = {};
  if (this.useSSL) {
    this.sslOpts.key = fs.readFileSync(path.join(app.getBase(), opts.keyFile));
    this.sslOpts.cert = fs.readFileSync(path.join(app.getBase(), opts.certFile));
  }

  this.logger = opts.logger || defaultLogger;

  this.http.set('port', this.port);
  this.http.set('host', this.host);

  // express middleware configuration
  this.http.use(timeout('20s'));
  this.http.use(morgan(function (tokens, req, res) {
    let remoteAddr = req.get('X-Real-IP') || ('\x1b[33m' + tokens['remote-addr'](req) + '\x1b[0m');

    return [
    '[remoteAddr]>' + remoteAddr + ' ',
    '[date]:' + tokens.date(req, res, 'clf'),
    '[mothod]:' + tokens.method(req, res) + ' ',
    '[contentLength]:' + tokens.res(req, res, 'content-length'),
    '[respinseTime]:' + tokens['response-time'](req, res)+'ms',
    '[status]:' + tokens.status(req, res),
    '[url]:' + tokens.url(req, res)
    ].join('\t');
  }));

  this.http.use(bodyParser.json());
  this.http.use(bodyParser.urlencoded({ extended: false }));
  this.http.use(compression());
  this.http.use(methodOverride('X-HTTP-Method-Override'))

  // only use in development
  if (process.env.NODE_ENV === 'development') {
    this.http.use(errorhandler())
  }

  this.beforeFilters = require('../../index').beforeFilters;
  this.afterFilters = require('../../index').afterFilters;
  this.server = null;
};


Http.prototype.loadRoutes = function () {
  this.http.get('/', function(req, res) {
    res.send('io-http-handler ok!');
  });

  let routesPath = path.join(this.app.getBase(), 'app/servers', this.app.getServerType(), this.route);
  // self.logger.info(routesPath);
  assert.ok(fs.existsSync(routesPath), 'Cannot find route path: ' + routesPath);

  let self = this;
  fs.readdirSync(routesPath).forEach(function(file) {
    if (/.js$/.test(file)) {
      let routePath = path.join(routesPath, file);
      // self.logger.info(routePath);
      require(routePath)(self.app, self.http, self);
    }
  });
};


Http.prototype.start = function (cb) {
  let self = this;

  this.beforeFilters.forEach(function (elem) {
    self.http.use(elem);
  });

  this.loadRoutes();

  this.afterFilters.forEach(function (elem) {
    self.http.use(elem);
  });

  if (this.useSSL) {
    this.server = https.createServer(this.sslOpts, this.http).listen(this.port, this.host, function () {
      self.logger.info('Http start', self.app.getServerId(), 'url: https://' + self.host + ':' + self.port);
      self.logger.info('Http start success');
      process.nextTick(cb);
    });
  } else {
    this.server = http.createServer(this.http).listen(this.port, this.host, function () {
      self.logger.info('Http start', self.app.getServerId(), 'url: http://' + self.host + ':' + self.port);
      self.logger.info('Http start success');
      process.nextTick(cb);
    });
  }
};


Http.prototype.afterStart = function (cb) {
  this.logger.info('Http afterStart');
  process.nextTick(cb);
}


Http.prototype.stop = function (force, cb) {
  let self = this;
  this.server.close(function () {
    self.logger.info('Http stop');
    cb();
  });
}
