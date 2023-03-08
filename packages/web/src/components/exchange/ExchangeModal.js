import {
  Autocomplete,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Modal,
  Paper,
  Switch,
  TextField,
  Typography,
} from '@material-ui/core';
import toast from 'react-hot-toast';
import { useContext, useEffect, useState } from 'react';
import KeyIcon from '@material-ui/icons/VpnKey';
import ModalsContext from '../../contexts/ModalsContext';
import GlobalContext from '../../contexts/GlobalContext';
import XIcon from '../../icons/X';

const exchangeOptions = [
  'aax',
  'alpaca',
  'ascendex',
  'bequant',
  'bibox',
  'bigone',
  'binance',
  'binancecoinm',
  'binanceus',
  'binanceusdm',
  'bit2c',
  'bitbank',
  'bitbay',
  'bitbns',
  'bitcoincom',
  'bitfinex',
  'bitfinex2',
  'bitflyer',
  'bitforex',
  'bitget',
  'bithumb',
  'bitmart',
  'bitmex',
  'bitopro',
  'bitpanda',
  'bitrue',
  'bitso',
  'bitstamp',
  'bitstamp1',
  'bittrex',
  'bitvavo',
  'bkex',
  'bl3p',
  'blockchaincom',
  'btcalpha',
  'btcbox',
  'btcex',
  'btcmarkets',
  'btctradeua',
  'btcturk',
  'buda',
  'bw',
  'bybit',
  'bytetrade',
  'cex',
  'coinbase',
  'coinbaseprime',
  'coinbasepro',
  'coincheck',
  'coinex',
  'coinfalcon',
  'coinmate',
  'coinone',
  'coinspot',
  'crex24',
  'cryptocom',
  'currencycom',
  'delta',
  'deribit',
  'digifinex',
  'eqonex',
  'exmo',
  'flowbtc',
  'fmfwio',
  'ftx',
  'ftxus',
  'gate',
  'gateio',
  'gemini',
  'hitbtc',
  'hitbtc3',
  'hollaex',
  'huobi',
  'huobijp',
  'huobipro',
  'idex',
  'independentreserve',
  'indodax',
  'itbit',
  'kraken',
  'kucoin',
  'kucoinfutures',
  'kuna',
  'latoken',
  'lbank',
  'lbank2',
  'liquid',
  'luno',
  'lykke',
  'mercado',
  'mexc',
  'mexc3',
  'ndax',
  'novadax',
  'oceanex',
  'okcoin',
  'okex',
  'okex5',
  'okx',
  'paymium',
  'phemex',
  'poloniex',
  'probit',
  'qtrade',
  'ripio',
  'stex',
  'therock',
  'tidebit',
  'tidex',
  'timex',
  'tokocrypto',
  'upbit',
  'wavesexchange',
  'wazirx',
  'whitebit',
  'woo',
  'yobit',
  'zaif',
  'zb',
  'zipmex',
  'zonda',
];

const ExchangeModal = () => {
  const { modal, modalData, openModal, closeModal } = useContext(ModalsContext);
  const {
    gatherer,
    updateService,
    getServices,
    secret: secretKey,
    setSecret: setSecretKey,
  } = useContext(GlobalContext);
  const [tenant, setTenant] = useState();
  const [exchange, setExchange] = useState();
  const [apiKey, setApiKey] = useState();
  const [secret, setSecret] = useState();
  const [isTest, setIsTest] = useState(true);

  const onSave = async () => {
    if (!gatherer) return;
    if (!gatherer.exchanges) {
      gatherer.exchanges = {};
    }

    const newExchange = modalData
      ? {
          ...gatherer.exchanges[modalData.tenant][modalData.exchange],
          apiKey,
          secret: secret === '********' ? secretKey : secret,
          test: isTest,
        }
      : {
          apiKey,
          secret: secret === '********' ? secretKey : secret,
          test: isTest,
        };

    if (modalData) {
      delete gatherer.exchanges[modalData.tenant][modalData.exchange];

      if (Object.keys(gatherer.exchanges[modalData.tenant]).length === 0) {
        delete gatherer.exchanges[modalData.tenant];
      }
    }

    if (gatherer.exchanges[tenant]) {
      if (gatherer.exchanges[tenant][exchange]) {
        toast.error('Existing tenant/exchange');
        return;
      }
      gatherer.exchanges[tenant][exchange] = newExchange;
    } else {
      gatherer.exchanges[tenant] = {};
      gatherer.exchanges[tenant][exchange] = newExchange;
    }

    const gathererUpdated = await updateService('gatherer', gatherer);
    if (!gathererUpdated) {
      toast.error('Failed to add exchange');
      return;
    }

    toast.success(modalData ? 'Saved' : 'Added new exchange');
    getServices();
    closeModal('exchange');
    setTenant('');
    setExchange('');
    setApiKey('');
    setSecret('');
    setIsTest(true);
  };

  useEffect(() => {
    if (!modalData) {
      setTenant();
      setExchange();
      setApiKey();
      setSecret();
      setIsTest(true);
      closeModal('secretEdit');
      setSecretKey();
      return;
    }

    setTenant(modalData.tenant);
    setExchange(modalData.exchange);
    setApiKey(modalData.apiKey);
    setSecret(typeof modalData.secret === 'string' ? modalData.secret : '********');
    setIsTest(modalData.test);
    setSecretKey();
  }, [modalData]);

  const handleSecretClick = () => {
    openModal('secretEdit');
  };

  useEffect(() => {
    if (!secretKey) return;
    setSecret('********');
  }, [secretKey]);

  return (
    <Modal open={modal.exchange} aria-labelledby="modal-modal-title" aria-describedby="modal-modal-description">
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
        }}
      >
        <Paper
          elevation={12}
          sx={{
            maxWidth: 500,
            mx: 'auto',
            p: 4,
          }}
        >
          <IconButton
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
            }}
            onClick={() => closeModal('exchange')}
          >
            <XIcon />
          </IconButton>
          <Typography color="textPrimary" variant="h6">
            {modalData ? 'Edit' : 'New'} Exchange
          </Typography>
          <Box
            sx={{
              mt: 2,
            }}
          >
            <TextField
              fullWidth
              label="Tenant"
              variant="standard"
              value={tenant || ''}
              onChange={(e) => setTenant(e.target.value)}
            />
          </Box>
          <Box
            sx={{
              mt: 4,
            }}
          >
            {/* <TextField
              fullWidth
              label="Exchange"
              variant="standard"
              value={exchange || ''}
              onChange={(e) => setExchange(e.target.value)}
            /> */}
            <Autocomplete
              options={exchangeOptions}
              filterSelectedOptions
              value={exchange || ''}
              onChange={(event, value) => {
                setExchange(value);
              }}
              renderInput={(params) => <TextField {...params} label="Exchange" />}
            />
          </Box>
          <Box
            sx={{
              mt: 2,
            }}
          >
            <TextField
              fullWidth
              label="ApiKey"
              variant="standard"
              value={apiKey || ''}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </Box>
          <Box
            sx={{
              mt: 2,
            }}
          >
            <TextField
              fullWidth
              label="Secret"
              variant="standard"
              value={secret || ''}
              onChange={(e) => setSecret(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleSecretClick}>
                      <KeyIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          <Box sx={{ mt: 3 }}>
            <Typography color="textPrimary" variant="standard">
              Test
            </Typography>
            <Switch color="primary" checked={isTest} onClick={() => setIsTest((prev) => !prev)} />
          </Box>
          <Box sx={{ mt: 3 }}>
            <Button color="primary" fullWidth variant="contained" onClick={onSave}>
              Save
            </Button>
          </Box>
        </Paper>
      </Box>
    </Modal>
  );
};

export default ExchangeModal;
