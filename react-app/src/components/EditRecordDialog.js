import { action, extendObservable, toJS } from 'mobx'
import { observer } from 'mobx-react'
import { showSnackbarMessage } from '../components/SnackbarMessages'
import _ from 'lodash'
import Button from '@material-ui/core/Button'
import ButtonProgress from '../components/ButtonProgress'
import Dialog from '@material-ui/core/Dialog'
import DialogActions from '@material-ui/core/DialogActions'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import PropTypes from 'prop-types'
import React from 'react'
import ServerHttpApi from '../api/net/ServerHttpApi'
import TextField from '@material-ui/core/TextField'

const EditRecordDialog = observer(class extends React.Component {
  static propTypes = {
    open: PropTypes.bool,
    // data set this record belongs to
    dataSetId: PropTypes.string.isRequired,
    // optional - specify the record object to modify in the case of edit, can be undefined for creation
    record: PropTypes.object,
    // called when the edit dialog is dismissed
    onCancel: PropTypes.func.isRequired,
    // called after the save completes
    afterSave: PropTypes.func.isRequired,
  }

  constructor() {
    super()
    extendObservable(this, {
      record: {},
      isCreate: true,
      isSaving: false,
      showNewJoinElements: false,
      newJoinElements: [undefined, undefined],
    })
  }

  componentDidUpdate() {
    if (this.props.open) {
      action(() => {
        let recordCopy = {}
        if (this.props.record) {
          recordCopy = JSON.parse(JSON.stringify(this.props.record))
        }

        this.record = recordCopy
        this.isCreate = !this.record._id

        this.isSaving = false
      })()
    }
  }

  // creates an change handler function for the field with passed @key
  handleFieldChange = (key) => {
    return action((event) => {
      this.record[key] = event.target.value
    })
  }

  handleSave = action(() => {
    this.isSaving = true
    this.doSave()
      .then(action((response) => {
        this.isSaving = false
        this.props.afterSave(response.bodyJson)
      }))
      .catch(showSnackbarMessage)
      .then(action(() => {
        this.isSaving = false
      }))

  })

  doSave() {
    const bodyJson = toJS(this.record)
    if (this.isCreate) {
      return ServerHttpApi.jsonPost(`/api/datasets/${this.props.dataSetId}/records`, bodyJson)
    } else {
      return ServerHttpApi.jsonPut(`/api/datasets/${this.props.dataSetId}/records/${this.props.record._id}`, bodyJson)
    }
  }

  handleDataSetChanged = (index) => {
    return action((dataSet) => {
      this.record.dataSets[index] = dataSet
    })
  }

  haveDataSetsBeenSelected = () => {
    // record.dataSets must exist and contain two non-null elements
    return !!(this.record.dataSets && this.record.dataSets[0] && this.record.dataSets[1])
  }

  onAddNewJoinElementClick = action(() => {
    this.showNewJoinElements = true
  })

  onCancelJoinElementClick = action(() => {
    this.showNewJoinElements = false
    this.newJoinElements[0] = ''
    this.newJoinElements[1] = ''
  })

  onAddJoinElementClick = action(() => {
    this.record.joinElements.push([this.newJoinElements[0], this.newJoinElements[1]])
    this.onCancelJoinElementClick()
  })

  onRemoveJoinElementClick = (index) => {
    return action(() => {
      this.record.joinElements.remove(this.record.joinElements[index])
    })
  }

  render() {
    return (
      <Dialog open={this.props.open} fullWidth={true}>
        <DialogTitle>{this.isCreate ? 'Create Record' : `Edit Record ${this.record._id}`}</DialogTitle>
        <DialogContent>
          {_.map(this.record, (value, key) => (
            <TextField key={key} autoFocus margin='dense' label={key} type='text' fullWidth
              value={value || ''} onChange={this.handleFieldChange(key)}/>
          ))}

        </DialogContent>
        <DialogActions>
          <Button onClick={this.props.onCancel} color='primary' disabled={this.isSaving}>
            Cancel
          </Button>
          <Button onClick={this.handleSave} color='secondary'>
            Save
            {this.isSaving && <ButtonProgress/>}
          </Button>
        </DialogActions>
      </Dialog>
    )
  }
})

export default EditRecordDialog
