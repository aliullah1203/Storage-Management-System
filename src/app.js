const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');

function createApp() {
  const app = express();
  app.use(cors());
  app.use(morgan('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // static uploads
  const path = require('path');
  app.use('/uploads', require('express').static(path.join(__dirname, '..', 'uploads')));

  app.use('/api', routes);

  app.get('/', (req, res) => res.json({ ok: true, message: 'Storage Management API' }));

  return app;
}

module.exports = createApp;
