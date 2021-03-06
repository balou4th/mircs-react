import { action, extendObservable, toJS } from 'mobx'
import { observer } from 'mobx-react'
import { refreshDataSet } from '../../api/refreshDataSet'
import { showSnackbarMessage } from '../../components/SnackbarMessages'
import Button from '@material-ui/core/Button'
import ButtonProgress from '../../components/ButtonProgress'
import copyDataPropHOC from '../../components/copyDataPropHOC'
import Dialog from '@material-ui/core/Dialog'
import DialogActions from '@material-ui/core/DialogActions'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import ensureString from '../../utils/ensureString'
import PropTypes from 'prop-types'
import React from 'react'
import ServerHttpApi from '../../api/net/ServerHttpApi'
import TextField from '@material-ui/core/TextField'

const EditDataSetDialog = observer(class extends React.Component {
  static propTypes = {
    // optional - specify the dataSet object to modify in the case of edit, can be undefined for dataSet creation
    data: PropTypes.object,
    // called when the edit dialog is dismissed
    onCancel: PropTypes.func.isRequired,
    // called after the save completes
    afterSave: PropTypes.func.isRequired,
    open: PropTypes.bool,
  }

  constructor() {
    super()
    extendObservable(this, {
      isSaving: false,
    })
  }

  get isCreate() {
    return !this.props.data._id
  }

  // creates a change handler function for the field with passed @key
  handleFieldChange = (key) => {
    return action((event) => {
      this.props.data[key] = event.target.value
    })
  }

  handleSave = action(() => {
    this.isSaving = true
    this.doSave()
      .then(() => {
        return refreshDataSet(this.props.data._id)
      })
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
    const { data } = this.props
    const dataSetId = data._id
    const bodyJson = toJS(data)
    if (this.isCreate) {
      return ServerHttpApi.jsonPost('/api/datasets', bodyJson)
    } else {
      return ServerHttpApi.jsonPut(`/api/datasets/${dataSetId}`, bodyJson)
    }
  }

  canSave = () => {
    if (!this.props.data.name) {
      return false
    }
    return true
  }

  render() {
    const { open, onCancel, data } = this.props
    if (!open) {
      return null
    }

    return (
      <Dialog open={open} fullWidth={true}>
        <DialogTitle>{this.isCreate ? 'Create Data Set' : 'Edit Data Set'}</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin='dense' label='name' type='text' fullWidth
            value={data.name} onChange={this.handleFieldChange('name')}/>
          <TextField margin='dense' label='description' type='text' fullWidth
            value={data.description} onChange={this.handleFieldChange('description')}/>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancel} color='primary' disabled={this.isSaving}>
            Cancel
          </Button>
          <Button onClick={this.handleSave} color='secondary' disabled={!this.canSave()}>
            Save
            {this.isSaving && <ButtonProgress/>}
          </Button>
        </DialogActions>
      </Dialog>
    )
  }
})

export default copyDataPropHOC(EditDataSetDialog, {
  processCopy: (dataSetCopy) => {
    ensureString(dataSetCopy, 'name')
    ensureString(dataSetCopy, 'description')
  },
})
