import { Helmet } from 'react-helmet-async';
import { Box, Container, Typography } from '@material-ui/core';
import { ServiceListTable } from '../components/service';
import useSettings from '../hooks/useSettings';

const ServiceList = () => {
  const { settings } = useSettings();

  return (
    <>
      <Helmet>
        <title>Service list</title>
      </Helmet>
      <Box
        sx={{
          backgroundColor: 'background.default',
          minHeight: '100%',
          py: 8,
        }}
      >
        <Container maxWidth={settings.compact ? 'xl' : false}>
          <Typography color="textPrimary" variant="h5">
            Service List
          </Typography>
          <Box sx={{ mt: 3 }}>
            <ServiceListTable />
          </Box>
        </Container>
      </Box>
    </>
  );
};

export default ServiceList;
