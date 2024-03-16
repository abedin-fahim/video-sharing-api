import mongoose from 'mongoose';
import { Subscription } from '../models/subscription.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { StatusCodes } from 'http-status-codes';
import { ApiResponse } from '../utils/ApiResponse.js';

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  const subscriber = await Subscription.findOneAndDelete({
    subscriber: req.user?._id,
    channel: channelId,
  });

  if (!subscriber) {
    const newSubscriber = await Subscription.create({
      channel: channelId,
      subscriber: req.user?.id,
    });

    return res
      .status(StatusCodes.OK)
      .json(
        new ApiResponse(StatusCodes.OK, newSubscriber, 'Subscription added')
      );
  }
  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, subscriber, 'Subscription removed'));
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
    const subscriberAggregate = await Subscription.aggregate([
      {
        $match: {
          channel: new mongoose.Types.ObjectId(channelId),
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'subscriber',
          foreignField: '_id',
          as: 'subscribers',
          // pipeline: [
          //   {
          //     $project: {
          //       username: 1,
          //       avatar: 1,
          //       fullName: 1,
          //     },
          //   },
          // ],
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'channel',
          foreignField: '_id',
          as: 'owner',
          pipeline: [
            {
              $project: {
                fullName: 1,
                avatar: 1,
                username: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          owner: {
            $first: '$owner',
          },
          // subscribers: {
          //   $first: '$subscribers',
          // },
          subscriberCount: {
            $size: '$subscribers',
          },
        },
      },
      {
        $skip: page,
      },
      {
        $limit: limit,
      },
    ]);

    if (!subscriberAggregate?.length) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Channel has no followers');
    }

    return res
      .status(StatusCodes.OK)
      .json(
        new ApiResponse(
          StatusCodes.OK,
          subscriberAggregate[0],
          'Subscribers returned'
        )
      );
  } catch (error) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Could not get subscribers',
      error?.message
    );
  }
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const followingAggregate = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'subscriber',
        foreignField: '_id',
        as: 'following',
        pipeline: [
          {
            $project: {
              avatar: 1,
              fullName: 1,
              username: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        channelCount: {
          $size: '$following',
        },
      },
    },
    // {
    //   $project: {
    //     _id: 1,
    //     channelCount: 1,
    //     following: {
    //       username: 1,
    //       avatar: 1,
    //       fullName: 1,
    //     },
    //   },
    // },
    {
      $skip: page,
    },
    {
      $limit: limit,
    },
  ]);

  if (!followingAggregate?.length) {
    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(StatusCodes.OK, {}, 'No channel subscribed'));
  }

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        followingAggregate[0],
        'Following fetched'
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
