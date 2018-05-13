import _ from 'lodash'
import {action, extendObservable} from 'mobx'
import {FormControl} from 'material-ui/Form'
import {MenuItem} from 'material-ui/Menu'
import {observer} from 'mobx-react'
import Button from 'material-ui/Button'
import Card, {CardContent, CardHeader} from 'material-ui/Card'
import http from 'utils/http'
import Input, {InputLabel} from 'material-ui/Input'
import Layout from 'utils/Layout'
import React from 'react'
import Select from 'material-ui/Select'

const L = window.L;

const Maps = observer(class extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tileLayerName: 'OpenStreetMap'
    };
    extendObservable(this, {
      dataSets: [],
      relationships: [],
      records: [],
      selectedRecord: null
    });
  }

  componentDidMount() {
    this.fetchDataSetRecords();
    this.startMap();
  }

  listMappableDataSets() {}

  componentWillUnmount() {
    this.stopMap();
  }
  // create the Leaflet map object
  startMap = action(() => {
    this.map = L.map(this.refs.mapNode, {
      center: [
        44.6458, -63.5778
      ],
      zoomControl: false,
      zoom: 13,
      maxZoom: 18,
      minZoom: 9,
      scrollwheel: true,
      legends: false,
      infoControl: false,
      attributionControl: true
    });

    L.control.zoom({position: 'bottomleft'}).addTo(this.map);
    L.control.scale({position: 'bottomleft'}).addTo(this.map);

    this.setupTileLayer();
  })

  // this is called when 'map data' is clicked
  fetchDataSetForMap = action((dataSetId) => {
    this.refreshMap();
    this.fetchDataSet(`/api/datasets/${dataSetId}/records`, 'bodyJson.list');
  })

  fetchRelationshipDataForMap = action((relationId) => {
    this.refreshMap();
    this.fetchDataSet(`/api/relationships/${relationId}/join`, 'bodyJson.records');
  })

  // once a new data set is fetched, we want to remove the old one from the map
  refreshMap = action(() => {
    this.stopMap();
    this.startMap();
  })

  // loop through the records to map each set of data
  createPoints = action((records) => {
    _.each(records, (record) => {
      L.marker([record.Y, record.X])
        .addTo(this.map)
        .bindPopup(record.Address_Number + ' ' + record.Street)
        .on('click', action(() => {
          this.selectedRecord = record;
        }));
    });
  })

  fetchDataSet = action((recordId, where) => {
    this.selectedRecord = null;
    http.jsonRequest(recordId)
      .then(action((response) => {
        this.records = _.get(response, where);
        this.createPoints(this.records);
      }))
      .catch(action((error) => {
        this.error = error;
      }));
  })

  // use this to list all of the datasets on the left
  // TODO make sure we only request "mappable" datasets
  fetchDataSetRecords = action(() => {
    this.selectedRecord = null;
    http.jsonRequest('/api/datasets')
      .then(action((response) => {
        this.dataSets = _.get(response, 'bodyJson.list');
        this.fetchRelationshipRecords();
      }))
      .catch(action((error) => {
        this.error = error;
      }));
  })

  fetchRelationshipRecords = action(() => {
    http.jsonRequest('/api/relationships')
      .then(action((response) => {
        this.relationships = _.get(response, 'bodyJson.list');
      }))
      .catch(action((error) => {
        this.error = error;
      }));
  })

  stopMap = action(() => {
    if (this.map) {
      // destroy the Leaflet map object & related event listeners
      this.map.remove();
      this.map = null;
    }
  })

  setupTileLayer = action(() => {
    if (this.tileLayer) {
      this.tileLayer.remove();
      this.tileLayer = null;
    }

    switch (this.state.tileLayerName) {
      case 'Mapbox':
        this.tileLayer = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
          minZoom: 8,
          attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributor' +
              's, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imager' +
              'y © <a href="http://mapbox.com">Mapbox</a>',
          id: 'mapbox.streets',
          accessToken: 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriIS' +
              'LbB6B5aw'
        });
        break;

      case 'OpenStreetMap':
      default:
        this.tileLayer = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'});
        break;
    }

    this.tileLayer.addTo(this.map);
  })

  componentDidUpdate(prevProps, prevState) {
    this.setupTileLayer();
  }

  handleTileLayerNameChange = event => {
    this.setState({tileLayerName: event.target.value});
  };

  render() {
    return (
      <div style={{ ...Layout.absoluteFill, ...Layout.row }}>
        <div style={{ width: '30%', overflow: 'scroll' }}>

          {/* dataSets */}
          <h2>Data Sets</h2>
          {this.dataSets.map((dataSet) => (
              <div key={dataSet._id}>
                <Card style={styles.card}>
                  <CardHeader title={dataSet.name}/>
                  <CardContent>
                    <div>
                      <strong>Name:
                      </strong>
                      {dataSet.name}
                    </div>
                    {dataSet.description && <div>
                      <strong>Description:
                      </strong>
                      {dataSet.description}
                    </div>}
                    {dataSet.stats && <div>
                      <strong>Stats:
                      </strong>
                      {_.map(this.stats, (value, key) => (
                        <div
                          key={key}
                          style={{
                          marginLeft: 10
                        }}>{key}: {value}</div>
                      ))}
                    </div>}
                    <div style={{
                      textAlign: "center"
                    }}>
                      <Button
                        style={styles.button}
                        value={dataSet._id}
                        raised
                        color='primary'
                        onClick={() => {
                        this.fetchDataSetForMap(dataSet._id)
                      }}>Map Data</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}

          {/* relationships */}
          <h2>Relationships</h2>
          {this.relationships.map((relation) => (
              <div key={relation._id}>
                <Card style={styles.card}>
                  <CardHeader title={relation.name}/>
                  <CardContent>
                    <div>
                      <strong>Name:
                      </strong>
                      {relation.name}
                    </div>
                    {relation.description && <div>
                      <strong>Description:
                      </strong>
                      {relation.description}
                    </div>}
                    {relation.stats && <div>
                      <strong>Stats:
                      </strong>
                      {_.map(this.stats, (value, key) => (
                        <div
                          key={key}
                          style={{
                          marginLeft: 10
                        }}>{key}: {value}</div>
                      ))}
                    </div>}
                    <div style={{
                      textAlign: "center"
                    }}>
                      <Button
                        style={styles.button}
                        value={relation._id}
                        raised
                        color='primary'
                        onClick={() => {
                        this.fetchRelationshipDataForMap(relation._id)
                      }}>Map Data</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}

        </div>

        <div style={{ ...Layout.column, flex: 1 }}>

          <form autoComplete='off'>
            <FormControl>
              <InputLabel htmlFor='tile-layer-input'>Tile Layer</InputLabel>
              <Select
                value={this.state.tileLayerName}
                onChange={this.handleTileLayerNameChange}
                input={< Input id = 'tile-layer-input' />}>
                <MenuItem value='OpenStreetMap'>OpenStreetMap</MenuItem>
                <MenuItem value='Mapbox'>Mapbox</MenuItem>
              </Select>
            </FormControl>
          </form>

          <div ref='mapNode' style={styles.map}></div>

          <div style={{ overflow: 'scroll' }}>
            {_.map(this.selectedRecord, (value, field) => (
              <div key={field}>
                <strong>{field}:</strong> <span>{value}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    );
  }
});
const styles = {
  map: {
    position: 'relative',
    height: '700px'
  },
  button: {
    margin: "auto",
    marginTop: "10px",
    width: '50%'
  },
  card: {
    margin: "10px"
  }
}

export default Maps;