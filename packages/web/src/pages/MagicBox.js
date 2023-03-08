import { useEffect, useContext } from 'react';
import { Helmet } from 'react-helmet-async';
import { Box, Button, Container, Grid, Typography } from '@material-ui/core';
import BorderColorRoundedIcon from '@material-ui/icons/BorderColorRounded';
import { MagicBoxCard } from '../components/magicbox';
import useSettings from '../hooks/useSettings';
import PlusIcon from '../icons/Plus';
import GlobalContext from '../contexts/GlobalContext';
import ModalsContext from '../contexts/ModalsContext';
import MagicboxEditModal from '../components/magicbox/MagicboxEditModal';

const MagicBox = () => {
  const { settings } = useSettings();
  const { getServices, magicbox, addWorkPlan } = useContext(GlobalContext);
  const { openModal } = useContext(ModalsContext);

  useEffect(() => {
    getServices();
  }, []);

  const onAdd = () => {
    addWorkPlan();
  };

  return (
    <>
      <Helmet>
        <title>Magicbox list</title>
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
                Magicbox List
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
                    openModal('magicboxEdit');
                  }}
                >
                  Manual Edit
                </Button>
                <Button
                  color="primary"
                  startIcon={<PlusIcon fontSize="small" />}
                  sx={{ m: 1 }}
                  variant="contained"
                  onClick={onAdd}
                >
                  New Magicbox
                </Button>
              </Box>
            </Grid>
          </Grid>
          <Box>
            {magicbox?.workplans &&
              magicbox.workplans.map((magicboxItem, index) => (
                <MagicBoxCard key={magicboxItem.tenantId} magicboxItem={magicboxItem} index={index} />
              ))}
          </Box>
        </Container>
        <MagicboxEditModal />
      </Box>
    </>
  );
};

export default MagicBox;
