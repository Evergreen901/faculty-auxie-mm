import { Suspense, lazy } from 'react';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';

const Loadable = (Component) => (props) =>
  (
    <Suspense fallback={<LoadingScreen />}>
      <Component {...props} />
    </Suspense>
  );

const Exchange = Loadable(lazy(() => import('./pages/Exchange')));
const Service = Loadable(lazy(() => import('./pages/Service')));
const DataStream = Loadable(lazy(() => import('./pages/DataStream')));
const MagicBox = Loadable(lazy(() => import('./pages/MagicBox')));
const Trade = Loadable(lazy(() => import('./pages/Trade')));

const routes = [
  {
    path: '',
    element: <Layout />,
    children: [
      {
        path: '',
        element: <Exchange />,
      },
      {
        path: 'exchange',
        element: <Exchange />,
      },
      {
        path: 'service',
        element: <Service />,
      },
      {
        path: 'datastream',
        element: <DataStream />,
      },
      {
        path: 'magicbox',
        element: <MagicBox />,
      },
      {
        path: 'trade',
        element: <Trade />,
      },
    ],
  },
];

export default routes;
