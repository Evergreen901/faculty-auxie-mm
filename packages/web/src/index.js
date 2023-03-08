import 'react-perfect-scrollbar/dist/css/styles.css';
import 'nprogress/nprogress.css';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import LocalizationProvider from '@material-ui/lab/LocalizationProvider';
import AdapterDateFns from '@material-ui/lab/AdapterDateFns';
import StyledEngineProvider from '@material-ui/core/StyledEngineProvider';
import App from './App';
import { SettingsProvider } from './contexts/SettingsContext';
import { ModalsProvider } from './contexts/ModalsContext';
import { GlobalProvider } from './contexts/GlobalContext';
import { TimerProvider } from './contexts/TimerContext';

ReactDOM.render(
  <StrictMode>
    <HelmetProvider>
      <StyledEngineProvider injectFirst>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <GlobalProvider>
            <TimerProvider>
              <ModalsProvider>
                <SettingsProvider>
                  <BrowserRouter>
                    <App />
                  </BrowserRouter>
                </SettingsProvider>
              </ModalsProvider>
            </TimerProvider>
          </GlobalProvider>
        </LocalizationProvider>
      </StyledEngineProvider>
    </HelmetProvider>
  </StrictMode>,
  document.getElementById('root')
);
