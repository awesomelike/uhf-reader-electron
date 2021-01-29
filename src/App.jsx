import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { TextBox, Button } from 'react-uwp';
import { Theme as UWPThemeProvider, getTheme } from 'react-uwp/Theme';
import './index.css';
import isIP from 'validator/lib/isIP';
import isPort from 'validator/lib/isPort';

const { ipcRenderer } = require('electron');

const App = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [ip, setIp] = useState('');
  const [port, setPort] = useState(6000);
  const [errors, setErrors] = useState([]);

  const handleClick = () => {
    const localErrors = [];
    if (!isIP(ip, '4')) {
      localErrors.push('IP not valid');
    }
    if (!isPort(port.toString())) {
      localErrors.push('Port number not valid');
    }

    setErrors(localErrors);
    if (!localErrors.length) {
      ipcRenderer.send('connectRequest', ip, port);
    }
  };

  return (
    <UWPThemeProvider
      theme={getTheme({
        themeName: 'light',
      })}
    >
      <div className="container" key="container">
        <div className="logo" key="logoContainer">
          <img width="30%" src="images/IUT.jpg" alt="IUT" />
        </div>
        <div className="form" key="form">
          <h2>
            IUT UHF Reader
          </h2>

          <TextBox
            placeholder="IP address"
            onChangeValue={(value) => setIp(value)}
          />

          <TextBox
            placeholder="Port number"
            onChangeValue={(value) => setPort(value)}
          />
          <Button background onClick={handleClick}>Connect</Button>
          {errors.map((e) => (<p className="errorMessage">{e}</p>))}
        </div>

      </div>
    </UWPThemeProvider>

  );
};

ReactDOM.render(<App />, document.getElementById('root'));

export default App;
