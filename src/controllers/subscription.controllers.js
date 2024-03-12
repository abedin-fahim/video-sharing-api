import mongoose from 'mongoose';
import { Subscription } from '../models/subscription.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { StatusCodes } from 'http-status-codes';
import { ApiResponse } from '../utils/ApiResponse.js';

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  try {
    const subscriber = Subscription.findOneAndDelete({
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
      .json(
        new ApiResponse(StatusCodes.OK, subscriber, 'Subscription removed')
      );
  } catch (error) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Could not toggle subscription',
      error?.message
    );
  }
});

// controller to return subscriber list of a channel
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
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'channel',
          foreignField: '_id',
          as: 'owner',
        },
      },
      {
        $addFields: {
          subscriberCount: {
            $size: '$subscribers',
          },
        },
      },
      {
        $project: {
          channel: 1,
          subscriberCount: 1,
          subscribers: {
            username: '$subscribers.username',
            avatar: '$subscribers.avatar',
            fullName: '$subscribers.fullName',
          },
          // Both approach are just fine.
          owner: {
            username: 1,
            avatar: 1,
            fullName: 1,
          },
        },
      },
    ]);

    if (!subscriberAggregate?.length) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Channel has no followers');
    }

    const options = {
      page,
      limit,
    };

    const subscribers = await Subscription.aggregatePaginate(
      subscriberAggregate,
      options
    );

    return res
      .status(StatusCodes.OK)
      .json(
        new ApiResponse(StatusCodes.OK, subscribers, 'Subscribers returned')
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

  try {
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
        },
      },
      {
        $addFields: {
          channelCount: {
            $size: '$following',
          },
        },
      },
      {
        $project: {
          _id: 1,
          channelCount: 1,
          following: {
            username: '$following.username',
            avatar: '$following.avatar',
            fullName: '$following.fullName',
          },
        },
      },
    ]);

    const options = {
      page,
      limit,
    };

    const following = Subscription.aggregatePaginate(
      followingAggregate,
      options
    );

    if (!following?.length) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'No channel found');
    }

    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(StatusCodes.OK, following, 'Following fetched'));
  } catch (error) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Error while fetching following',
      error?.message
    );
  }
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
