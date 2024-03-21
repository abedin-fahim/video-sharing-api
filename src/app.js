import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUI from 'swagger-ui-express';
import YAML from 'yamljs';

const app = express();
const swaggerDoc = YAML.load('./swagger.yaml');

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(
  express.json({
    limit: '16kb',
  })
);
// URL Encoder: any spaces will be converted to %20 and etc
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static('public'));
// Cookie Parser, to set the cookie and read the cookie securely from the server and in the browser
app.use(cookieParser());

// Routes import
import userRouter from './routes/user.routes.js';
import statusRouter from './routes/healthcheck.routes.js';
import commentRouter from './routes/comment.routes.js';
import likeRouter from './routes/like.routes.js';
import playlistRouter from './routes/playlist.routes.js';
import subscriptionRouter from './routes/subscription.routes.js';
import tweetRouter from './routes/tweet.routes.js';
import videoRouter from './routes/video.routes.js';

// Routes declaration
app.use('/', swaggerUI.serve, swaggerUI.setup(swaggerDoc));
app.use('/api/v1/users', userRouter);
app.use('/api/v1/status', statusRouter);
app.use('/api/v1/comments', commentRouter);
app.use('/api/v1/likes', likeRouter);
app.use('/api/v1/playlist', playlistRouter);
app.use('/api/v1/subscription', subscriptionRouter);
app.use('/api/v1/tweets', tweetRouter);
app.use('/api/v1/videos', videoRouter);

export { app };
