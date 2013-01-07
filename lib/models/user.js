var redis = require('redis');

exports.setAccessToken = function (userId, accessToken, cb) {
  exports.client.hset(userId, 'accessToken', accessToken, function (err) {
    cb(err);
  });
};

exports.setWishlistId = function (userId, wishlistId, cb) {
  exports.client.hset(userId, 'wishlistId', wishlistId, function (err) {
    cb(err);
  });
};

exports.getUser = function (userId, cb) {
  exports.client.hgetall(userId, function (err, user) {
    if (user) {
      user.userId = userId;
    }

    cb(err, user);
  });
};

exports.init = function (cb) {
  exports.client = redis.createClient();

  exports.client.select(10, function () {
    cb();
  });
};
