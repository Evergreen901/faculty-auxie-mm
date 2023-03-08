import { useEffect, useContext } from 'react';
import { Helmet } from 'react-helmet-async';
import { Box, Button, Container, Grid, Typography } from '@material-ui/core';
import { ExchangeEditModal, ExchangeListTable, ExchangeModal, ExchangeSecretModal } from '../components/exchange';
import useSettings from '../hooks/useSettings';
import BorderColorRoundedIcon from '@material-ui/icons/BorderColorRounded';
import PlusIcon from '../icons/Plus';
import ModalsContext from '../contexts/ModalsContext';
import GlobalContext from '../contexts/GlobalContext';

const ExchangeList = () => {
  const { settings } = useSettings();
  const { exchanges, getServices } = useContext(GlobalContext);
  const { openModal, setModalData } = useContext(ModalsContext);

  useEffect(() => {
    getServices();
  }, []);

  return (
    <>
      <Helmet>
        <title>Exchange list</title>
      </Helmet>
      <Box
        sx={{
          backgroundColor: 'background.default',
          minHeight: '100%',
          py: 8,
        }}
      >
        <Container maxWidth={settings.compact ? 'xl' : false}>
          <Grid container justifyContent="space-between" spacing={3}>
            <Grid item>
              <Typography color="textPrimary" variant="h5">
                Exchange List
              </Typography>
            </Grid>
            <Grid item>
              <Box sx={{ m: -1 }}>
                <Button
                  color="primary"
                  startIcon={<BorderColorRoundedIcon fontSize="small" />}
                  sx={{ m: 1 }}
                  variant="contained"
                  onClick={() => {
                    openModal('exchangeEdit');
                  }}
                >
                  Manual Edit
                </Button>
                <Button
                  color="primary"
                  startIcon={<PlusIcon fontSize="small" />}
                  sx={{ m: 1 }}
                  variant="contained"
                  onClick={() => {
                    setModalData(null);
                    openModal('exchange');
                  }}
                >
                  New Exchange
                </Button>
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ mt: 3 }}>
            <ExchangeListTable exchanges={exchanges} />
          </Box>
          <ExchangeModal />
          <ExchangeEditModal />
          <ExchangeSecretModal />
        </Container>
      </Box>
    </>
  );
};

export default ExchangeList;
