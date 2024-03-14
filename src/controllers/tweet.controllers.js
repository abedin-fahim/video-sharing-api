import mongoose, { isValidObjectId } from 'mongoose';
import { Tweet } from '../models/tweet.model.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { StatusCodes } from 'http-status-codes';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { _id } = req.user;
  const imageLocalPath = req.file?.path;

  let image;
  if (imageLocalPath) {
    image = await uploadOnCloudinary(imageLocalPath);
  }

  let tweetContent = {};
  if (image) {
    tweetContent = {
      owner: _id,
      content,
      image: {
        publicId: image.public_id,
        url: image.url,
      },
    };
  } else {
    tweetContent = {
      owner: _id,
      content,
    };
  }

  try {
    const tweet = await Tweet.create(tweetContent);

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
  const { page = 1, limit = 10, sort = 1 } = req.query;

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
          as: 'creator',
          pipeline: [
            {
              $project: {
                fullName: 1,
                username: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          creator: {
            $first: '$creator',
          },
        },
      },
      {
        $sort: {
          createdAt: sort,
        },
      },
      {
        // Instead of manually doing the aggregation pagination, instead we can do the following
        $facet: {
          data: [
            {
              $skip: page,
            },
            {
              $limit: limit,
            },
          ],
        },
      },
    ]);

    if (!userTweetAggregation || !userTweetAggregation[0].data) {
      return res
        .status(StatusCodes.OK)
        .json(
          new ApiResponse(
            StatusCodes.OK,
            userTweetAggregation,
            'User has no tweets'
          )
        );
    }

    return res
      .status(StatusCodes.OK)
      .json(
        new ApiResponse(
          StatusCodes.OK,
          userTweetAggregation,
          'User tweets fetched'
        )
      );
  } catch (error) {
    console.log(error);
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Could not fetch user tweets',
      error
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
