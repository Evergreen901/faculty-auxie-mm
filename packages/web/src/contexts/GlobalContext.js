import { createContext, useState } from 'react';
import PropTypes from 'prop-types';
import { fetchWrapper } from '../helpers/fetch-wrapper';

const GlobalContext = createContext();

export const GlobalProvider = (props) => {
  const { children } = props;
  const initialState = {
    exchanges: [],
    dataStreams: [],
    gatherer: null,
    executor: null,
    magicbox: null,
    dbsync: null,
    apiserver: null,
    secret: null,
  };

  const [data, setData] = useState(initialState);
  const { exchanges, dataStreams, gatherer, executor, magicbox, dbsync, apiserver, secret } = data;

  const getServices = async () => {
    const res = await fetchWrapper.get(process.env.REACT_APP_WEBREDIS_URL + '/get/config.settings.GATHERER');
    if (!res) {
      console.log('failed to read gatherer config');
    }

    const executorResult = await fetchWrapper.get(process.env.REACT_APP_WEBREDIS_URL + '/get/config.settings.EXECUTOR');
    if (!executorResult) {
      console.log('failed to read executor config');
    }

    const magicboxResult = await fetchWrapper.get(process.env.REACT_APP_WEBREDIS_URL + '/get/config.settings.MAGICBOX');
    if (!magicboxResult.get) {
      console.log('failed to read magicbox config');
    }

    const dbsyncResult = await fetchWrapper.get(process.env.REACT_APP_WEBREDIS_URL + '/get/config.settings.DBSYNC');
    if (!dbsyncResult.get) {
      console.log('failed to read dbSync config');
    }

    const apiServerResult = await fetchWrapper.get(
      process.env.REACT_APP_WEBREDIS_URL + '/get/config.settings.APISERVER'
    );
    if (!apiServerResult.get) {
      console.log('failed to read apiServer config');
    }

    const jsonResult = JSON.parse(res?.get);
    const exchangesTemp = [];

    for (const tenant in jsonResult?.exchanges) {
      if (tenant) {
        for (const exchange in jsonResult.exchanges[tenant]) {
          if (exchange) {
            exchangesTemp.push({
              tenant,
              exchange,
              ...jsonResult.exchanges[tenant][exchange],
            });
          }
        }
      }
    }

    setData({
      ...data,
      exchanges: exchangesTemp,
      dataStreams: jsonResult?.workplans ?? [],
      gatherer: jsonResult,
      executor: JSON.parse(executorResult?.get),
      magicbox: JSON.parse(magicboxResult?.get),
      dbsync: JSON.parse(dbsyncResult?.get),
      apiserver: JSON.parse(apiServerResult?.get),
    });
  };

  const updateService = async (service, param) => {
    const res = await fetchWrapper.get(
      process.env.REACT_APP_WEBREDIS_URL +
        '/set/config.settings.' +
        service.toUpperCase() +
        '/' +
        JSON.stringify(param, null, 2)
          .replaceAll(/(?:\r\n|\r|\n)/g, '%0D%0A')
          .replaceAll('/', '%2F')
          .replaceAll('.', '%2E')
          .replaceAll('+', '%2B')
    );

    if (service === 'gatherer' && executor) {
      executor.exchanges = param.exchanges;

      await fetchWrapper.get(
        process.env.REACT_APP_WEBREDIS_URL +
          '/set/config.settings.EXECUTOR/' +
          JSON.stringify(executor, null, 2)
            .replaceAll(/(?:\r\n|\r|\n)/g, '%0D%0A')
            .replaceAll('/', '%2F')
            .replaceAll('.', '%2E')
            .replaceAll('+', '%2B')
      );
    }

    if (service === 'gatherer' && dbsync) {
      dbsync.workplans = [];
      for (const workplan of param.workplans) {
        let index = dbsync.workplans.findIndex((item) => item.tenantId === workplan.tenant);
        if (index < 0) {
          dbsync.workplans.push({
            tenantId: workplan.tenant,
            assets: [],
          });
          index = dbsync.workplans.length - 1;
        }

        for (const dataPoint of workplan.dataPoints) {
          let suffix = '';
          if (dataPoint !== 'watchBalance') {
            suffix = '.' + workplan.assetPairs[0];
          }

          dbsync.workplans[index].assets.push(
            'stream.' + workplan.tenant + '.' + workplan.exchangeId + '.' + dataPoint + suffix
          );
        }
      }

      await fetchWrapper.get(
        process.env.REACT_APP_WEBREDIS_URL +
          '/set/config.settings.DBSYNC/' +
          JSON.stringify(dbsync, null, 2)
            .replaceAll(/(?:\r\n|\r|\n)/g, '%0D%0A')
            .replaceAll('/', '%2F')
            .replaceAll('.', '%2E')
      );
    }

    return res?.set[1] === 'OK';
  };

  const addWorkPlan = () => {
    if (!magicbox?.workplans) {
      magicbox.workplans = [];
    }

    magicbox.workplans.push({
      tenantId: '',
      plugins: [],
      subscriptions: [],
    });

    setData({
      ...data,
      magicbox,
    });
  };

  const setSecret = (payload) => {
    setData({
      ...data,
      secret: payload,
    });
  };

  return (
    <GlobalContext.Provider
      value={{
        getServices,
        updateService,
        exchanges,
        dataStreams,
        gatherer,
        executor,
        magicbox,
        dbsync,
        apiserver,
        secret,
        addWorkPlan,
        setSecret,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

GlobalProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const GlobalConsumer = GlobalContext.Consumer;

export default GlobalContext;
