import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import {
  addComment,
  deleteComment,
  getVideoComments,
  updateComment,
} from '../controllers/comment.controller.js';

const router = Router();

// When the whole route needs to be verified
router.use(verifyJWT);

// Routes
router.route('/get-video-comments/:videoId').get(getVideoComments);
router.route('/add-comment/:videoId').post(addComment);
router.route('/update-comment/:videoId').patch(updateComment);
router.route('/delete-comment').delete(deleteComment);

export default router;
