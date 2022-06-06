const {log, error} = console;
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const Pusher = require('pusher');
const got = require('got');
const cors = require('cors');
const cron = require('node-cron');
const app = express();

//Tulind Functions
const {sma_inc, ema_inc, markers_inc, rsi_inc, macd_inc} = require('./indicators');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({secret: 'secret-key', saveUninitialized: false, resave: false}));

app.listen(3000, () => {
  console.log('Server is up on 3000');
});

// Create an instance of Pusher
const pusher = new Pusher({
  // appId: process.env.PUSHER_APP_ID,
  // key: process.env.PUSHER_APP_KEY,
  // secret: process.env.PUSHER_APP_SECRET,
  // cluster: process.env.PUSHER_APP_CLUSTER,
  appId: '1413466',
  key: '5fac8a3813e9263926e4',
  secret: '8622d38acc4badf7c023',
  cluster: 'ap1',
  encrypted: true,
});

/**
 * @dev realtime data chart
 */
app.get('/:symbol/:interval', async (req, res) => {
  try {
    const {symbol, interval} = req.params;
    const resp = await got(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}`);
    const data = JSON.parse(resp.body);
    let klinedata = data.map((d) => ({
      time: d[0] / 1000,
      open: d[1] * 1,
      high: d[2] * 1,
      low: d[3] * 1,
      close: d[4] * 1,
    }));
    klinedata = await sma_inc(klinedata);
    klinedata = await ema_inc(klinedata);
    klinedata = markers_inc(klinedata);
    klinedata = await rsi_inc(klinedata);
    klinedata = await macd_inc(klinedata);
    res.status(200).json(klinedata);
  } catch (err) {
    res.status(500).send(err);
  }
});

/**
 * @dev chat app
 */
app.get('/', (req, res) => {
  res.sendFile('index.html');
});

app.post('/join-chat', (req, res) => {
  // store username in session
  req.session.username = req.body.username;
  console.log('name', req.session);
  res.json({
    status: 'Joined',
    data: {
      username: req.body.username,
    },
  });
});

app.post('/pusher/auth', (req, res) => {
  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;
  // Retrieve username from session and use as presence channel user_id
  console.log('name', req.session);
  const presenceData = {
    user_id: req.session.username,
  };
  const auth = pusher.authenticate(socketId, channel, presenceData);
  res.send(auth);
});

app.post('/send-message', (req, res) => {
  pusher.trigger('presence-groupChat', 'message_sent', {
    username: req.body.username,
    message: req.body.message,
  });
  res.send('Message sent');
});

async function fetchData() {
  const resp = await got(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m`);
  const data = JSON.parse(resp.body);
  let klinedata = data.map((d) => ({
    time: d[0] / 1000,
    open: d[1] * 1,
    high: d[2] * 1,
    low: d[3] * 1,
    close: d[4] * 1,
  }));
  klinedata = await sma_inc(klinedata);
  klinedata = await ema_inc(klinedata);
  klinedata = markers_inc(klinedata);
  klinedata = await rsi_inc(klinedata);
  klinedata = await macd_inc(klinedata);

  pusher.trigger('klinedata', 'message_sent', {
    klinedata: klinedata[klinedata.length - 1],
  });
}

cron.schedule('*/2 * * * * *', function () {
  try {
    fetchData();
  } catch (err) {
    console.log(error);
  }
});
