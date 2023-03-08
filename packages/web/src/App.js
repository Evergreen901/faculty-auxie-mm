import { useRoutes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { CssBaseline, ThemeProvider } from '@material-ui/core';
import RTL from './components/RTL';
import SettingsDrawer from './components/SettingsDrawer';
import useScrollReset from './hooks/useScrollReset';
import useSettings from './hooks/useSettings';
import routes from './routes';
import { createCustomTheme } from './theme';
import * as dotenv from 'dotenv';

dotenv.config();

const App = () => {
  const content = useRoutes(routes);
  const { settings } = useSettings();

  useScrollReset();

  const theme = createCustomTheme({
    direction: settings.direction,
    responsiveFontSizes: settings.responsiveFontSizes,
    roundedCorners: settings.roundedCorners,
    theme: settings.theme,
  });

  return (
    <ThemeProvider theme={theme}>
      <RTL direction={settings.direction}>
        <CssBaseline />
        <Toaster position="top-center" />
        <SettingsDrawer />
        {content}
      </RTL>
    </ThemeProvider>
  );
};

export default App;
