import { useState, useEffect, useContext } from 'react';
import { Helmet } from 'react-helmet-async';
import { Box, Container, Grid, MenuItem, TextField, Typography } from '@material-ui/core';
import { ActionCard, BalanceTable, HistoryTable, OrderBookTable, ActiveOrderTable } from '../components/trade';
import useSettings from '../hooks/useSettings';
import GlobalContext from '../contexts/GlobalContext';

const Trade = () => {
  const { settings } = useSettings();
  const { gatherer, getServices } = useContext(GlobalContext);
  const [data, setData] = useState();
  const [tenant, setTenant] = useState();
  const [exchange, setExchange] = useState();
  const [assetPair, setAssetPair] = useState();
  const [tenantOptions, setTenantOptions] = useState([]);
  const [exchangeOptions, setExchangeOptions] = useState([]);
  const [assetPairOptions, setAssetPairOptions] = useState([]);

  useEffect(() => {
    if (!gatherer || !gatherer.workplans?.length) return;

    const temp = [];
    for (const workplan of gatherer.workplans) {
      if (!temp[workplan.tenant]) temp[workplan.tenant] = {};
      if (!temp[workplan.tenant][workplan.exchangeId]) temp[workplan.tenant][workplan.exchangeId] = workplan.assetPairs;
      else {
        temp[workplan.tenant][workplan.exchangeId] = [
          ...temp[workplan.tenant][workplan.exchangeId],
          ...workplan.assetPairs,
        ];
      }
    }

    setData(temp);
    const options = [];
    for (const tenantItem in temp) {
      if (tenantItem) {
        options.push(tenantItem);
      }
    }

    setTenantOptions(options);
    setTenant('');
    setExchange('');
    setAssetPair('');
    setExchangeOptions([]);
    setAssetPairOptions([]);
  }, [gatherer]);

  useEffect(() => {
    if (!tenant) return;

    const options = [];
    for (const item in data[tenant]) {
      if (item) {
        options.push(item);
      }
    }

    setExchangeOptions(options);
    setAssetPairOptions([]);
    setAssetPair('');
  }, [tenant]);

  useEffect(() => {
    if (!exchange) return;
    setAssetPairOptions(data[tenant][exchange]);
    setAssetPair('');
  }, [exchange]);

  useEffect(() => {
    getServices();
  }, []);

  return (
    <>
      <Helmet>
        <title>Trade</title>
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
            Trade
          </Typography>
          <Box
            sx={{
              alignItems: 'center',
              display: 'flex',
              flexWrap: 'wrap',
              mt: 3,
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
                label="Tenant"
                name="tenant"
                select
                variant="outlined"
                value={tenant || ''}
                onChange={(e) => {
                  setTenant(e.target.value);
                }}
              >
                {tenantOptions.map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </TextField>
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
                label="Exchange"
                name="exchange"
                select
                variant="outlined"
                value={exchange || ''}
                onChange={(e) => {
                  setExchange(e.target.value);
                }}
              >
                {exchangeOptions &&
                  exchangeOptions.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
              </TextField>
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
                label="AssetPair"
                name="assetPair"
                select
                variant="outlined"
                value={assetPair || ''}
                onChange={(e) => {
                  setAssetPair(e.target.value);
                }}
              >
                {assetPairOptions &&
                  assetPairOptions.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
              </TextField>
            </Box>
          </Box>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <BalanceTable tenant={tenant} exchange={exchange} />
              <Grid container spacing={1} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <ActionCard type="buy" tenant={tenant} exchange={exchange} assetPair={assetPair} />
                </Grid>
                <Grid item xs={6}>
                  <ActionCard type="sell" tenant={tenant} exchange={exchange} assetPair={assetPair} />
                </Grid>
              </Grid>
              <ActiveOrderTable tenant={tenant} exchange={exchange} />
            </Grid>

            <Grid item xs={6}>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <OrderBookTable tenant={tenant} exchange={exchange} assetPair={assetPair} />
                </Grid>
                <Grid item xs={6}>
                  <HistoryTable tenant={tenant} exchange={exchange} assetPair={assetPair} />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </>
  );
};

export default Trade;
