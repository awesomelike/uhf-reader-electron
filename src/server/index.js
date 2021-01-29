const { ipcMain } = require('electron');
const net = require('net');
const app = require('express')();
const http = require('http');
const socketIO = require('socket.io');
const notifier = require('node-notifier');
const ms = require('ms');

const emitter = require('./events');
const { ANSWER_MODE, INVENTORY } = require('./constants/commands');
const handler = require('./util/tags');

const port = process.env.PORT || 3001;

const server = http.createServer(app);
const io = socketIO(server);

require('dotenv').config();

server.listen(port, () => {
  try {
    console.log(`Listener service started on ${port}`);
    let reader = null;
    ipcMain.on('connectRequest', (_, requestIp, requestPort) => {
      reader = new net.Socket();

      reader.setEncoding('ascii');
      reader.setKeepAlive(true, ms('1m')); // important!

      reader.connect(requestPort, requestIp, () => {})
        .on('error', (error) => {
          if (error.code === 'ETIMEDOUT') {
            emitter.emit('uhfTimeout');
          }
        });

      reader.on('connect', () => {
        console.log('UHF Reader connected');
        emitter.emit('uhfConnected', requestIp, requestPort);

        // Set to Answer mode
        reader.write(ANSWER_MODE);

        io.on('connection', (socket) => {
          console.log('Client connected!');

          const SET = new Set();

          let interval;
          socket.on('bookId', (bookId) => {
            console.log(`Client sent bookId=${bookId}`);

            // Send inventory command
            interval = setInterval(() => {
              reader.write(INVENTORY);
            }, 100);

            notifier.notify({
              title: 'The reader is ready to listen',
              message: `Received book id: ${bookId}`,
            });

            reader.on('data', handler(SET, (tag) => {
              SET.add(tag);
              socket.emit('bookItem', { bookId, rfidTag: tag });
              console.log('hash: ', tag);
            }));
          });
          socket.on('rfidTag', () => {
            const message = 'RFID Lookup request received';
            console.log(message);

            // Send inventory command
            interval = setInterval(() => {
              reader.write(INVENTORY);
            }, 100);

            notifier.notify({
              title: message,
              message,
            });

            reader.on('data', handler(SET, (tag) => {
              SET.add(tag);
              console.log('hash: ', tag);
              socket.emit('bookItemDetails', tag);
            }));
          });

          socket.on('inventory', () => {
            const message = 'Inventory has started!';

            // Send inventory command
            interval = setInterval(() => {
              reader.write(INVENTORY);
            }, 100);

            console.log(message);

            notifier.notify({
              title: message,
              message,
            });

            reader.on('data', handler(SET, (tag) => {
              SET.add(tag);
              console.log('hash: ', tag);
            }));
            setTimeout(() => {
              clearInterval(interval);
              socket.emit('inventoryResults', { items: Array.from(SET) });
            }, 10000);
          });

          socket.on('delete', (data) => {
            console.log('Delete request received, hash:', data.rfidTag);
            SET.delete(data.rfidTag);
          });

          socket.on('disconnect', () => {
            console.log('Client disconnected');
            reader.removeAllListeners();
            socket.removeAllListeners();
            if (interval) clearInterval(interval);
            SET.clear();
          });
        });

        reader.on('error', (error) => {
          console.log('UHF Reader error!', error);
          process.exit(-1);
        });
        reader.on('timeout', () => {
          console.log('Reader connection timeout!');
          process.exit(-1);
        });
        reader.on('close', (error) => {
          console.log('Client destroyed:', reader.destroyed);
          console.log('UHF Reader connection closed!', error);
          process.exit(-1);
        });
      });
    });
    ipcMain.on('disconnectRequest', () => {
      if (reader && reader.destroy) {
        reader.destroy('Frontend disconnect received');
      }
    });
  } catch (error) {
    console.log(error);
    process.exit(-1);
  }
});
