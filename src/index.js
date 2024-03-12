import 'dotenv/config';
import connectDB from './db/index.js';
import { app } from './app.js';

const PORT = process.env.PORT || 8000;

connectDB()
  .then(() => {
    app.on('error', (error) => {
      console.log('Could not connect to DB:', error);
    });
    app.listen(PORT, () => {
      console.log('App is listening at:', PORT);
    });
  })
  .catch((error) => console.log('DB connection failed', error));
