import mongoose, { isValidObjectId } from 'mongoose';
import { Tweet } from '../models/tweet.model.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { StatusCodes } from 'http-status-codes';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const imageLocalPath = req.file?.path;

  let image;
  if (imageLocalPath) {
    image = await uploadOnCloudinary(imageLocalPath);
  }

  try {
    const tweet = await Tweet.create({
      owner: _id,
      content,
      image,
    });

    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(StatusCodes.OK, tweet, 'Tweet created'));
  } catch (error) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Could not create tweet',
      error?.message
    );
  }
});

const getUserTweets = asyncHandler(async (req, res) => {
  const { _id } = req?.user;
  const { page = 1, limit = 10, sort } = req.query;

  if (!_id) {
    throw new error(StatusCodes.BAD_REQUEST, 'User id is required');
  }

  try {
    const userTweetAggregation = await Tweet.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(_id),
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'owner',
          foreignField: '_id',
          as: 'owner',
        },
      },
      {
        $addFields: {
          tweetCount: {
            $size: '$owner',
          },
        },
      },
      {
        $project: {
          content: 1,
          image: 1,
          owner: {
            fullName: '$owner.fullName',
            username: '$owner.username',
            avatar: '$owner.avatar',
          },
        },
      },
    ]);

    const options = {
      page,
      limit,
    };
    const userTweets = await Tweet.aggregatePaginate(
      userTweetAggregation,
      options
    );

    if (sort) {
      userTweets.sort({ createdAt: sort });
    }

    if (!userTweets?.length) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'User does not have any tweets'
      );
    }

    return res
      .status(StatusCodes.OK)
      .json(
        new ApiResponse(StatusCodes.OK, userTweets[0], 'User tweets fetched')
      );
  } catch (error) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Could not fetch user tweets'
    );
  }
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;

  if (content.trim().length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Content is required');
  }

  try {
    const updatedTweet = await Tweet.findByIdAndUpdate(
      tweetId,
      { content },
      { new: true }
    );

    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(StatusCodes.OK, updatedTweet, 'Tweet updated'));
  } catch (error) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Could not update tweet',
      error?.message
    );
  }
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!tweetId || tweetId.trim().length === '') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Tweet id is required');
  }

  try {
    await Tweet.findByIdAndDelete(tweetId);
    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(StatusCodes.OK, {}, 'Tweet deleted'));
  } catch (error) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Could not delete tweet'
    );
  }
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
