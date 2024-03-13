import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/multer.middleware.js';
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishAVideo,
  togglePublishStatus,
  updateVideo,
} from '../controllers/video.controllers.js';

const router = Router();
const multerOptions = upload.fields([
  {
    name: 'videoFile',
    maxCount: 1,
  },
  {
    name: 'thumbnail',
    maxCount: 1,
  },
]);

router.use(verifyJWT);

router.route('/get-all-videos/filters').get(getAllVideos);
router.route('/publish-video').post(multerOptions, publishAVideo);
router.route('/get-video-by-id/:videoId').get(getVideoById);
router
  .route('/update-video/:videoId')
  .post(upload.single('thumbnail'), updateVideo);
router.route('/delete-video/:videoId').delete(deleteVideo);
router.route('/toggle-video-status/:videoId').post(togglePublishStatus);

export default router;
