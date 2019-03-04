import { autorun } from 'mobx'
import { observer } from 'mobx-react'
import { showSnackbarMessage } from './SnackbarMessages'
import { withStyles } from '@material-ui/core'
import _ from 'lodash'
import Card from '@material-ui/core/Card'
import CardContent from '@material-ui/core/CardContent'
import http from '../utils/http'
import OpenInNew from '@material-ui/icons/OpenInNew'
import React from 'react'
import Typography from '@material-ui/core/Typography'
import UiStore from '../states/UiStore'

const StreetviewCard = observer(class extends React.Component {
  state = {
    loading: false,
  }

  url = undefined

  componentDidMount() {
    this.autorunDisposer = autorun(() => {
      this.getCard()
    })
  }

  componentWillUnmount() {
    this.autorunDisposer()
  }

  getCard = () => {

    this.setState({ loading: true })

    const APIkey = 'AIzaSyAJWwSkfp9-BbsUWYtN9uH3NVFbroZs_F0'

    if (UiStore.selected.point) {
      // Check the google maps api metadata to see if there is street view available for this location
      http.jsonRequest('https://maps.googleapis.com/maps/api/streetview/metadata?location='
        + UiStore.selected.point[0] + ',' + UiStore.selected.point[1] + '&key=' + APIkey,
      {mode: 'cors', headers: {}})
        .then((response) => {
          // An 'OK' response means that there's something to see, anything else we'll ignore.
          if (_.get(response, 'bodyJson.status') === 'OK') {
            // Build a URL to the street view page for this location:
            this.url = 'https://www.google.com/maps/@?api=1&map_action=pano&viewpoint='
                + UiStore.selected.point[0] + ',' + UiStore.selected.point[1]
                + '&key=' + APIkey
          } else {
            this.url = undefined
          }
        }
        )
        .catch(showSnackbarMessage)
        .then(() => {
          // Trigger a refresh
          this.setState({ loading: false })
        })
    }
  }

  render() {
    const {classes} = this.props

    if (this.url) {
      return (
        <Card className={classes.card} key='s'>
          <CardContent>
            <Typography component='p'>
              <a href={this.url} target='_blank' rel='noopener noreferrer'>Street view is available <OpenInNew className={classes.icon} /></a>
            </Typography>
          </CardContent>
        </Card>
      )
    } else {
      return null
    }

  }

})

const styles = () => ({
  card: {
    margin: 8,
  },
})

export default withStyles(styles, { withTheme: true })(StreetviewCard)
