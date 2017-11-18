/*
  - fetch list of Relationship objects
*/

const _ = require('lodash');

module.exports = function(router) {
  router.get('/api/relationships', function(req, res, next) {

    // TODO: replace this placeholder code

    const responseObject = _.extend(req.body, {
      updatedAt: new Date().toISOString()
    });
    res.status(200).send(responseObject);
  });
};