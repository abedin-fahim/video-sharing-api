import { Router } from 'express';
import {
  changeCurrentPassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateUserAvatar,
  updateUserCoverImage,
  updateUserDetails,
} from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// router.route('/register').post(registerUser);
const userImages = upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
]);

router.post('/register', userImages, registerUser);
router.post('/login', loginUser);

// Protected routes
router.post('/logout', verifyJWT, logoutUser);
router.post('/refresh-token', refreshAccessToken);

// User Settings / different way to write routes
router.route('/change-password').post(verifyJWT, changeCurrentPassword);
router.route('/profile').post(verifyJWT, getCurrentUser);
router.route('/update-profile').patch(verifyJWT, updateUserDetails);
router
  .route('/update-avatar')
  .patch(verifyJWT, upload.single('avatar'), updateUserAvatar);
router
  .route('/update-cover')
  .patch(verifyJWT, upload.single('coverImage'), updateUserCoverImage);

router.route('/c/:username').get(verifyJWT, getUserChannelProfile);
router.route('/history').get(verifyJWT, getWatchHistory);

export default router;
