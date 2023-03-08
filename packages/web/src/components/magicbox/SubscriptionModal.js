import { Autocomplete, Box, Button, IconButton, Modal, Paper, TextField, Typography } from '@material-ui/core';
import { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import GlobalContext from '../../contexts/GlobalContext';
import ModalsContext from '../../contexts/ModalsContext';
import XIcon from '../../icons/X';
import { exchangeOptions, dataPointOptions } from '../../constants';

const SubscriptionModal = () => {
  const { modal, modalData, closeModal } = useContext(ModalsContext);
  const { magicbox, updateService, getServices } = useContext(GlobalContext);
  const [exchangeId, setExchangeId] = useState();
  const [symbol, setSymbol] = useState();
  const [dataPoint, setDataPoint] = useState();
  const [isPublic, setIsPublic] = useState('Public');

  useEffect(() => {
    if (!modalData) return;

    setExchangeId(modalData.exchangeId);
    setSymbol(modalData.symbol);
    setDataPoint(modalData.dataPoint);
    setIsPublic(modalData.isPublic === true ? 'Public' : 'Private');
  }, [modalData]);

  const onSave = async () => {
    if (!magicbox.workplans[modalData.workplanIndex].subscriptions) return;

    const newSubscription = {
      exchangeId,
      symbol,
      dataPoint,
      isPublic: isPublic === 'Public',
    };

    if (modalData?.exchangeId) {
      magicbox.workplans[modalData.workplanIndex].subscriptions[modalData.subscriptionIndex] = newSubscription;
    } else {
      magicbox.workplans[modalData.workplanIndex].subscriptions.push(newSubscription);
    }

    const res = await updateService('magicbox', magicbox);
    if (!res) {
      toast.error('Failed to add data stream');
      return;
    }

    toast.success('Added new subscription');
    getServices();
    closeModal('subscription');
    setExchangeId('');
    setSymbol('');
    setDataPoint('');
    setIsPublic('');
  };

  return (
    <Modal open={modal.subscription} aria-labelledby="modal-modal-title" aria-describedby="modal-modal-description">
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
            onClick={() => closeModal('subscription')}
          >
            <XIcon />
          </IconButton>
          <Typography color="textPrimary" variant="h6">
            {modalData?.exchangeId ? 'Edit' : 'New'} Subscription
          </Typography>
          <Box
            sx={{
              mt: 2,
            }}
          >
            {/* <TextField
              fullWidth
              label="ExchangeId"
              variant="standard"
              value={exchangeId || ''}
              onChange={(e) => setExchangeId(e.target.value)}
            /> */}
            <Autocomplete
              options={exchangeOptions}
              filterSelectedOptions
              value={exchangeId || ''}
              onChange={(event, value) => {
                setExchangeId(value);
              }}
              renderInput={(params) => <TextField {...params} label="Exchange" />}
            />
          </Box>

          <Box
            sx={{
              mt: 3,
            }}
          >
            <TextField
              fullWidth
              label="Symbol"
              variant="standard"
              value={symbol || ''}
              onChange={(e) => setSymbol(e.target.value)}
            />
          </Box>
          <Box
            sx={{
              mt: 3,
            }}
          >
            {/* <TextField
              fullWidth
              label="DataPoint"
              variant="standard"
              value={dataPoint || ''}
              onChange={(e) => setDataPoint(e.target.value)}
            /> */}
            <Autocomplete
              options={dataPointOptions}
              filterSelectedOptions
              value={dataPoint}
              onChange={(event, value) => {
                setDataPoint(value);
              }}
              renderInput={(params) => <TextField {...params} label="DataPoint" />}
            />
          </Box>
          <Box sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="IsPublic"
              select
              SelectProps={{ native: true }}
              variant="outlined"
              value={isPublic || ''}
              onChange={(e) => setIsPublic(e.target.value)}
            >
              {['Public', 'Private'].map((theme) => (
                <option key={theme} value={theme}>
                  {theme}
                </option>
              ))}
            </TextField>
          </Box>
          <Box sx={{ mt: 3 }}>
            <Button color="primary" fullWidth variant="contained" onClick={onSave}>
              Save Subscription
            </Button>
          </Box>
        </Paper>
      </Box>
    </Modal>
  );
};

export default SubscriptionModal;
