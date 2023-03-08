import { Box, Button, IconButton, Modal, Paper, TextField, Typography } from '@material-ui/core';
import toast from 'react-hot-toast';
import { useContext, useEffect, useState } from 'react';
import useMounted from '../../hooks/useMounted';
import ModalsContext from '../../contexts/ModalsContext';
import GlobalContext from '../../contexts/GlobalContext';
import XIcon from '../../icons/X';

const DataStreamEditModal = () => {
  const mounted = useMounted();
  const { modal, closeModal } = useContext(ModalsContext);
  const { gatherer, updateService, getServices } = useContext(GlobalContext);
  const [data, setData] = useState();

  useEffect(() => {
    if (!gatherer || !gatherer.workplans) return;

    if (mounted.current) setData(JSON.stringify(gatherer.workplans, null, 2));
  }, [gatherer]);

  const onSave = async () => {
    if (!gatherer) return;
    try {
      gatherer.workplans = JSON.parse(data);
    } catch (ex) {
      toast.error('Invalid format');
      return;
    }

    const gathererUpdated = await updateService('gatherer', gatherer);

    if (!gathererUpdated) {
      toast.error('Failed to edit data streams');
      return;
    }

    toast.success('Updated data streams');
    getServices();
    closeModal('datastreamEdit');
  };

  return (
    <Modal open={modal.datastreamEdit} aria-labelledby="modal-modal-title" aria-describedby="modal-modal-description">
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 500,
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
            onClick={() => closeModal('datastreamEdit')}
          >
            <XIcon />
          </IconButton>
          <Typography color="textPrimary" variant="h6">
            Manual Edit
          </Typography>
          <Box
            sx={{
              mt: 2,
            }}
          >
            <TextField
              variant="standard"
              color="primary"
              multiline
              maxRows={10}
              fullWidth
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </Box>

          <Box sx={{ mt: 3 }}>
            <Button color="primary" fullWidth variant="contained" onClick={onSave}>
              Save
            </Button>
          </Box>
        </Paper>
      </Box>
    </Modal>
  );
};

export default DataStreamEditModal;
