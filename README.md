## browserify-persist-redis

`browserify-persist-redis` will cache intermediate browserify transforms in redis, leading to much faster [browserify](https://github.com/substack/node-browserify) builds.

After browserify processes all the transforms on a file, `browserify-persist-redis` will store the result in redis. The next time browserify needs to include that file in a bundle it can pull the previously calculated output from redis instead of reprocessing the file.

This is useful on a single machine, but it is especially useful in a CI environment where many different build servers can share this cache: A file will get processed on one server and cached in redis, and then every other server can take advantage of the cached result.

## Requirements

[redis](https://redis.io/) >= 2.6.12

[browserify](https://github.com/substack/node-browserify) >= 12.0.0 (because we need [module-deps](https://github.com/substack/module-deps) >= 4.1.0)

## Install
```bash
npm install browserify-persist-redis
```

### Getting Started

```javascript
const browserify = require('browserify');
const bpr = require('browserify-persist-redis')();

const bundle = browserify({
  persistentCache: bpr
});

bundle.add('./browser/main.js');
bundle.bundle().pipe(process.stdout);
```

## Options

An options object may be passed to browserify-persist-redis to modify its behavior.
```javascript
const options = {
  browserifyHash: require('browserify/package.json').version,
  ttl: 86400 * 28
};

const bpr = require('browserify-persist-redis')(options);
```
Valid options are:

* `browserifyHash` - This should uniquely identify the browserify configuration. If browserify is modified, such as a version upgrade, or different transforms are applied, then the cached output for a file should no longer be valid. This provides a way to distinguish between different configurations of browserify so that we can recalculate the output. This can be a string or an object. The default value is `'bfr'`. A good method is to pass an object of the versions of the transforms you are using:
  ```
  const browserifyHash = {
    browserify: require('browserify/package.json').version,
    babelify: require('babelify/package.json').version,
    reactify: require('reactify/package.json').version
  };
  ```
  when one of your transforms changes, so will `browserifyHash`, and the the old cached results will not be used.

* `redis` - Options related to the redis instance. This is passed directly to the ioredis constructor, see all options [here](https://github.com/luin/ioredis/blob/master/API.md#new-redisport-host-options). Some defaults are:
  * `host` - The default value is `'localhost`.
  * `port` - The default value is `'6379'`.
  * `keyPrefix` - A namespace for keys created by `browserify-persist-redis`. The default is `'bpr'`.
* `ttl` - How long (in seconds) a cached result should stay in redis before being automatically deleted. This expiration is refreshed every time a cached result is used, so entries will only be deleted after going this many seconds without being used. The default is two weeks (`86400 * 14`).


## License
MIT
