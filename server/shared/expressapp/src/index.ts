import express, { Router } from "express";
import cors from 'cors';
import notFoundMiddleware, { errorMiddleware } from 'notfoundmiddleware';
import log from "logger";
import "dotenv/config"
import config from "config";

import morgan from './config/morgan';

const randomPort = (min = 3000, max = 6000) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  // The maximum is exclusive and the minimum is inclusive
  return Math.floor(Math.random() * (max - min) + min);
}

const expressApp = (router: Router, _mw?: string[]) => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(morgan);

  app.use('/', router);
  app.use(notFoundMiddleware, errorMiddleware);

  const port = config.port || randomPort();
  app.listen(port, () => {
    log.info(`Listening: http://localhost:${port}`);
  });
};

export default expressApp;
