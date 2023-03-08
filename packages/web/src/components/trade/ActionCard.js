import PropTypes from 'prop-types';
import { Autocomplete, Box, Button, InputAdornment, Paper, TextField, Typography } from '@material-ui/core';
import { useEffect, useState } from 'react';
import { fetchWrapper } from '../../helpers/fetch-wrapper';
import toast from 'react-hot-toast';

const ActionCard = (props) => {
  const { type, tenant, exchange, assetPair } = props;
  const [orderType, setOrderType] = useState('Limit');
  const [price, setPrice] = useState();
  const [amount, setAmount] = useState();
  const [cost, setCost] = useState();

  useEffect(() => {
    if (!price || !amount) return;

    setCost(+price * +amount);
  }, [price, amount]);

  const handleClick = async () => {
    if (!tenant || !exchange || !assetPair || !amount || (orderType !== 'Market' && !price)) return;

    const jsonData = {
      action: 'createOrder',
      exchangeId: exchange,
      payload: {
        symbol: assetPair,
        side: type,
        type: orderType.toLowerCase(),
        amountBase: amount,
        price: orderType === 'Market' ? undefined : price,
        createdByModule: 'web',
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
      toast.success('Submitted an order');
    } else {
      toast.error('Failed to submit an order');
    }
  };

  return (
    <Paper
      elevation={12}
      sx={{
        maxWidth: 500,
        mx: 'auto',
        p: 3,
      }}
    >
      <Typography color="textPrimary" variant="h6">
        {type === 'buy' ? 'Buy' : 'Sell'} {assetPair && assetPair.split('/')[0]}
      </Typography>
      {orderType !== 'Market' && (
        <Box
          sx={{
            mt: 2,
          }}
        >
          <TextField
            fullWidth
            label="Price"
            variant="standard"
            value={price || ''}
            onChange={(e) => setPrice(e.target.value)}
            InputProps={{
              endAdornment: <InputAdornment position="end">{assetPair && assetPair.split('/')[1]}</InputAdornment>,
            }}
          />
        </Box>
      )}
      <Box
        sx={{
          mt: 2,
        }}
      >
        <TextField
          fullWidth
          label="Amount"
          variant="standard"
          value={amount || ''}
          onChange={(e) => setAmount(e.target.value)}
          InputProps={{
            endAdornment: <InputAdornment position="end">{assetPair && assetPair.split('/')[0]}</InputAdornment>,
          }}
        />
      </Box>
      {orderType !== 'Market' && (
        <Box
          sx={{
            mt: 2,
          }}
        >
          <TextField
            fullWidth
            label="Cost"
            variant="standard"
            value={cost || ''}
            InputProps={{
              endAdornment: <InputAdornment position="end">{assetPair && assetPair.split('/')[1]}</InputAdornment>,
            }}
          />
        </Box>
      )}
      {/* <Box
        sx={{
          mt: 2,
        }}
      >
        <TextField fullWidth label="Quote Price" variant="standard" />
      </Box> */}
      <Box sx={{ mt: 3 }}>
        <Autocomplete
          options={['Limit', 'Market']}
          filterSelectedOptions
          value={orderType}
          onChange={(event, value) => {
            setOrderType(value);
            setPrice();
          }}
          renderInput={(params) => <TextField {...params} label="Type" />}
        />
      </Box>
      <Box sx={{ mt: 3 }}>
        <Button color={type === 'buy' ? 'primary' : 'error'} fullWidth variant="contained" onClick={handleClick}>
          {type === 'buy' ? 'Buy' : 'Sell'}
        </Button>
      </Box>
    </Paper>
  );
};

ActionCard.propTypes = {
  type: PropTypes.string.isRequired,
  tenant: PropTypes.string,
  exchange: PropTypes.string,
  assetPair: PropTypes.string,
};

export default ActionCard;
