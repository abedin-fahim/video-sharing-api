import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import {
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylistById,
  getUserPlaylists,
  removeVideoFromPlaylist,
  updatePlaylist,
} from '../controllers/playlist.controllers.js';

const router = Router();

router.route('/create-playlist').post(verifyJWT, createPlaylist);
router.route('/get-user-playlist/:userId').get(verifyJWT, getUserPlaylists);
router.route('/get-playlist-by-id/:playlistId').get(verifyJWT, getPlaylistById);
router.route('/add-video-to-playlist').patch(verifyJWT, addVideoToPlaylist);
router
  .route('/remove-video-from-playlist/:playlistId')
  .patch(verifyJWT, removeVideoFromPlaylist);
router.route('/delete-playlist/:playlistId').delete(verifyJWT, deletePlaylist);
router.route('/update-playlist/:playlistId').patch(verifyJWT, updatePlaylist);

export default router;
