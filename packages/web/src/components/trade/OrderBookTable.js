import PropTypes from 'prop-types';
import { Card, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@material-ui/core';
import { formatterFloat } from '../../helpers/functions';
import { useContext, useEffect, useState } from 'react';
import TimerContext from '../../contexts/TimerContext';
import { fetchWrapper } from '../../helpers/fetch-wrapper';
import useMounted from '../../hooks/useMounted';

const OrderBookTable = (props) => {
  const mounted = useMounted();
  const { tenant, exchange, assetPair } = props;
  const [asks, setAsks] = useState([]);
  const [bids, setBids] = useState([]);
  const [lastOrderBook, setLastOrderBook] = useState('0');
  const { timestamp } = useContext(TimerContext);

  const isExist = (array, target) => {
    for (const item of array) {
      if (item[0] === target[0] && item[1] === target[1]) return 0;
    }

    return 1;
  };

  const updateOrderBook = async () => {
    if (!assetPair) {
      if (mounted.current) {
        setAsks([]);
        setBids([]);
      }
      return;
    }

    let res = await fetchWrapper.get(
      process.env.REACT_APP_WEBREDIS_URL +
        '/XREVRANGE/stream%2Esnapshot%2E' +
        tenant +
        '%2E' +
        exchange +
        '%2EwatchOrderBook%2E' +
        assetPair.replace('/', '%2F') +
        '/%2B/%2D/count/1'
    );

    let orderBook = res?.XREVRANGE.length > 0 && JSON.parse(res.XREVRANGE[0].msg.data);
    if (!orderBook) return;
    if (mounted.current && res?.XREVRANGE[0].id > lastOrderBook) {
      setLastOrderBook(res?.XREVRANGE[0].id);
      setAsks(orderBook.asks);
      setBids(orderBook.bids);
      return;
    }

    res = await fetchWrapper.get(
      process.env.REACT_APP_WEBREDIS_URL +
        '/xread/count/1/streams/stream%2E' +
        tenant +
        '%2E' +
        exchange +
        '%2EwatchOrderBook%2E' +
        assetPair.replace('/', '%2F') +
        '/' +
        lastOrderBook
    );

    if (!res?.xread) {
      return;
    }
    orderBook = res?.xread['stream.' + tenant + '.' + exchange + '.watchOrderBook.' + assetPair];
    if (!orderBook) return;
    let asksTemp = asks;
    let bidsTemp = bids;
    let lastOrderBookTemp = lastOrderBook;
    for (const order of orderBook) {
      if (order.id > lastOrderBook) {
        const delta = JSON.parse(order.msg.data);

        if (delta.asks.remove.length) asksTemp = asksTemp.filter((item) => isExist(delta.asks.remove, item));
        if (delta.asks.add.length) asksTemp = [...asksTemp, ...delta.asks.add];
        if (delta.bids.remove.length) bidsTemp = bidsTemp.filter((item) => isExist(delta.bids.remove, item));
        if (delta.bids.add.length) bidsTemp = [...bidsTemp, ...delta.bids.add];
        lastOrderBookTemp = order.id;
      }
    }

    if (mounted.current) {
      setLastOrderBook(lastOrderBookTemp);
      setAsks(asksTemp.sort((a, b) => a[0] - b[0]).reverse());
      setBids(bidsTemp.sort((a, b) => a[0] - b[0]).reverse());
    }
  };

  useEffect(() => {
    updateOrderBook();
  }, [timestamp]);

  return (
    <Card sx={{ p: 2 }}>
      <Typography color="textPrimary" variant="h6" sx={{ textAlign: 'center' }}>
        Order Book
      </Typography>
      <Table
        stickyHeader
        sx={{
          '& .MuiTableCell-root': {
            color: '#f44336',
            border: 'none',
            padding: '1px 0px',
          },
        }}
      >
        <TableHead>
          <TableRow
            sx={{
              '& .MuiTableCell-root': {
                border: 'none',
                padding: '1px 0px',
                color: 'white',
                background: '#1c253180',
                backdropFilter: 'blur(3px)',
              },
            }}
          >
            <TableCell>Price</TableCell>
            <TableCell>Amount</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {asks &&
            asks.slice(-20).map((order, index) => (
              <TableRow hover key={index}>
                <TableCell>{formatterFloat.format(order[0])}</TableCell>
                <TableCell>{formatterFloat.format(order[1])}</TableCell>
              </TableRow>
            ))}
          {bids &&
            bids.slice(0, 20).map((order, index) => (
              <TableRow
                hover
                key={index}
                sx={{
                  '& .MuiTableCell-root': {
                    color: '#01ab56',
                    border: 'none',
                    padding: '1px 0px',
                  },
                }}
              >
                <TableCell>{formatterFloat.format(order[0])}</TableCell>
                <TableCell>{formatterFloat.format(order[1])}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </Card>
  );
};

OrderBookTable.propTypes = {
  tenant: PropTypes.string,
  exchange: PropTypes.string,
  assetPair: PropTypes.string,
};

export default OrderBookTable;
