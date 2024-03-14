import { Router } from 'express';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import {
  createTweet,
  deleteTweet,
  getUserTweets,
  updateTweet,
} from '../controllers/tweet.controllers.js';

const router = Router();

// Protecting routes
router.use(verifyJWT);

router.route('/create-tweet').post(upload.single('image'), createTweet);
router.route('/get-user-tweets').get(getUserTweets);
router.route('/update-tweet/:tweetId').patch(updateTweet);
router.route('/delete-tweet/:tweetId').delete(deleteTweet);

export default router;
