import { useEffect, useContext } from 'react';
import { Helmet } from 'react-helmet-async';
import { Box, Button, Container, Grid, Typography } from '@material-ui/core';
import { DataStreamEditModal, DataStreamListTable, DataStreamModal } from '../components/datastream';
import useSettings from '../hooks/useSettings';
import BorderColorRoundedIcon from '@material-ui/icons/BorderColorRounded';
import PlusIcon from '../icons/Plus';
import GlobalContext from '../contexts/GlobalContext';
import ModalsContext from '../contexts/ModalsContext';

const DataStreamList = () => {
  const { settings } = useSettings();
  const { getServices, dataStreams } = useContext(GlobalContext);
  const { openModal, setModalData } = useContext(ModalsContext);

  useEffect(() => {
    getServices();
  }, []);

  return (
    <>
      <Helmet>
        <title>DataStream list</title>
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
                DataStream List
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
                    openModal('datastreamEdit');
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
                    openModal('datastream');
                  }}
                >
                  New DataStream
                </Button>
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ mt: 3 }}>
            <DataStreamListTable dataStreams={dataStreams} />
          </Box>
          <DataStreamModal />
          <DataStreamEditModal />
        </Container>
      </Box>
    </>
  );
};

export default DataStreamList;
