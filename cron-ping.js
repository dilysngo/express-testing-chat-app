const cron = require('node-cron');

// Schedule tasks to be run on the server.
cron.schedule('*/1 * * * * *', function () {
  console.log('running a task every 10 second');
});
