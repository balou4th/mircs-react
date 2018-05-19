//
// Starts the MIRCS server
//

const path = require('path');

// set up __server_src_dir global variable, available to all modules
global.__server_src_dir = __dirname + '/';

global.requireSrc = function(libName) {
  return require(path.join(__dirname, libName));
};

const cors = require('cors');
const createRouterForDir = requireSrc('utils/create-router-for-dir.js');
const Environment = requireSrc('utils/environment.js');
const express = require('express');
const log = requireSrc('utils/log.js');
const logger = require('morgan');
const bodyParser = require('body-parser');
const MongoUtil = requireSrc('utils/mongo-util.js');

const app = express();

// logging for all routes
app.use(logger('dev'));

// set up CORS with a max-age header, to save browser re-requests of OPTIONS for each route
const ONE_HOUR_SECONDS = 60 * 60;
const MAX_AGE_SECONDS = ONE_HOUR_SECONDS;
app.use(cors({ maxAge: MAX_AGE_SECONDS }));

// expose build output of the react-app
app.use(express.static(path.resolve(__server_src_dir, '../public')));

// configure the app the use body-parser for POST requests
app.use(bodyParser.urlencoded({ extended: false }));
// for parsing application/json
app.use(bodyParser.json({ limit: '50mb' }));

// register the api
app.use(createRouterForDir('api'));

// return 404 for unknown commands
app.all('*', function(req, res) {
  log.info('404 - Unknown command', {
    method: req.method,
    path: req.path,
    query: req.query,
    params: req.params,
    headers: req.headers,
    body: req.body
  });
  res.status(404).send({ error: `Cannot ${req.method} ${req.path}` });
});

MongoUtil.initialize()
  .then(() => {
    const PORT = Environment.getRequired('PORT');
    app.listen(PORT, function() {
      log.info(`expressjs server is listening on port ${PORT}...`);
    });
  })
  .catch((error) => {
    console.error('Error starting server.', error);
  });
