import { Box, Card, Switch, Table, TableBody, TableCell, TableHead, TableRow } from '@material-ui/core';
import toast from 'react-hot-toast';
import { useContext, useEffect, useState } from 'react';
import GlobalContext from '../../contexts/GlobalContext';
import useMounted from '../../hooks/useMounted';
import Label from '../Label';
import Scrollbar from '../Scrollbar';

const getStatusLabel = (status) => {
  const { text, color } =
    status !== 'started'
      ? {
          color: 'error',
          text: 'stopped',
        }
      : {
          color: 'success',
          text: 'started',
        };

  return <Label color={color}>{text}</Label>;
};

const ServiceListTable = () => {
  const { gatherer, executor, magicbox, dbsync, apiserver, getServices, updateService } = useContext(GlobalContext);
  const [services, setServices] = useState([]);
  const mounted = useMounted();

  useEffect(() => {
    const temp = [];
    temp.push({
      id: 'gatherer',
      status: gatherer?.agent?.status,
    });
    temp.push({
      id: 'executor',
      status: executor?.agent?.status,
    });
    temp.push({
      id: 'magicbox',
      status: magicbox?.agent?.status,
    });
    temp.push({
      id: 'dbsync',
      status: dbsync?.agent?.status,
    });
    temp.push({
      id: 'apiserver',
      status: apiserver?.agent?.status,
    });

    if (mounted.current) setServices(temp);
  }, [gatherer, executor, magicbox, dbsync, apiserver]);

  useEffect(() => {
    getServices();
  }, []);

  const handleClick = async (id, index) => {
    let serviceConfig = gatherer;
    if (id === 'executor') serviceConfig = executor;
    if (id === 'magicbox') serviceConfig = magicbox;
    if (id === 'dbsync') serviceConfig = dbsync;
    if (id === 'apiserver') serviceConfig = apiserver;

    if (!serviceConfig) {
      toast.error('service is not running');
      return;
    }

    serviceConfig.agent.status = services[index].status === 'started' ? 'stopped' : 'started';
    await updateService(id, serviceConfig);
    getServices();
  };

  return (
    <Card
      sx={{
        maxWidth: 800,
      }}
    >
      <Scrollbar>
        <Box>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Service</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {services.map((service, index) => (
                <TableRow hover key={service.id}>
                  <TableCell>{service.id}</TableCell>
                  <TableCell>{getStatusLabel(service.status)}</TableCell>
                  <TableCell sx={{ width: 100 }}>
                    <Switch
                      color="primary"
                      checked={service?.status ? service.status === 'started' : false}
                      onClick={() => handleClick(service.id, index)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Scrollbar>
    </Card>
  );
};

export default ServiceListTable;
