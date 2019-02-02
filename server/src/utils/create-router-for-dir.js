const _ = require('lodash')
const express = require('express')
const FsUtil = require('../utils/fs-util.js')
const log = require('../utils/log.js')
const path = require('path')

//
// Scans the contents of [dir]/param, [dir]/middleware, and [dir]/routes for well-named files and executes functions within
// them, giving us a route-declaration-by-convention mechanism.
//
function createRouterForDir(dir) {
  const router = new express.Router()

  if (log.level() <= log.TRACE) {
    // log all requests
    router.use(function(req, res, next) {
      log.trace(req.method, req.path, JSON.stringify({
        body: req.body,
        headers: req.headers,
        query: req.query,
        params: req.params,
      }, null, 2))
      next()
    })
  }

  function addMiddleware() {
    FsUtil.forEachFileInDir(path.join(dir, 'middleware'), '.middleware.js', function(filePath) {
      try {
        router.use(require(filePath))
      } catch (exception) {
        log.fatal(`Error starting middleware ${filePath}:`, exception)
        throw exception
      }
    })
  }

  function addParams() {
    FsUtil.forEachFileInDir(path.join(dir, 'params'), '.param.js', function(filePath) {
      try {
        require(filePath)(router)
      } catch (exception) {
        log.fatal(`Error starting param handler ${filePath}:`, exception)
        throw exception
      }
    })
  }

  function addRoutes() {
    FsUtil.forEachFileInDir(path.join(dir, 'routes'), '.route.js', function(filePath) {
      try {
        require(filePath)(router)
      } catch (exception) {
        log.fatal(`Error starting route ${filePath}:`, exception)
        throw exception
      }
    })
  }

  addMiddleware()
  addParams()
  addRoutes()

  // list all registered routes
  if (log.level() === log.TRACE) {
    (function listAllRoutes() {
      var routes = router.stack
      var routesMapping = []
      _.each(routes, function(val) {
        if (val.route) {
          val = val.route
          var method = (val.stack[0].method || 'all').toUpperCase()
          routesMapping.push(method + ': ' + val.path)
        }
      })
      log.trace(`Registered routes for ${dir}:\n    ${routesMapping.join('\n    ')}`)
    })()
  }

  // return 404 for unknown commands
  router.all(`/${dir}*`, function(req, res) {
    log.info('404 - Unknown ' + dir + ' command', {
      method: req.method,
      path: req.path,
      query: req.query,
      params: req.params,
      headers: req.headers,
      body: req.body,
    })
    res.status(404).send({ error: `Cannot ${req.method} ${req.path}` })
  })

  return function(req, res, next) {
    return router(req, res, function onRouteError(error) {
      let errorMessage = 'Error handling request ' + _.get(error, 'message', '')

      if (error) {
        log.error('Error handling request', req.method, dir + req.path, {
          query: req.query,
          params: req.params,
          headers: req.headers,
          body: req.body,
        }, '\nerror:', error)

        if (log.level() <= log.DEBUG) {
          // include error details when building in engineering mode to help debug issues
          errorMessage += '\n' + error.stack || error
        }
      } else if (!_.startsWith(req.url, '/' + dir)) {
        return next()
      }

      log.error('Request not handled', req.path, req.method)
      if (log.level() <= log.DEBUG) {
        errorMessage += ' Request not handled.'
      }
      res.status(500).send({ error: errorMessage })
    })
  }
}

module.exports = createRouterForDir
