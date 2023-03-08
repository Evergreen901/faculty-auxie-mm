import PropTypes from 'prop-types';
import { Box, Card, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@material-ui/core';
import { formatterFloat } from '../../helpers/functions';
import Scrollbar from '../Scrollbar';
import TimerContext from '../../contexts/TimerContext';
import { useContext, useEffect, useState } from 'react';
import { fetchWrapper } from '../../helpers/fetch-wrapper';
import useMounted from '../../hooks/useMounted';

const HistoryTable = (props) => {
  const mounted = useMounted();
  const { tenant, exchange, assetPair } = props;
  const [history, setHistory] = useState([]);
  const { timestamp } = useContext(TimerContext);

  const updateHistory = async () => {
    if (!assetPair) {
      if (mounted.current) {
        setHistory([]);
      }
      return;
    }

    const res = await fetchWrapper.get(
      process.env.REACT_APP_WEBREDIS_URL +
        '/XREVRANGE/stream%2E' +
        tenant +
        '%2E' +
        exchange +
        '%2EwatchTrades%2E' +
        assetPair.replace('/', '%2F') +
        '/%2B/%2D/count/20'
    );

    const tradeHistory = res.XREVRANGE;
    const historyTemp = [];
    for (const item of tradeHistory) {
      const parsedData = JSON.parse(item.msg.data);
      for (let i = 0; i < parsedData.length; i++) {
        historyTemp.push({
          time: parsedData[i].datetime.split('T')[1].slice(0, -5),
          type: parsedData[i].side,
          price: parsedData[i].price,
          size: parsedData[i].cost,
        });
      }
    }

    if (mounted.current) {
      setHistory(historyTemp.sort((a, b) => (a.time > b.time ? -1 : a.time === b.time ? 0 : 1)));
    }
  };

  useEffect(() => {
    updateHistory();
  }, [timestamp]);

  return (
    <Card sx={{ p: 2 }}>
      <Typography color="textPrimary" variant="h6" sx={{ textAlign: 'center' }}>
        Trades
      </Typography>

      <Scrollbar>
        <Box sx={{ maxHeight: 632 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow
                sx={{
                  '& .MuiTableCell-root': {
                    border: 'none',
                    padding: '1px 0px',
                    background: '#1c253180',
                    backdropFilter: 'blur(3px)',
                  },
                }}
              >
                <TableCell>Price</TableCell>
                <TableCell>Size (USD)</TableCell>
                <TableCell>Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history &&
                history.slice(0, 30).map((order, index) => (
                  <TableRow
                    hover
                    key={index}
                    sx={{
                      '& .MuiTableCell-root': {
                        color: order.type === 'sell' ? '#f44336' : '#01ab56',
                        border: 'none',
                        padding: '1px 0px',
                      },
                    }}
                  >
                    <TableCell>{formatterFloat.format(order.price)}</TableCell>
                    <TableCell>{formatterFloat.format(order.size)}</TableCell>
                    <TableCell>{order.time}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Box>
      </Scrollbar>
    </Card>
  );
};

HistoryTable.propTypes = {
  tenant: PropTypes.string,
  exchange: PropTypes.string,
  assetPair: PropTypes.string,
};

export default HistoryTable;
