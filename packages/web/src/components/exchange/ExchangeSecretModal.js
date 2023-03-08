import { Box, Button, IconButton, Modal, Paper, TextField, Typography } from '@material-ui/core';
import * as crypto from 'crypto';
import { useContext, useState } from 'react';
import ModalsContext from '../../contexts/ModalsContext';
import GlobalContext from '../../contexts/GlobalContext';
import XIcon from '../../icons/X';

const ExchangeSecretModal = () => {
  const [data, setData] = useState();
  const { modal, closeModal } = useContext(ModalsContext);
  const { setSecret } = useContext(GlobalContext);

  const onSave = async () => {
    const pubKey = await fetch('./public.pem');
    const publicKey = await pubKey.text();
    const buffer = Buffer.from(data);
    const encrypted = crypto.publicEncrypt(publicKey, buffer);
    console.log(encrypted.toString('base64'));
    closeModal('secretEdit');
    setSecret({ decrypt: encrypted.toString('base64') });
  };

  return (
    <Modal open={modal.secretEdit} aria-labelledby="modal-modal-title" aria-describedby="modal-modal-description">
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
            maxWidth: 400,
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
            onClick={() => closeModal('secretEdit')}
          >
            <XIcon />
          </IconButton>
          <Typography color="textPrimary" variant="h6">
            Secret Edit
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
              maxRows={3}
              fullWidth
              value={data || ''}
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

export default ExchangeSecretModal;
