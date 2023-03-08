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
} from '@material-ui/core';
import toast from 'react-hot-toast';
import SearchIcon from '../../icons/Search';
import Label from '../Label';
import Scrollbar from '../Scrollbar';
import GlobalContext from '../../contexts/GlobalContext';
import ModalsContext from '../../contexts/ModalsContext';

const applyFilters = (dataStreams, query) =>
  dataStreams.filter((dataStream) => {
    let matches = true;

    if (query) {
      let containsQuery = false;
      if (
        dataStream.tenant.toLowerCase().includes(query.toLowerCase()) ||
        dataStream.exchangeId.toLowerCase().includes(query.toLowerCase())
      ) {
        containsQuery = true;
      }

      if (!containsQuery) {
        matches = false;
      }
    }

    return matches;
  });

const applyPagination = (dataStreams, page, limit) => dataStreams.slice(page * limit, page * limit + limit);

const DataStreamListTable = (props) => {
  const { dataStreams, ...other } = props;
  const { openModal, setModalData } = useContext(ModalsContext);
  const { gatherer, updateService, getServices } = useContext(GlobalContext);
  const [selectedDataStreams, setSelectedDataStreams] = useState([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [query, setQuery] = useState('');

  const handleQueryChange = (event) => {
    setQuery(event.target.value);
  };

  const handleSelectAllDataStreams = (event) => {
    setSelectedDataStreams(event.target.checked ? dataStreams.map((dataStream, index) => index) : []);
  };

  const handleSelectOneDataStream = (event, index) => {
    if (!selectedDataStreams.includes(index)) {
      setSelectedDataStreams((prevSelected) => [...prevSelected, index]);
    } else {
      setSelectedDataStreams((prevSelected) => prevSelected.filter((id) => id !== index));
    }
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleLimitChange = (event) => {
    setLimit(parseInt(event.target.value, 10));
  };

  const onDelete = async () => {
    if (selectedDataStreams.length > 1) {
      toast.error('Select one exchange to delete');
      return;
    }

    gatherer.workplans = gatherer.workplans.filter((item, index) => index !== selectedDataStreams[0]);

    await updateService('gatherer', gatherer);
    getServices();
    toast.success('Deleted one data stream');
    setSelectedDataStreams([]);
  };

  const onEdit = () => {
    if (selectedDataStreams.length > 1) {
      toast.error('Select one data stream to edit');
      return;
    }

    const dataStream = dataStreams[selectedDataStreams[0]];
    openModal('datastream');
    setModalData({
      ...dataStream,
      assetPairs: dataStream.assetPairs && dataStream.assetPairs.toString(),
      dataPoints: dataStream.dataPoints,
      index: selectedDataStreams[0],
    });
    setSelectedDataStreams([]);
  };

  // Usually query is done on backend with indexing solutions
  const filteredDataStreams = applyFilters(dataStreams, query);
  const paginatedDataStreams = applyPagination(filteredDataStreams, page, limit);
  const enableBulkActions = selectedDataStreams.length > 0;
  const selectedSomeDataStreams = selectedDataStreams.length > 0 && selectedDataStreams.length < dataStreams.length;
  const selectedAllDataStreams = selectedDataStreams.length === dataStreams.length;

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
              checked={selectedAllDataStreams}
              color="primary"
              indeterminate={selectedSomeDataStreams}
              onChange={handleSelectAllDataStreams}
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
                    checked={selectedAllDataStreams}
                    color="primary"
                    indeterminate={selectedSomeDataStreams}
                    onChange={handleSelectAllDataStreams}
                  />
                </TableCell>
                <TableCell>Exchange</TableCell>
                <TableCell>Tenant</TableCell>
                <TableCell>AssetPairs</TableCell>
                <TableCell>DataPoints</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedDataStreams.map((dataStream, index) => {
                const isDataStreamSelected = selectedDataStreams.includes(index);

                return (
                  <TableRow hover key={dataStream.tenant + dataStream.exchangeId} selected={isDataStreamSelected}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isDataStreamSelected}
                        color="primary"
                        onChange={(event) => handleSelectOneDataStream(event, index)}
                        value={isDataStreamSelected}
                      />
                    </TableCell>
                    <TableCell>{dataStream.exchangeId}</TableCell>
                    <TableCell>{dataStream.tenant}</TableCell>
                    <TableCell>
                      {dataStream.assetPairs &&
                        dataStream.assetPairs.map((pair) => (
                          <Label key={pair} color="warning" sx={{ mx: '2px' }}>
                            {pair}
                          </Label>
                        ))}
                    </TableCell>
                    <TableCell>
                      {dataStream.dataPoints &&
                        dataStream.dataPoints.map((dataPoint) => (
                          <Label key={dataPoint} color="success" sx={{ textTransform: 'unset!important', mx: '2px' }}>
                            {dataPoint}
                          </Label>
                        ))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </Scrollbar>
      <TablePagination
        component="div"
        count={filteredDataStreams.length}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleLimitChange}
        page={page}
        rowsPerPage={limit}
        rowsPerPageOptions={[5, 10, 25]}
      />
    </Card>
  );
};

DataStreamListTable.propTypes = {
  dataStreams: PropTypes.array.isRequired,
};

export default DataStreamListTable;
