import { Autocomplete, Box, Button, IconButton, Modal, Paper, TextField, Typography } from '@material-ui/core';
import { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import GlobalContext from '../../contexts/GlobalContext';
import ModalsContext from '../../contexts/ModalsContext';
import XIcon from '../../icons/X';
import { exchangeOptions, dataPointOptions } from '../../constants';

const DataStreamModal = () => {
  const { modal, modalData, closeModal } = useContext(ModalsContext);
  const { gatherer, updateService, getServices } = useContext(GlobalContext);
  const [tenant, setTenant] = useState();
  const [exchange, setExchange] = useState();
  const [assetPairs, setAssetPairs] = useState();
  const [dataPoints, setDataPoints] = useState([]);

  const onSave = async () => {
    if (!gatherer) return;
    if (!gatherer.workplans) {
      gatherer.workplans = [];
    }

    const newDataStream = {
      tenant,
      exchangeId: exchange,
      assetPairs: assetPairs ? assetPairs.split(',') : [],
      dataPoints,
    };

    if (modalData) {
      gatherer.workplans[modalData.index] = newDataStream;
    } else {
      gatherer.workplans.push(newDataStream);
    }

    const res = await updateService('gatherer', gatherer);
    if (!res) {
      toast.error('Failed to add data stream');
      return;
    }

    toast.success(modalData ? 'Saved' : 'Added new data stream');
    getServices();
    closeModal('datastream');
    setTenant('');
    setExchange('');
    setAssetPairs('');
    setDataPoints([]);
  };

  useEffect(() => {
    if (!modalData) {
      setTenant();
      setExchange();
      setAssetPairs();
      setDataPoints([]);
      return;
    }

    setTenant(modalData.tenant);
    setExchange(modalData.exchangeId);
    setAssetPairs(modalData.assetPairs);
    setDataPoints(modalData.dataPoints ?? []);
  }, [modalData]);

  return (
    <Modal open={modal.datastream} aria-labelledby="modal-modal-title" aria-describedby="modal-modal-description">
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
        }}
      >
        <Paper
          elevation={12}
          sx={{
            maxWidth: 500,
            mx: 'auto',
            p: 4,
          }}
        >
          <IconButton
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
            }}
            onClick={() => closeModal('datastream')}
          >
            <XIcon />
          </IconButton>
          <Typography color="textPrimary" variant="h6">
            {modalData ? 'Edit' : 'New'} DataStream
          </Typography>
          <Box
            sx={{
              mt: 2,
            }}
          >
            <TextField
              fullWidth
              label="Tenant"
              variant="standard"
              value={tenant || ''}
              onChange={(e) => setTenant(e.target.value)}
            />
          </Box>
          <Box
            sx={{
              mt: 2,
            }}
          >
            {/* <TextField
              fullWidth
              label="Exchange"
              variant="standard"
              value={exchange || ''}
              onChange={(e) => setExchange(e.target.value)}
            /> */}
            <Autocomplete
              options={exchangeOptions}
              filterSelectedOptions
              value={exchange}
              onChange={(event, value) => {
                setExchange(value);
              }}
              renderInput={(params) => <TextField {...params} label="Exchange" />}
            />
          </Box>
          <Box
            sx={{
              mt: 2,
            }}
          >
            <TextField
              fullWidth
              label="AssetPairs"
              variant="standard"
              value={assetPairs || ''}
              onChange={(e) => setAssetPairs(e.target.value)}
            />
          </Box>
          <Box
            sx={{
              mt: 2,
            }}
          >
            <Autocomplete
              multiple
              options={dataPointOptions}
              filterSelectedOptions
              value={dataPoints.length > 0 ? dataPoints : []}
              onChange={(event, value) => {
                setDataPoints(value);
              }}
              renderInput={(params) => <TextField {...params} label="DataPoints" />}
            />
          </Box>
          <Box sx={{ mt: 3 }}>
            <Button color="primary" fullWidth variant="contained" onClick={onSave}>
              Save DataStream
            </Button>
          </Box>
        </Paper>
      </Box>
    </Modal>
  );
};

export default DataStreamModal;
