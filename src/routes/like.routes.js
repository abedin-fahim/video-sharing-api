import { Router } from 'express';
import {
  getLikedVideos,
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
} from '../controllers/like.controllers.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/toggle-video-like/:videoId', verifyJWT, toggleVideoLike);
router.post('/toggle-comment-like/:commentId', verifyJWT, toggleCommentLike);
router.post('/toggle-tweet-like/:tweetId', verifyJWT, toggleTweetLike);
router.get('/get-liked-videos', verifyJWT, getLikedVideos);

export default router;
