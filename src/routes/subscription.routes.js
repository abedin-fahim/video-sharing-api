import { Router } from 'express';
import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
} from '../controllers/subscription.controllers.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router
  .route('/toggle-subscription/:channelId')
  .post(verifyJWT, toggleSubscription);
router
  .route('/get-user-channel-subscribers/:channelId')
  .get(getUserChannelSubscribers);
router.route('/get-subscribed-channel/:channelId').get(getSubscribedChannels);

export default router;
