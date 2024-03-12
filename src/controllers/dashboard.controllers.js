import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { StatusCodes } from 'http-status-codes';
import { Video } from '../models/video.model.js';

const isChannelExist = async (channelId) => {
  try {
    const user = await User.findById(channelId);
    return !!user;
  } catch (error) {
    console.log(error);
    return error;
  }
};

const getChannelStates = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  const isChannelAvailable = await isChannelExist(channelId);
  if (!isChannelAvailable) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Channel not found');
  }

  const isUserChannelOwner = channelId === req.user?._id.toString();
  if (!isUserChannelOwner) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Not authorized to access the data'
    );
  }

  const statsAggregation = await Video.aggregate([
    {
      $match: {
        owner: mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: 'likes',
        localField: '_id',
        foreignField: 'video',
        as: 'likes',
      },
    },
    {
      $lookup: {
        from: 'subscribers',
        localField: 'owner',
        foreignField: 'channel',
        as: 'followers',
      },
    },
    {
      $lookup: {
        from: 'subscribers',
        localField: 'owner',
        foreignField: 'subscriber',
        as: 'following',
      },
    },
    {
      $group: {
        _id: null,
        videoCount: {
          $sum: 1,
        },
        likeCount: {
          $first: {
            $sum: '$likes',
          },
        },
        videoViewsCount: {
          $sum: '$views',
        },
        followerCount: {
          $first: {
            $size: '$followers',
          },
        },
        followingCount: {
          $first: {
            $size: '$following',
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        videoCount: 1,
        likeCount: 1,
        videoViewsCount: 1,
        followerCount: 1,
        followingCount: 1,
      },
    },
  ]);

  if (!statsAggregation || statsAggregation.length === 0) {
    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(StatusCodes.OK, {}, 'No videos found'));
  }

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(StatusCodes.OK, statsAggregation[0], 'Videos fetched')
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  const isChannelAvailable = await isChannelExist(channelId);
  if (!isChannelAvailable) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Channel not found');
  }

  const videosAggregate = await Video.aggregate([
    {
      $match: {
        owner: channelId,
        isPublished: true,
      },
    },
    {
      $lookup: {
        from: 'user',
        localField: 'owner',
        foreignField: '_id',
        as: 'owner',
      },
    },
    {
      $unwind: '$owner',
    },
    {
      $project: {
        videoFile: {
          url: 1,
        },
        thumbnail: {
          url: 1,
        },
        title: 1,
        description: 1,
        duration: 1,
        view: 1,
        owner: {
          fullName: 1,
          avatar: 1,
          username: 1,
        },
      },
    },
  ]);

  if (!videosAggregate || videosAggregate.length === 0) {
    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(StatusCodes.OK, {}, 'No videos found'));
  }

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(StatusCodes.OK, videosAggregate[0], 'Videos fetched')
    );
});

export { getChannelStates, getChannelVideos };
