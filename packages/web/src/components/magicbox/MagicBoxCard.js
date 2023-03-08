import { Card, Grid, TextField, Typography } from '@material-ui/core';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import MagicBoxTable from './MagicBoxTable';
import { useContext, useState } from 'react';
import GlobalContext from '../../contexts/GlobalContext';

const MagicBoxCard = (props) => {
  const { magicboxItem, index } = props;
  const { magicbox, updateService, getServices } = useContext(GlobalContext);
  const [tenantId, setTanantId] = useState(magicboxItem.tenantId);
  const [plugins, setPlugins] = useState(JSON.stringify(magicboxItem.plugins, null, 2));

  const onDelete = () => {
    if (!magicbox.workplans) return;

    magicbox.workplans = magicbox.workplans.filter((item, i) => i !== index);

    updateService('magicbox', magicbox);
    getServices();
    toast.success('Deleted');
  };

  const onSave = () => {
    if (!tenantId || !plugins) {
      toast.error('Empty fields');
      return;
    }

    try {
      magicbox.workplans[index].plugins = JSON.parse(plugins);
    } catch (ex) {
      toast.error('Invalid format');
      return;
    }

    magicbox.workplans[index].tenantId = tenantId;

    updateService('magicbox', magicbox);
    getServices();
    toast.success('Saved');
  };

  return (
    <Card sx={{ p: 4, mt: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={6} sx={{ mt: 4 }}>
          <TextField
            label="Tenant"
            variant="standard"
            color="primary"
            value={tenantId}
            onChange={(e) => setTanantId(e.target.value)}
            focused
          />
          <Typography color="primary.main" variant="body1" sx={{ fontSize: '0.75rem', mt: 3 }}>
            Plugins
          </Typography>
          <TextField
            variant="standard"
            color="primary"
            multiline
            maxRows={10}
            fullWidth
            value={plugins}
            onChange={(e) => setPlugins(e.target.value)}
          />
        </Grid>
        <Grid item xs={6}>
          <MagicBoxTable
            subscriptions={magicboxItem.subscriptions}
            onDelete={onDelete}
            onSave={onSave}
            workplanIndex={index}
          />
        </Grid>
      </Grid>
    </Card>
  );
};

MagicBoxCard.propTypes = {
  magicboxItem: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
};

export default MagicBoxCard;
