import PropTypes from 'prop-types';
import { Card, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@material-ui/core';
import TimerContext from '../../contexts/TimerContext';
import { useContext, useEffect, useState } from 'react';
import useMounted from '../../hooks/useMounted';
import { fetchWrapper } from '../../helpers/fetch-wrapper';
import { formatterFloat } from '../../helpers/functions';

const BalanceTable = (props) => {
  const { tenant, exchange } = props;
  const mounted = useMounted();
  const { timestamp } = useContext(TimerContext);
  const [balances, setBalances] = useState();
  const [balanceSnapshot, setBalanceSnapshot] = useState();

  const updateBalance = async () => {
    if (!exchange) {
      if (mounted.current) {
        setBalances([]);
      }
      return;
    }

    const res = await fetchWrapper.get(
      process.env.REACT_APP_WEBREDIS_URL +
        '/XREVRANGE/stream%2E' +
        tenant +
        '%2E' +
        exchange +
        '%2EwatchBalance/%2B/%2D/count/1'
    );

    if (!res?.XREVRANGE.length) {
      if (mounted.current) {
        setBalances([]);
      }
      return;
    }
    const parsedData = JSON.parse(res?.XREVRANGE[0].msg.data);
    const balanceTemp = [];

    for (const currency in parsedData.balances) {
      if (
        currency &&
        currency !== 'free' &&
        currency !== 'used' &&
        currency !== 'total' &&
        currency !== 'timestamp' &&
        currency !== 'datetime'
      ) {
        let lastUpdated = new Date();
        if (balanceSnapshot && balanceSnapshot[currency]) {
          lastUpdated = balanceSnapshot[currency].lastUpdated;

          if (balanceSnapshot[currency].free !== parsedData.balances[currency].free) lastUpdated = new Date();
        }

        balanceTemp.push({
          currency,
          lastUpdated,
          ...parsedData.balances[currency],
        });

        parsedData.balances[currency].lastUpdated = lastUpdated;
      }
    }

    if (mounted.current) {
      setBalances(balanceTemp);
      setBalanceSnapshot(parsedData.balances);
    }
  };

  useEffect(() => {
    updateBalance();
  }, [timestamp]);

  const getOffsetByTime = (lastTime) => {
    let delta = new Date().getTime() - lastTime.getTime();

    if (delta > 10000) delta = 5000;
    // console.log(Math.floor((5000 - delta) / 50).toString(16));
    return Math.floor((5000 - delta) / 50).toString(16);
  };

  return (
    <Card sx={{ p: 2 }}>
      <Typography color="textPrimary" variant="h5" sx={{ textAlign: 'center' }}>
        Balances
      </Typography>
      <Table
        sx={{
          '& .MuiTableCell-root': {
            border: '',
          },
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell>Currency</TableCell>
            <TableCell>Free</TableCell>
            <TableCell>Used</TableCell>
            <TableCell>Total</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {balances &&
            balances.map((balance) => (
              <TableRow
                hover
                key={balance.currency}
                sx={{
                  '&.MuiTableRow-root': {
                    background: '#6e9770' + getOffsetByTime(balance.lastUpdated),
                  },
                }}
              >
                <TableCell>{balance.currency}</TableCell>
                <TableCell>{formatterFloat.format(balance.free)}</TableCell>
                <TableCell>{formatterFloat.format(balance.used)}</TableCell>
                <TableCell>{formatterFloat.format(balance.total)}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </Card>
  );
};

BalanceTable.propTypes = {
  tenant: PropTypes.string,
  exchange: PropTypes.string,
};

export default BalanceTable;
