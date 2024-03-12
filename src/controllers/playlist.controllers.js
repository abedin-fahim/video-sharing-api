import mongoose, { isValidObjectId } from 'mongoose';
import { Playlist } from '../models/playlist.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { StatusCodes } from 'http-status-codes';
import { Video } from '../models/video.model.js';

const isUserPlaylistOwner = async (playlistId, userId) => {
  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    return false;
  }

  return playlist?.owner.toString() === userId.toString();
};

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const { _id } = req.user;

  const playlist = await Playlist.create({
    name,
    description: description || '',
    owner: _id,
    videos: [],
  });

  if (!playlist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Could not create the playlist'
    );
  }

  return res
    .status(StatusCodes.CREATED)
    .json(new ApiResponse(StatusCodes.CREATED, playlist, 'Playlist created'));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const playlist = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'owner',
        foreignField: '_id',
        as: 'playlist',
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        videos: 1,
        playlist: {
          username: 1,
          fullName: 1,
          avatar: 1,
        },
      },
    },
  ]);

  // Could've added pagination here
  if (!playlist?.length) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'No playlist found');
  }

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, playlist, 'Playlists fetched'));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!playlistId) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Playlist id is required');
  }

  // There is potentially an error here in the following aggregation in the second pipeline,
  // I'm suppose to search only te user who's the playlist owner
  // I feel like it should be working
  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'owner',
        foreignField: '_id',
        as: 'playlist',
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        videos: 1,
        playlist: {
          username: 1,
          fullName: 1,
          avatar: 1,
        },
      },
    },
  ]);

  if (playlist?.length) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'No playlist found with the id');
  }

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, playlist, 'Playlist fetched'));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  // const { playlistId, videoId } = req.params;
  const { playlistId, videoId } = req.body;

  // Only the owner can update the playlist i.e add video, remove video, and update details
  // This functionality is needed is many endpoints.
  // So creating a separate function (which can be in a utils file and pass down the user)
  const playlist = await isUserPlaylistOwner(playlistId, videoId);

  if (!playlist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Playlist does not exist');
  }

  const isVideoExist = await Video.findById(videoId);
  if (!isVideoExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Video not found');
  }

  playlist.video.push(videoId);
  const updatedPlaylist = await playlist.save({ validateBeforeSave: false });

  if (!updatedPlaylist) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Could not add video to the playlist'
    );
  }

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        updatePlaylist,
        'Added video to the playlist'
      )
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { videoId } = req.body;

  const validity = await isUserPlaylistOwner(playlistId, videoId);
  if (!validity) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User can not remove video');
  }

  const updatedPlaylist = await Playlist.findOneAndUpdate(
    { _id: playlistId },
    {
      // the $pull operator, which removes all instances of a specified value (videoId in this case) from an array
      $pull: {
        video: videoId,
      },
    },
    { new: true }
  );

  if (!updatedPlaylist) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Could not remove video from the playlist'
    );
  }

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, updatePlaylist, 'Video removed'));
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const playlistValidity = isUserPlaylistOwner(playlistId, req.user?._id);

  if (!playlistValidity) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Playlist does not exist');
  }
  const playlist = await Playlist.findOneAndDelete({ _id: playlistId });

  if (!playlist) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Could not delete playlist'
    );
  }

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, {}, 'Playlist deleted'));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  const playlistValidity = await isUserPlaylistOwner(playlistId, req.user?._id);
  if (!playlistValidity) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Playlist does not exist');
  }

  const updatedPlaylist = await Playlist.findOneAndUpdate(
    { _id: playlistId },
    { name, description },
    { new: true }
  );

  if (!updatedPlaylist) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Could not update playlist'
    );
  }

  return res
    .status(StatusCodes.ACCEPTED)
    .json(
      new ApiResponse(StatusCodes.ACCEPTED, updatedPlaylist, 'Playlist updated')
    );
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
