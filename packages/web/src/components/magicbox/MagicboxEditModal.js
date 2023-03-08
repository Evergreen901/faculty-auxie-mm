import { Box, Button, IconButton, Modal, Paper, TextField, Typography } from '@material-ui/core';
import toast from 'react-hot-toast';
import { useContext, useEffect, useState } from 'react';
import useMounted from '../../hooks/useMounted';
import ModalsContext from '../../contexts/ModalsContext';
import GlobalContext from '../../contexts/GlobalContext';
import XIcon from '../../icons/X';

const MagicboxEditModal = () => {
  const mounted = useMounted();
  const { modal, closeModal } = useContext(ModalsContext);
  const { magicbox, updateService, getServices } = useContext(GlobalContext);
  const [data, setData] = useState();

  useEffect(() => {
    if (!magicbox) return;

    if (mounted.current) setData(JSON.stringify(magicbox, null, 2));
  }, [magicbox]);

  const onSave = async () => {
    let magicboxTemp;
    if (!magicbox) return;
    try {
      magicboxTemp = JSON.parse(data);
    } catch (ex) {
      toast.error('Invalid format');
      return;
    }

    const magicboxUpdated = await updateService('magicbox', magicboxTemp);

    if (!magicboxUpdated) {
      toast.error('Failed to edit exchanges');
      return;
    }

    toast.success('Updated magicbox');
    getServices();
    closeModal('magicboxEdit');
  };

  return (
    <Modal open={modal.magicboxEdit} aria-labelledby="modal-modal-title" aria-describedby="modal-modal-description">
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
            onClick={() => closeModal('magicboxEdit')}
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

export default MagicboxEditModal;
