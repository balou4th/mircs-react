/*
  - update a single record
*/

module.exports = function (router) {
    router.put('/api/datasets/:dataSetId/records/:recordId', function (req, res, next) {

        // TODO: implement

        res.status(500).send({error: 'Unimplemented'});
    });
};