var crypto = require('crypto');
var objectAssign = require('object-assign');
var Promise = require('bluebird');
var Redis = require('ioredis');
var fs = Promise.promisifyAll(require('fs'));

function createHash(input) {
  return crypto.createHash('sha1').update(input).digest('hex');
}

module.exports = function redisCache(options) {
  var defaults = {
    browserifyHash: 'bpr',
    redis: {
      host: 'localhost',
      keyPrefix: 'bpr',
      port: 6379
    },
    ttl: 86400e3 * 14 //two weeks
  };

  options = objectAssign(defaults, options);

  if (typeof options.browserifyHash !== 'string') {
    options.browserifyHash = JSON.stringify(options.browserifyHash);
  }

  var cache = {};
  var client = new Redis(options.redis);

  return function(filePath, id, pkg, fallback, cb) {
    if (!cache[filePath]) {
      var getFileData = fs.readFileAsync(filePath, 'utf8');

      var getHash = getFileData.then(function(fileData) {
        return createHash(options.browserifyHash + filePath + fileData);
      });

      var getCachedData = getHash.then(function(hash) {
        return client.get(hash);
      });

      cache[filePath] = Promise.join(getFileData, getHash, getCachedData, function(fileData, hash, cachedData) {
        if (cachedData) {
          //update ttl, fire and forget
          client.expire(hash, options.ttl);
          return JSON.parse(cachedData);
        }

        return Promise.promisify(fallback)(fileData).then(function(calculatedData) {
          //cache data, fire and forget
          client.setex(hash, options.ttl, JSON.stringify(calculatedData));
          return calculatedData;
        });
      });
    }

    cache[filePath].asCallback(cb);
  };
};
