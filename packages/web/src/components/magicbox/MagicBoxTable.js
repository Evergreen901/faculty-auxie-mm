import { useContext, useState } from 'react';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import {
  Box,
  Button,
  Checkbox,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@material-ui/core';
import SearchIcon from '../../icons/Search';
import PlusIcon from '../../icons/Plus';
import Label from '../Label';
import Scrollbar from '../Scrollbar';
import SubscriptionModal from './SubscriptionModal';
import ModalsContext from '../../contexts/ModalsContext';
import GlobalContext from '../../contexts/GlobalContext';

const applyFilters = (subscriptions, query) =>
  subscriptions.filter((subscription) => {
    let matches = true;

    if (query) {
      let containsQuery = false;
      if (subscription.exchangeId.toLowerCase().includes(query.toLowerCase())) {
        containsQuery = true;
      }

      if (!containsQuery) {
        matches = false;
      }
    }

    return matches;
  });

const applyPagination = (subscriptions, page, limit) => subscriptions.slice(page * limit, page * limit + limit);

const MagicBoxTable = (props) => {
  const { subscriptions, onSave, onDelete, workplanIndex } = props;
  const [selectedSubscriptions, setSelectedSubscriptions] = useState([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [query, setQuery] = useState('');
  const { openModal, setModalData } = useContext(ModalsContext);
  const { magicbox, updateService, getServices } = useContext(GlobalContext);

  const handleQueryChange = (event) => {
    setQuery(event.target.value);
  };

  const handleSelectAllSubscriptions = (event) => {
    setSelectedSubscriptions(event.target.checked ? subscriptions.map((subscription, index) => index) : []);
  };

  const handleSelectOneSubscription = (event, index) => {
    if (!selectedSubscriptions.includes(index)) {
      setSelectedSubscriptions((prevSelected) => [...prevSelected, index]);
    } else {
      setSelectedSubscriptions((prevSelected) => prevSelected.filter((id) => id !== index));
    }
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleLimitChange = (event) => {
    setLimit(parseInt(event.target.value, 10));
  };

  const handleDelete = async () => {
    if (selectedSubscriptions.length > 1) {
      toast.error('Select one exchange to delete');
      return;
    }

    magicbox.workplans[workplanIndex].subscriptions = magicbox.workplans[workplanIndex].subscriptions.filter(
      (item, index) => index !== selectedSubscriptions[0]
    );

    await updateService('magicbox', magicbox);
    getServices();
    toast.success('Deleted one subscription');
    setSelectedSubscriptions([]);
  };

  const handleEdit = () => {
    if (selectedSubscriptions.length > 1) {
      toast.error('Select one exchange to delete');
      return;
    }

    openModal('subscription');
    setModalData({
      ...subscriptions[selectedSubscriptions[0]],
      workplanIndex,
      subscriptionIndex: selectedSubscriptions[0],
    });
    setSelectedSubscriptions([]);
  };

  // Usually query is done on backend with indexing solutions
  const filteredSubscriptions = applyFilters(subscriptions, query);
  const paginatedSubscriptions = applyPagination(filteredSubscriptions, page, limit);
  const enableBulkActions = selectedSubscriptions.length > 0;
  const selectedSomeSubscriptions =
    selectedSubscriptions.length > 0 && selectedSubscriptions.length < subscriptions.length;
  const selectedAllSubscriptions = selectedSubscriptions.length === subscriptions.length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', columnGap: 2 }}>
        <Button color="error" variant="outlined" onClick={onDelete}>
          Delete
        </Button>
        <Button color="success" variant="outlined" onClick={onSave}>
          Save
        </Button>
        <Button
          color="primary"
          startIcon={<PlusIcon fontSize="small" />}
          variant="contained"
          onClick={() => {
            openModal('subscription');
            setModalData({
              workplanIndex,
            });
          }}
        >
          New Subscription
        </Button>
      </Box>
      <Typography color="primary.main" sx={{ fontSize: '1rem' }}>
        Subscriptions
      </Typography>
      <Box
        sx={{
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          m: -1,
          p: 2,
        }}
      >
        <Box
          sx={{
            m: 1,
            maxWidth: '100%',
            width: 300,
          }}
        >
          <TextField
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            onChange={handleQueryChange}
            placeholder="Search exchanges by exchange"
            value={query}
            variant="outlined"
          />
        </Box>
      </Box>
      {enableBulkActions && (
        <Box sx={{ position: 'relative' }}>
          <Box
            sx={{
              backgroundColor: 'background.paper',
              mt: '6px',
              position: 'absolute',
              px: '4px',
              width: '100%',
              zIndex: 2,
            }}
          >
            <Checkbox
              checked={selectedAllSubscriptions}
              color="primary"
              indeterminate={selectedSomeSubscriptions}
              onChange={handleSelectAllSubscriptions}
            />
            <Button color="primary" sx={{ ml: 2 }} variant="outlined" onClick={handleDelete}>
              Delete
            </Button>
            <Button color="primary" sx={{ ml: 2 }} variant="outlined" onClick={handleEdit}>
              Edit
            </Button>
          </Box>
        </Box>
      )}
      <Scrollbar>
        <Box>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedAllSubscriptions}
                    color="primary"
                    indeterminate={selectedSomeSubscriptions}
                    onChange={handleSelectAllSubscriptions}
                  />
                </TableCell>
                <TableCell>Tenant</TableCell>
                <TableCell>Symbol</TableCell>
                <TableCell>DataPoint</TableCell>
                <TableCell>IsPublic</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedSubscriptions.map((subscription, index) => {
                const isSubscriptionselected = selectedSubscriptions.includes(index);

                return (
                  <TableRow hover key={index} selected={isSubscriptionselected}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSubscriptionselected}
                        color="primary"
                        onChange={(event) => handleSelectOneSubscription(event, index)}
                        value={isSubscriptionselected}
                      />
                    </TableCell>
                    <TableCell>{subscription.exchangeId}</TableCell>
                    <TableCell>
                      <Label color="warning" sx={{ mx: '2px' }}>
                        {subscription.symbol}
                      </Label>
                    </TableCell>
                    <TableCell>
                      <Label color="success" sx={{ textTransform: 'unset!important', mx: '2px' }}>
                        {subscription.dataPoint}
                      </Label>
                    </TableCell>
                    <TableCell>
                      {subscription.isPublic ? (
                        <Label color="success" sx={{ textTransform: 'unset!important', mx: '2px' }}>
                          Public
                        </Label>
                      ) : (
                        <Label color="warning" sx={{ textTransform: 'unset!important', mx: '2px' }}>
                          Private
                        </Label>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
        <SubscriptionModal />
      </Scrollbar>
      <TablePagination
        component="div"
        count={filteredSubscriptions.length}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleLimitChange}
        page={page}
        rowsPerPage={limit}
        rowsPerPageOptions={[5, 10, 25]}
      />
    </Box>
  );
};

MagicBoxTable.propTypes = {
  subscriptions: PropTypes.array.isRequired,
  onSave: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  workplanIndex: PropTypes.number.isRequired,
};

export default MagicBoxTable;
