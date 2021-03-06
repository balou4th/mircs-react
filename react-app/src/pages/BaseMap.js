import { action, autorun, computed, extendObservable } from 'mobx'
import { CurrentDataSetRecords, getDataSetRecordsRes } from '../api/DataSetRecords'
import { CurrentView } from '../api/View'
import { getCurrentDataSetId } from '../api/DataSet'
import { getRelationshipsRes } from '../api/Relationships'
import { observer } from 'mobx-react'
import _ from 'lodash'
import React from 'react'

const BaseMap = observer(class extends React.Component {

  constructor() {
    super()
    extendObservable(this, {
      // The name of the tile layer to use.
      tileLayerName: CurrentView.res.get('tileLayerName', 'MapboxLight'),

      // An array of strings that are being searched for
      searchStrings: [],

      // An array of the field names returned in the records
      fieldNames: [],

      // The name of the field selected for highlighting
      highlightField: 'none',

      // An array of arrays of records, each corresponding to the searchString at the same index
      foundRecords: [],

      // An array of all of the other records that are not found.
      otherRecords: [],

      // An array of points, each of which is a two value array of lat/long coordinates. ie [ [45, 126], [47, 123] ]
      points: [],

      // An object containing the point and array of selected records: { point: [123,45], records: [...] }
      selected: {},
    })
  }

  componentDidMount = () => {
    this.autorunDisposer = autorun(() => {
      if (CurrentDataSetRecords.res.get('list', []).length) {
        this.fetchRelationships()
      }
    })
  }

  // This is a full map reset.
  reset = action( () => {
    this.tileLayerName = CurrentView.res.get('tileLayerName', 'MapboxLight')
    this.searchStrings = []
    this.fieldNames = []
    this.highlightField = 'none'
    this.foundRecords = []
    this.otherRecords = []
    this.points = []
    this.selected = {}
  })

  // This is called when the highlight field is set to none.  As in, not a full map reset, but just the search terms.
  resetFoundRecords = action( () => {
    this.foundRecords = []
    this.otherRecords = []
    this.searchStrings.forEach(() => {
      this.foundRecords.push([])
    })
  })

  addFieldNames = action((record) => {
    // Use the provided sample record to gather field names.  Names starting with an underscore are ignored.
    if (record) {
      let properties = record
      // Get the properties from server relationships
      if (record.data)
        properties = record.data[0].values().next().value
      // Get the properties from geojson
      if (record.properties)
        properties = record.properties
      // Add any relevant property names to the list
      _.each(properties, (property, key) => {
        if (!key.startsWith('_') && this.fieldNames.indexOf(key)===-1)
          this.fieldNames.push(key)
      })
    }
  })

  getOtherCount = computed(() => {
    let otherCount = this.otherRecords.length
    for (let i=7; i<this.searchStrings.length; i++) {
      otherCount += this.foundRecords[i].length
    }
    return otherCount
  })

  linkMap = {}

  fetchRelationships = () => {

    // Get all relationships
    const dataSetRecords = CurrentDataSetRecords.res.get('list')
    if (dataSetRecords) {
      const relationships = getRelationshipsRes().get('list', [])
      const relatedSets = []

      // Loop through the relationships and look for any that include our current dataset.
      relationships.forEach((relationship) => {
        const dataSetId = getCurrentDataSetId()
        if (relationship.dataSets[0] === dataSetId) {
          relatedSets.push({'dataSetId': relationship.dataSets[1], 'joinElements': relationship.joinElements})
        } else if (relationship.dataSets[1] === dataSetId) {
          // flip the join elements because we assume that current is at index 0 later.
          relatedSets.push({
            'dataSetId': relationship.dataSets[0],
            'joinElements': this.reverseJoinElements(relationship.joinElements),
          })
        }
      })

      // Now loop through our related sets and add related records to our linkMap
      relatedSets.forEach((relatedSet) => {
        const relatedSetRecords = getDataSetRecordsRes(relatedSet.dataSetId).get('list', [])
        this.handleJoin(dataSetRecords, relatedSetRecords, relatedSet.joinElements, this.linkMap)
        this.addFieldNames(relatedSetRecords[0])
      })
    }

  }

  reverseJoinElements = (original) => {
    const result = []
    original.forEach((element) => {
      result.push([element[1],element[0]])
    })
    return result
  }

  // join the columns of the datasets determined by the key parameters described in the Relationship
  handleJoin = (leftRecords, rightRecords, joinElements, linkMap) => {
    // idMap is a map of key values and record _id's.  The gui map will refer to a location by _id as different relationships
    // may use different fields for their joins.  So we will use idMap to corelate the join key value to an _id.
    const leftIdMap = {}
    leftRecords.forEach( (leftRecord) => {
      const leftKey = this.getJoinKey(leftRecord, joinElements, 0)
      // If we were able to build a relevant key, add it to the map
      if (!_.isNull(leftKey)) {
        leftIdMap[leftKey] = leftRecord._id
      }
    })

    // Now loop through the related data and add any records to the linkMap when they have a relationship
    rightRecords.forEach( (rightRecord) => {
      const rightKey = this.getJoinKey(rightRecord, joinElements, 1)
      const leftRecordId = leftIdMap[rightKey]
      let properties = rightRecord
      if (typeof rightRecord.properties === 'object') {
        // GeoJSON object, look to the properties
        properties = rightRecord.properties
      }
      // Add any matching records to our linkMap
      if (leftRecordId) {
        if (!linkMap[leftRecordId]) {
          linkMap[leftRecordId] = []
        }
        linkMap[leftRecordId].push(properties)
      }
    })
  }

  getJoinKey = (record, joinElements, tableIndex) => {
    let key = ''
    let exclude = false
    // Build a single join value including multifield joins concatenated with _.  eg. either value1 or value1_value2
    joinElements.forEach( (joinElement) => {
      let properties = record
      if (typeof record.properties === 'object') {
        // GeoJSON object, look to the properties
        properties = record.properties
      }
      const keyValue = properties[joinElement[tableIndex]]
      if (_.isUndefined(keyValue) || _.isNull(keyValue)) {
        exclude = true
      } else {
        if (key.length > 0) {
          key += '_'
        }
        key += keyValue
      }
    })
    if (exclude) {
      return null
    } else {
      return key
    }
  }

  // Override this in subclasses.
  render() {
    return ''
  }

})

export default BaseMap
