import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/multer.middleware.js';
import { publishAVideo } from '../controllers/video.controllers.js';

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
router.route('/publish-video').post(multerOptions, publishAVideo);

export default router;
