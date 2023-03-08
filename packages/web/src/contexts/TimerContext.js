import { createContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const TimerContext = createContext();

export const TimerProvider = (props) => {
  const { children } = props;
  const initialState = {
    timestamp: null,
  };

  const [data, setData] = useState(initialState);
  const { timestamp } = data;

  useEffect(() => {
    const timerId = setInterval(() => {
      setData({
        ...data,
        timestamp: new Date().getTime(),
      });
    }, [500]);

    return () => {
      clearInterval(timerId);
    };
  }, []);

  return (
    <TimerContext.Provider
      value={{
        timestamp,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
};

TimerProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const TimerConsumer = TimerContext.Consumer;

export default TimerContext;
