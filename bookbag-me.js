var express = require('express');
var consolidate = require('consolidate');
var passport = require('passport');
var request = require('request');
var swig = require('swig');

var MongoStore = require('connect-mongo')(express);

require('./lib/passport-strategies');

var users = require('./lib/models/user');

swig.init({
  root: __dirname + '/views',
  allowErrors: true,
  cache: false
});

var app = module.exports.api = express();

app.engine('html', consolidate.swig);

app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.set('view options', { layout: false });
app.set('view cache', false);

app.use(function (req, res, next) {
  var start = process.hrtime();

  if (res._responseTime) {
    return next();
  }

  res._responseTime = true;
  res._responseTimeStart = start;

  // The header event is undocumented; I also
  // tried end but it never triggered.
  res.on('header', function () {
    var duration = process.hrtime(start);

    console.log(req.method, req.url, res.statusCode, duration[0] +
      (duration[1] / 1000000));
  });

  next();
});

app.use(express.logger());
app.use(express.compress());
app.use(express['static'](__dirname + '/public'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({
  secret: process.env.SESSION_SECRET,
  store: new MongoStore({
    db: 'bookbag-me-sessions'
  })
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(app.router);

app.get('/login', function (req, res) {
  res.render('login');
});

app.get('/auth/foursquare', passport.authenticate('foursquare'));

app.get('/auth/foursquare/callback', passport.authenticate('foursquare', {
  failureRedirect: '/login',
  successReturnToOrRedirect: '/'
}));

app.get('/', function (req, res) {
  res.render('index', {
    signedIn: !!req.user
  });
});

app.get('/privacy', function (req, res) {
  res.render('privacy');
});

app.get('/set-id', function (req, res) {
  var wishlistId = req.param('wishlistId');

  if (wishlistId && req.user) {
    users.setWishlistId(req.user.userId, wishlistId, function (err) {
      if (err) {
        console.log('Error:', err);
      }
    });
  }

  res.render('index', {
    signedIn: !!req.user
  });
});

app.get('/books/:userId', function (req, res) {
  users.getUser(req.param('userId'), function (err, user) {
    res.render('books', {
      user: user
    });
  });
});

function isBookstore(categories) {
  var bookstore = false;

  categories.forEach(function (category) {
    if (/book/i.test(category.name)) {
      bookstore = true;
    }

    category.parents.forEach(function (parent) {
      if (/book/i.test(parent)) {
        bookstore = true;
      }
    });
  });

  return bookstore;
}

app.post('/push', function (req, res) {
  if (req.body &&
    req.body.checkin &&
    req.body.user &&
    req.body.secret === process.env.PUSH_SECRET) {
    var data = req.body;

    data.checkin = JSON.parse(data.checkin);
    data.user = JSON.parse(data.user);

    if (!isBookstore(data.checkin.venue.categories)) {
      console.log(data.checkin.venue.name, 'was not a bookstore');

      return res.send(200);
    }

    users.getUser(data.user.id, function (err, user) {
      if (err || !user) {
        return console.log('Error:', err);
      }

      var replyUrl = 'https://bookbag.me/books/' + data.user.id;

      var replyText = 'Check out some books from your wishlist while you\'re here!';

      request.post({
        url: 'https://api.foursquare.com/v2/checkins/' + data.checkin.id +
          '/reply',
        qs: {
          text: replyText,
          url: replyUrl,
          oauth_token: user.accessToken,
          v: '20130105'
        }
      }, function (err) {
        if (err) {
          console.log('Error:', err);
        }

        var duration = process.hrtime(res._responseTimeStart);

        console.log('REPLY COMPLETE', duration[0] + (duration[1] / 1000000));
      });
    });
  }

  res.send(200);
});

// We want exceptions and stracktraces in development
app.configure('development', function () {
  app.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
});

// ... but not in production
app.configure('production', function () {
  app.use(express.errorHandler());
});

users.init(function (err) {
  if (err) throw err;

  console.log('Listening on port', process.env.PORT);

  app.listen(process.env.PORT);
});
