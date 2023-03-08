import { useEffect } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Box, Divider, Drawer } from '@material-ui/core';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import ReceiptIcon from '@material-ui/icons/Receipt';
import BriefcaseIcon from '../icons/Briefcase';
import SettingsSuggestIcon from '@material-ui/icons/SettingsSuggest';
import ChartSquareBarIcon from '../icons/ChartSquareBar';
import ShareIcon from '../icons/Share';
import Logo from './Logo';
import NavSection from './NavSection';
import Scrollbar from './Scrollbar';

const sections = [
  {
    title: '',
    items: [
      {
        title: 'Exchanges',
        path: '/exchange',
        icon: <ChartSquareBarIcon fontSize="small" />,
      },
      {
        title: 'Services',
        path: '/service',
        icon: <SettingsSuggestIcon fontSize="small" />,
      },
      {
        title: 'DataStreams',
        path: '/datastream',
        icon: <ReceiptIcon fontSize="small" />,
      },
      {
        title: 'Magicboxes',
        path: '/magicbox',
        icon: <BriefcaseIcon fontSize="small" />,
      },
      {
        title: 'Trades',
        path: '/trade',
        icon: <ShareIcon fontSize="small" />,
      },
    ],
  },
];

const DashboardSidebar = (props) => {
  const { onMobileClose, openMobile } = props;
  const location = useLocation();
  const lgUp = useMediaQuery((theme) => theme.breakpoints.up('lg'));

  useEffect(() => {
    if (openMobile && onMobileClose) {
      onMobileClose();
    }
  }, [location.pathname]);

  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <Scrollbar options={{ suppressScrollX: true }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            p: 2,
          }}
        >
          <RouterLink to="/">
            <Logo
              sx={{
                height: 40,
                width: 40,
              }}
            />
          </RouterLink>
        </Box>

        <Divider />
        <Box sx={{ p: 2 }}>
          {sections.map((section) => (
            <NavSection
              key={section.title}
              pathname={location.pathname}
              sx={{
                '& + &': {
                  mt: 3,
                },
              }}
              {...section}
            />
          ))}
        </Box>
      </Scrollbar>
    </Box>
  );

  if (lgUp) {
    return (
      <Drawer
        anchor="left"
        open
        PaperProps={{
          sx: {
            backgroundColor: 'background.paper',
            height: '100% !important',
            width: 280,
          },
        }}
        variant="permanent"
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Drawer
      anchor="left"
      onClose={onMobileClose}
      open={openMobile}
      PaperProps={{
        sx: {
          backgroundColor: 'background.paper',
          width: 280,
        },
      }}
      variant="temporary"
    >
      {content}
    </Drawer>
  );
};

DashboardSidebar.propTypes = {
  onMobileClose: PropTypes.func,
  openMobile: PropTypes.bool,
};

export default DashboardSidebar;
