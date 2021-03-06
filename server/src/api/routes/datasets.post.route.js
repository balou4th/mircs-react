/*
  - creates a new DataSet object in the database
  - request body contains a DataSet object (minus the _id and _collectionName)
  - response body contains the fully populated DataSet object with the _id and _collectionName fields populated
*/

const _ = require('lodash')
const DataUtil = require('../../utils/data-util.js')

module.exports = function(router) {
  router.post('/api/datasets',
    require('../../middleware/require-sign-in'),
    (req, res, next) => {
      const newDataSet = _.clone(req.body)
      if (!_.isString(newDataSet.name)) {
        return res.status(400).send('name is required')
      }
      newDataSet.createdAt = newDataSet.updatedAt = new Date()

      let db
      let dataSetCollection
      let dataSet
      DataUtil.getDb()
        .then((theDb) => {
          db = theDb
          dataSetCollection = db.collection(DataUtil.DATA_SETS_COLLECTION)
          return dataSetCollection.insertOne(newDataSet)
        })
        .then((result) => {
          dataSet = result.ops[0]

          dataSet._collectionName = DataUtil.DATA_SETS_COLLECTION_PREFIX + dataSet._id

          return dataSetCollection.updateOne({ _id: dataSet._id }, dataSet)
        })
        .then(() => {
          return db.createCollection(dataSet._collectionName)
        })
        .then(() => {
          res.status(201).send(dataSet)
        })
        .catch(next)
    })
}
