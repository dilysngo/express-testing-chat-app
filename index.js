// server.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const Pusher = require('pusher');

const app = express();

// Body parser middleware
app.use(cors());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(session({secret: 'mano1234', saveUninitialized: true, resave: true}));

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Create an instance of Pusher
const pusher = new Pusher({
  appId: '1413466',
  key: '5fac8a3813e9263926e4',
  secret: '8622d38acc4badf7c023',
  cluster: 'ap1',
  encrypted: true,
});

app.listen(3000, () => {
  console.log('Server is up on 3000');
});

app.get('/', (req, res) => {
  return res.sendFile('index.html');
});

app.post('/join-chat', (req, res) => {
  // store username in session
  req.session.username = req.body.username;
  req.session.save();
  console.log('/join-chat', req.session);
  return res.json('Joined');
});

app.get('/user', (req, res) => {
  const sessionUser = req.session.username;
  console.log('/user', req.session);
  return res.send(sessionUser);
});

app.post('/pusher/auth', (req, res) => {
  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;
  // Retrieve username from session and use as presence channel user_id
  console.log('/pusher/auth', req.session);
  const presenceData = {
    user_id: req.session.username,
  };
  const auth = pusher.authenticate(socketId, channel, presenceData);
  return res.send(auth);
});

app.post('/send-message', (req, res) => {
  pusher.trigger('presence-groupChat', 'message_sent', {
    username: req.body.username,
    message: req.body.message,
  });
  return res.send('Message sent');
});
