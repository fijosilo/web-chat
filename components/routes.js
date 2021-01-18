const passport = require('passport');

module.exports = function(app) {
  app.route('/connect')
    .get(function (req, res) {
      res.sendFile(process.cwd() + '/views/index.html');
    });

  app.route('/auth')
    .post(function(req, res, next) {
      passport.authenticate('local', function(err, user, info) {
        if(err) {
          return res.status(500).send({error: err});
        }
        if(!user) {
          return res.status(200).json(info);
        }
        req.logIn(user, function(err) {
          if(err) {
            return next(err);
          }
          return res.redirect('/chat');
        });
      })(req, res, next);
    });

  function ensureAuth(req, res, next) {
    if(req.isAuthenticated()) {
      return next();
    }
    return res.redirect('/connect');
  };
  
  app.route('/chat')
    .get(ensureAuth, function(req, res) {
      res.sendFile(process.cwd() + '/views/chat.html');
    });
  
  app.use(function(req, res, next) {
    res.status(404)
      .type('text')
      .send('Not Found');
  });
}
