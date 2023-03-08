import { createContext, useState } from 'react';
import PropTypes from 'prop-types';

const ModalsContext = createContext();

export const ModalsProvider = (props) => {
  const { children } = props;
  const initialState = {
    exchange: false,
    exchangeEdit: false,
    magicboxEdit: false,
    datastream: false,
    datastreamEdit: false,
    subscription: false,
    secretEdit: false,
  };

  const [modal, setModal] = useState(initialState);
  const [modalData, setModalData] = useState();

  const openModal = (name) => {
    setModal((prev) => ({ ...prev, [name]: true }));
  };

  const closeModal = (name) => {
    setModal((prev) => ({ ...prev, [name]: false }));
  };

  const initModal = () => {
    setModal(initialState);
  };

  return (
    <ModalsContext.Provider
      value={{
        modal,
        modalData,
        setModalData,
        openModal,
        closeModal,
        initModal,
      }}
    >
      {children}
    </ModalsContext.Provider>
  );
};

ModalsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const ModalsConsumer = ModalsContext.Consumer;

export default ModalsContext;
