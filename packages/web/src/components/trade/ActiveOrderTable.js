import React, { useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography,
} from '@material-ui/core';
import toast from 'react-hot-toast';
import { formatterFloat } from '../../helpers/functions';
import Scrollbar from '../Scrollbar';
import DeleteIcon from '@material-ui/icons/Delete';
import TimerContext from '../../contexts/TimerContext';
import { fetchWrapper } from '../../helpers/fetch-wrapper';
import useMounted from '../../hooks/useMounted';

function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

// This method is created for cross-browser compatibility, if you don't
// need to support IE11, you can use Array.prototype.sort() directly
function stableSort(array, comparator) {
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) {
      return order;
    }
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

const headCells = [
  {
    id: 'datetime',
    numeric: false,
    label: 'Time',
  },
  {
    id: 'side',
    numeric: false,
    label: 'Side',
  },
  {
    id: 'price',
    numeric: true,
    label: 'Price',
  },
  {
    id: 'amount',
    numeric: true,
    label: 'Size',
  },
  {
    id: 'filled',
    numeric: true,
    label: 'Filled',
  },
  {
    id: 'source',
    numeric: true,
    label: 'Source',
  },
  {
    id: 'action',
    numeric: false,
    label: 'Action',
  },
];

function EnhancedTableHead(props) {
  const { order, orderBy, onRequestSort } = props;
  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow
        sx={{
          '& .MuiTableCell-root': {
            border: 'none',
            padding: '1px 0px',
            color: 'white',
          },
        }}
      >
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align="center"
            padding={headCell.disablePadding ? 'none' : 'normal'}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : 'asc'}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
              {orderBy === headCell.id ? (
                <Box component="span" sx={{ display: 'none' }}>
                  {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                </Box>
              ) : null}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

EnhancedTableHead.propTypes = {
  onRequestSort: PropTypes.func.isRequired,
  order: PropTypes.oneOf(['asc', 'desc']).isRequired,
  orderBy: PropTypes.string.isRequired,
};

const ActiveOrderTable = (props) => {
  const { tenant, exchange } = props;
  const mounted = useMounted();
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('datetime');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const { timestamp } = useContext(TimerContext);
  const [orders, setOrders] = useState([]);

  const updateOrders = async () => {
    if (!tenant || !exchange) return;
    const res = await fetchWrapper.post(process.env.REACT_APP_BACKEND_URL + '/data/orders/' + tenant, {
      where: {
        exchange,
        status: ['open', 'closed'],
      },
      offset: 0,
    });

    if (!res) return;
    if (mounted.current) {
      const orderIdArray = Array.from(new Set(res.map((s) => s.orderId)));
      const promises = [];
      for (let i = 0; i < orderIdArray.length; i++) {
        promises.push(
          fetchWrapper.get(
            process.env.REACT_APP_WEBREDIS_URL + '/hget/order%2E' + tenant + '%2E' + orderIdArray[i] + '/order'
          )
        );
      }

      const orderResult = await Promise.all(promises);
      setOrders(
        orderResult.map((result, index) => ({
          ...JSON.parse(result?.hget),
          orderId: orderIdArray[index],
        }))
      );
    }
  };

  useEffect(() => {
    updateOrders();
  }, [timestamp]);

  const handleDelete = async (orderID, symbol) => {
    const jsonData = {
      action: 'cancelOrder',
      exchangeId: exchange,
      payload: {
        symbol,
        orderID,
      },
    };

    const res = await fetchWrapper.get(
      process.env.REACT_APP_WEBREDIS_URL +
        '/publish/' +
        tenant +
        '%2EtraderActions/' +
        JSON.stringify(jsonData, null, 2)
          .replaceAll(/(?:\r\n|\r|\n)/g, '%0D%0A')
          .replaceAll('/', '%2F')
          .replaceAll('.', '%2E')
    );

    if (res?.publish) {
      toast.success('Cancelled an order');
    } else {
      toast.error('Failed to cancel an order');
    }
  };

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Avoid a layout jump when reaching the last page with empty orders.
  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - orders.length) : 0;

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Paper sx={{ width: '100%', p: 2 }}>
        <Scrollbar>
          <Typography color="textPrimary" variant="h5" sx={{ textAlign: 'center' }}>
            Active Orders
          </Typography>
          <Table
            sx={{
              minWidth: 550,
            }}
            size="medium"
          >
            <EnhancedTableHead order={order} orderBy={orderBy} onRequestSort={handleRequestSort} />
            <TableBody>
              {/* if you don't need to support IE11, you can replace the `stableSort` call with:
                 orders.slice().sort(getComparator(order, orderBy)) */}
              {orders &&
                stableSort(orders, getComparator(order, orderBy))
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row, index) => (
                    <TableRow
                      hover
                      key={index}
                      sx={{
                        '& .MuiTableCell-root': {
                          color: row.side === 'sell' ? '#f44336' : '#01ab56',
                          border: 'none',
                          padding: '1px 0px',
                        },
                      }}
                    >
                      <TableCell align="center">
                        {row.datetime && row.datetime.split('T').length > 1
                          ? row.datetime.split('T')[1].slice(0, -5)
                          : row.datetime}
                      </TableCell>
                      <TableCell align="center">{row.side}</TableCell>
                      <TableCell align="center">{formatterFloat.format(row.price)}</TableCell>
                      <TableCell align="center">{formatterFloat.format(row.amount)}</TableCell>
                      <TableCell align="center">{row.filled}</TableCell>
                      <TableCell align="center">Artis</TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          '& .MuiButtonBase-root': {
                            padding: '4px',
                          },
                        }}
                      >
                        {row.status === 'open' ? (
                          <IconButton onClick={() => handleDelete(row.orderId, row.symbol)}>
                            <DeleteIcon color="error" fontSize="small" />
                          </IconButton>
                        ) : (
                          row.status
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              {emptyRows > 0 && (
                <TableRow
                  style={{
                    height: 53 * emptyRows,
                  }}
                >
                  <TableCell colSpan={6} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Scrollbar>
        <TablePagination
          rowsPerPageOptions={[25, 50, 100]}
          component="div"
          count={orders ? orders.length : 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
};

ActiveOrderTable.propTypes = {
  tenant: PropTypes.string,
  exchange: PropTypes.string,
};

export default ActiveOrderTable;
