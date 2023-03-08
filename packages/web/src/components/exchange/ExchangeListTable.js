import { useContext, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  Card,
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
import toast from 'react-hot-toast';
import SearchIcon from '../../icons/Search';
import Label from '../Label';
import Scrollbar from '../Scrollbar';
import ModalsContext from '../../contexts/ModalsContext';
import GlobalContext from '../../contexts/GlobalContext';

const statusOptions = [
  {
    label: 'All',
    value: 'All',
  },
  {
    label: 'Test',
    value: 'Test',
  },
  {
    label: 'Prod',
    value: 'Prod',
  },
];

const getStatusLabel = (status) => {
  const { text, color } = status
    ? {
        color: 'warning',
        text: 'test',
      }
    : {
        color: 'success',
        text: 'prod',
      };

  return <Label color={color}>{text}</Label>;
};

const applyFilters = (exchanges, query, filters) =>
  exchanges.filter((exchange) => {
    let matches = true;

    if (query) {
      let containsQuery = false;
      if (
        exchange.tenant.toLowerCase().includes(query.toLowerCase()) ||
        exchange.exchange.toLowerCase().includes(query.toLowerCase())
      ) {
        containsQuery = true;
      }

      if (!containsQuery) {
        matches = false;
      }
    }

    if (
      filters.status &&
      filters.status !== 'All' &&
      ((exchange.test && filters.status === 'Prod') || (!exchange.test && filters.status === 'Test'))
    ) {
      matches = false;
    }

    return matches;
  });

const applyPagination = (exchanges, page, limit) => exchanges.slice(page * limit, page * limit + limit);

const ExchangeListTable = (props) => {
  const { exchanges, ...other } = props;
  const [selectedExchanges, setSelectedExchanges] = useState([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'All',
  });
  const { openModal, setModalData } = useContext(ModalsContext);
  const { gatherer, updateService, getServices } = useContext(GlobalContext);

  const handleQueryChange = (event) => {
    setQuery(event.target.value);
  };

  const handleStatusChange = (event) => {
    let value = null;

    if (event.target.value !== 'all') {
      value = event.target.value;
    }

    setFilters((prevFilters) => ({
      ...prevFilters,
      status: value,
    }));
  };

  const handleSelectAllExchanges = (event) => {
    setSelectedExchanges(event.target.checked ? exchanges.map((exchange, index) => index) : []);
  };

  const handleSelectOneExchange = (event, index) => {
    if (!selectedExchanges.includes(index)) {
      setSelectedExchanges((prevSelected) => [...prevSelected, index]);
    } else {
      setSelectedExchanges((prevSelected) => prevSelected.filter((id) => id !== index));
    }
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleLimitChange = (event) => {
    setLimit(parseInt(event.target.value, 10));
  };

  const onEdit = () => {
    if (selectedExchanges.length > 1) {
      toast.error('Select one exchange to edit');
      return;
    }

    openModal('exchange');
    setModalData(exchanges[selectedExchanges[0]]);
    setSelectedExchanges([]);
  };

  const onDelete = async () => {
    if (selectedExchanges.length > 1) {
      toast.error('Select one exchange to delete');
      return;
    }

    const selected = exchanges[selectedExchanges[0]];
    delete gatherer.exchanges[selected.tenant][selected.exchange];

    if (Object.keys(gatherer.exchanges[selected.tenant]).length === 0) {
      delete gatherer.exchanges[selected.tenant];
    }

    await updateService('gatherer', gatherer);
    getServices();
    toast.success('Deleted one exchange');
    setSelectedExchanges([]);
  };

  // Usually query is done on backend with indexing solutions
  const filteredExchanges = applyFilters(exchanges, query, filters);
  const paginatedExchanges = applyPagination(filteredExchanges, page, limit);
  const enableBulkActions = selectedExchanges.length > 0;
  const selectedSomeExchanges = selectedExchanges.length > 0 && selectedExchanges.length < exchanges.length;
  const selectedAllExchanges = selectedExchanges.length === exchanges.length;

  return (
    <Card {...other}>
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
            placeholder="Search exchanges by tenant or exchange"
            value={query}
            variant="outlined"
          />
        </Box>
        <Box
          sx={{
            m: 1,
            maxWidth: '100%',
            width: 240,
          }}
        >
          <TextField
            fullWidth
            label="Status"
            name="status"
            onChange={handleStatusChange}
            select
            SelectProps={{ native: true }}
            value={filters.status}
            variant="outlined"
          >
            {statusOptions.map((statusOption) => (
              <option key={statusOption.value} value={statusOption.value}>
                {statusOption.label}
              </option>
            ))}
          </TextField>
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
              checked={selectedAllExchanges}
              color="primary"
              indeterminate={selectedSomeExchanges}
              onChange={handleSelectAllExchanges}
            />
            <Button color="primary" sx={{ ml: 2 }} variant="outlined" onClick={onDelete}>
              Delete
            </Button>
            <Button color="primary" sx={{ ml: 2 }} variant="outlined" onClick={onEdit}>
              Edit
            </Button>
          </Box>
        </Box>
      )}
      <Scrollbar>
        <Box sx={{ minWidth: 1200 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedAllExchanges}
                    color="primary"
                    indeterminate={selectedSomeExchanges}
                    onChange={handleSelectAllExchanges}
                  />
                </TableCell>
                <TableCell>Tenant</TableCell>
                <TableCell>Exchange</TableCell>
                <TableCell>ApiKey</TableCell>
                <TableCell>Secret</TableCell>
                <TableCell>Test</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedExchanges.map((exchange, index) => {
                const isExchangeSelected = selectedExchanges.includes(page * limit + index);

                return (
                  <TableRow hover key={exchange.tenant + exchange.exchange} selected={isExchangeSelected}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isExchangeSelected}
                        color="primary"
                        onChange={(event) => handleSelectOneExchange(event, page * limit + index)}
                        value={isExchangeSelected}
                      />
                    </TableCell>
                    <TableCell>{exchange.tenant}</TableCell>
                    <TableCell>{exchange.exchange}</TableCell>
                    <TableCell>
                      <Typography color="textSecondary" variant="body2">
                        ********
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography color="textSecondary" variant="body2">
                        ********
                      </Typography>
                    </TableCell>
                    <TableCell>{getStatusLabel(exchange.test)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </Scrollbar>
      <TablePagination
        component="div"
        count={filteredExchanges.length}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleLimitChange}
        page={page}
        rowsPerPage={limit}
        rowsPerPageOptions={[5, 10, 25]}
      />
    </Card>
  );
};

ExchangeListTable.propTypes = {
  exchanges: PropTypes.array.isRequired,
};

export default ExchangeListTable;
