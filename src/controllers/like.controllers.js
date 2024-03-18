import mongoose from 'mongoose';
import { Like } from '../models/like.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { StatusCodes } from 'http-status-codes';

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  // It's assumed that video already exist, this request can come from a valid video.

  // Also, There could be case made that the video is found but couldn't deleted, that seems can be negligible.
  // That approached is following in toggleCommentLike controller
  const isVideoLiked = await Like.findOneAndDelete({
    video: videoId,
    likedBy: req.user?._id,
  });

  if (isVideoLiked) {
    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(StatusCodes.OK, {}, 'Video like removed'));
  }

  const likeVideo = await Like.create({
    video: videoId,
    likedBy: req.user?._id,
  });

  if (!likeVideo) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Video could not be liked'
    );
  }
  return res
    .status(StatusCodes.CREATED)
    .json(new ApiResponse(StatusCodes.CREATED, {}, 'Video like added'));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Comment not found');
  }

  const likedComment = await Like.findOne({
    comment: commentId,
    likedBy: req.user?._id,
  });

  if (likedComment) {
    await Like.deleteById(likedComment._id);
    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(StatusCodes.OK, {}, 'Like removed'));
  }

  const likingComment = await Like.create({
    comment: commentId,
    likedBy: req.user?._id,
  });
  if (!likingComment) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Could not like comment');
  }

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, {}, 'Like added'));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  const isTweetLiked = await Like.findOneAndDelete({
    tweet: tweetId,
    _id: req.user?._id,
  });

  if (isTweetLiked) {
    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(StatusCodes.OK, {}, 'Tweet like removed'));
  }

  await Like.create({
    tweet: tweetId,
    likedBy: req.user?._id,
  });
  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, {}, 'Tweet like added'));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { page = 1, limit = 10 } = req.body;

  try {
    // The localField while using $lookup operator will be based on the model here
    const videoAggregate = await Like.aggregate([
      {
        $match: {
          likedBy: new mongoose.Types.ObjectId(_id),
          video: {
            $exists: true,
          },
        },
      },
      {
        $lookup: {
          from: 'videos',
          localField: 'video',
          foreignField: '_id',
          as: 'likedVideos',
        },
      },
      {
        $addFields: {
          totalLikedVideos: { $sum: 1 },
        },
      },
      {
        $unwind: '$likedVideos',
      },
      {
        $lookup: {
          from: 'users',
          localField: 'likedBy',
          foreignField: '_id',
          as: 'owner',
        },
      },
      {
        $unwind: '$owner',
      },
      {
        $project: {
          _id: 1,
          video: 1,
          likedVideos: {
            title: 1,
            duration: 1,
            'thumbnail.url': 1,
          },
          owner: {
            fullName: 1,
            avatar: 1,
            username: 1,
          },
        },
      },
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: limit,
      },
    ]);

    if (!videoAggregate || videoAggregate.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(new ApiResponse(StatusCodes.NOT_FOUND, {}, 'No videos found!'));
    }

    return res
      .status(StatusCodes.OK)
      .json(
        new ApiResponse(
          StatusCodes.OK,
          videoAggregate,
          'Video fetched successfully'
        )
      );
  } catch (error) {
    console.log(error);
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Error fetching videos', error);
  }
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
