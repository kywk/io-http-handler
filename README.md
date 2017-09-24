pomelo-http-plugin
==================

Insout/pomelo http(s) handler plugin, wrap express as pomelo module.


[wiki][]
[wiki]: https://github.com/kywk/io-http-handler/wiki

How to use io-http-handler
--------------------------

### Single server ###

For example, your http server name is gamehttp.

#### Create config/http.json, configure your http server ####
``` js
{
  "development": {
    "gamehttp": {
      "host": "127.0.0.1",
      "port": 3001
    }
  }
}
```

If you want to support https, you should add more keys to config/http.json

``` js
{
  "development": {
    "gamehttp": {
      "useSSL": true,
      "keyFile": "config/key.pem",
      "certFile": "config/cert.pem",
      "host": "127.0.0.1",
      "port": 3001
    }
  }
}
```

#### Change servers.json, add gamehttp config ####
```js
"gamehttp": [{
  "id": "gamehttp",
  "port": 3002,
  "host": "127.0.0.1"
}]
```

#### Change adminServer.json, add server type config ####
```js
{
  "type": "gamehttp",
  "token": "agarxhqb98rpajloaxn34ga8xrunpagkjwlaw3ruxnpaagl29w4rxn"
}
```

#### Change app.js ####
``` js
var httpPlugin = require('pomelo-http-plugin');
var path = require('path');
app.configure('development', 'gamehttp', function() {
  app.loadConfig('httpConfig', path.join(app.getBase(), 'config/http.json'));
  app.use(httpPlugin, {
    http: app.get('httpConfig')[app.getServerId()]
  });
});
```

#### Create app/servers/gamehttp/route/testRoute.js ####
``` js
module.exports = function(app, http) {
  http.get('/test', function(req, res) {
    res.send('test success')
  });
};
```
#### Run your app and open url http://127.0.0.1:3001/test ####


### Server cluster ###

This example, we configure our http server as a server cluster, just have a little difference with the before example.

#### Create config/http.json, configure your http server ####
``` js
{
  "development": {
    "gamehttp": {
      "isCluster": true,
      "host": "127.0.0.1",
      "port": "3001++"
    }
  }
}
```

If you want to support https, you should add more keys to config/http.json

```js
{
  "development": {
    "gamehttp": {
      "useSSL": true,
      "keyFile": "config/key.pem",
      "certFile": "config/cert.pem",
      "isCluster": true,
      "host": "127.0.0.1",
      "port": "3001++"
    }
  }
}
```

#### Change servers.json, add gamehttp config ####
``` js
"gamehttp": [{
  "id": "gamehttp",
  "clusterCount": 2,
  "port": "3101++",
  "host": "127.0.0.1"
}]
```

#### Change adminServer.json, add server type config ####
``` js
{
  "type": "gamehttp",
  "token": "agarxhqb98rpajloaxn34ga8xrunpagkjwlaw3ruxnpaagl29w4rxn"
}
```

#### Change app.js ####
``` js
var httpPlugin = require('pomelo-http-plugin');
var path = require('path');

app.configure('development', 'gamehttp', function() {
  app.loadConfig('httpConfig', path.join(app.getBase(), 'config/http.json'));
  app.use(httpPlugin, {
    http: app.get('httpConfig')[app.getServerType()]
  });
});
```

#### Create app/servers/gamehttp/route/testRoute.js ####
``` js
module.exports = function(app, http) {
  http.get('/test', function(req, res) {
    res.send('test success')
  });
};
```

#### Run your app and open urls: http://127.0.0.1:3001/test, http://127.0.0.1:3002/test ####

__Optional, you can use nginx or any other similar program to reverse proxy the http port, just google it!__


## License ##

The MIT License (MIT)
Copyright (c) 2017 kywk

