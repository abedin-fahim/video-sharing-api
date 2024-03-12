import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { StatusCodes } from 'http-status-codes';

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    // if(!user){
    //   throw new ApiError(500)
    // }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    // Since we are not passing all the required property, we'll skip the validation
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, 'Could not generate access and refresh token');
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //Todo: Send email to verify user email
  const { username, email, fullName, password } = req.body;

  if (
    [username, email, fullName, password].some((field) => field?.trim() === '')
  ) {
    throw new ApiError(400, 'All fields are required');
  }

  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    throw new ApiError(409, 'User with same username or email already exists');
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  let coverImageLocalPath = '';

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, 'Avatar file is required');
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, 'Avatar file is required');
  }

  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    avatar: avatar.url,
    coverImage: coverImage?.url || '',
    password,
    email,
  });

  const createdUser = await User.findById(user._id).select(
    '-password -refreshToken'
  );

  if (!createdUser) {
    throw new ApiError(500, 'Something went wrong while registering user');
  }

  res
    .status(201)
    .json(new ApiResponse(201, createdUser, 'User successfully registered'));
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // if ([username, email, password].some((field) => field?.trim() === '')) {
  //   throw new ApiError(401, 'Please provide valid credentials');
  // }

  // console.log(req.body);

  if (!(username || email)) {
    throw new ApiError(401, 'Username or email is required');
  }

  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!existingUser) {
    throw new ApiError(404, 'User does not exist');
  }

  const isPasswordValid = await existingUser.comparePassword(password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Password does not match');
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    existingUser._id
  );

  const loggedInUser = await User.findById(existingUser._id).select(
    '-password -refreshToken'
  );

  const options = { httpOnly: true, secure: true };

  return res
    .status(200)
    .cookie('accessToken', accessToken, options)
    .cookie('refreshToken', refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        'User logged in successfully'
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  const { _id } = req.user;

  await User.findByIdAndUpdate(
    _id,
    {
      $unset: { refreshToken: 1 },
    },
    // This will ensure to return the return the updated user
    { new: true }
  );

  const options = { httpOnly: true, secure: true };

  return res
    .status(200)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
    .json(new ApiResponse(200, {}, 'User logged out successfully'));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, 'Unauthorized request');
  }

  try {
    const payload = await jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(payload?._id);

    if (!user) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, 'Refresh token is expired');
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user?._id);

    return res
      .status(200)
      .cookie('accessToken', accessToken, options)
      .cookie('refreshToken', newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, newRefreshToken },
          'Access token refreshed'
        )
      );
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || 'Could not generate new refresh token'
    );
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const existingUser = await User.findById(req.user?._id);
  //? Don't need to check if user exist bc user is bound to exist at this point of operation omitting an extra db call
  // if (!existingUser) {
  //   throw new ApiError(401, 'User not found!');
  // }

  const isPasswordValid = await existingUser.comparePassword(currentPassword);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Password does not match');
  }

  existingUser.password = newPassword;
  await existingUser.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Password updated successfully'));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, 'User returned successfully'));
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(401, 'All fields are required');
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    {
      new: true,
    }
  ).select('-password -refreshToken');

  return res
    .status(201)
    .json(new ApiResponse(201, updatedUser, 'User updated successfully'));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(401, 'Avatar is missing!');
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(401, 'Error while uploading avatar');
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { avatar: avatar.url },
    },
    { new: true }
  ).select('-password -refreshToken');

  //Todo: Delete old cloudinary image
  // 1. Update the user model to make the avatar field an object and store the url and public id in it
  // 2. While updating the avatar or the cover image we simply use the public_id returned from the cloudinary and stored in the db;
  // deleteFromCloudinary()

  return res
    .status(201)
    .json(new ApiResponse(201, { user }, 'Avatar updated successfully'));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(401, 'Cover Image is missing!');
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(401, 'Error while uploading avatar');
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select('-password -refreshToken');

  //Todo: Delete old cloudinary image

  return res
    .status(200)
    .json(new ApiResponse(201, { user }, 'Cover Image updated successfully'));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  // Followers / Subscribers + Following + isSubscribed
  const { username } = req.params;

  if (!username.trim()) {
    throw new ApiError(404, 'User not found!');
  }

  try {
    // Instead of writing multiple db queries to get the formatted data, we can use something called db aggregation / left join
    const channel = await User.aggregate([
      {
        $match: {
          username: username?.toLowerCase(),
        },
      },
      {
        $lookup: {
          from: 'subscriptions',
          localField: '_id',
          foreignField: 'channel',
          as: 'subscribers',
        },
      },
      {
        $lookup: {
          from: 'subscriptions',
          localField: '_id',
          foreignField: 'subscriber',
          as: 'following',
        },
      },
      {
        $addFields: {
          subscriberCount: {
            $size: '$subscribers',
          },
          following: {
            $size: '$following',
          },
          isSubscribed: {
            $cond: {
              if: {
                $in: [
                  req.user?._id,
                  // new mongoose.Types.ObjectId(req.user?._id),
                  '$subscribers.subscriber',
                ],
              },
              then: true,
              else: false,
            },
            // Consider using $unwind to flatten the subscribers and following arrays for easier processing in subsequent stages.
            // $in: [req.user?._id, '$subscriptions'],
          },
        },
      },
      {
        $project: {
          fullName: 1,
          email: 1,
          username: 1,
          avatar: 1,
          coverImage: 1,
          subscriberCount: 1,
          following: 1,
          isSubscribed: 1,
        },
      },
    ]);

    if (!channel?.length) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Channel does not exist');
    }
    // console.log(channel);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { user: channel[0] },
          'Fetched user channel successfully'
        )
      );
  } catch (error) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Could not fetch user',
      error?.message
    );
  }
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        // We can directly access the _id like this, bc mongoose doesn't work in the aggregate methods, so it doesn't convert the id;
        // Basically, we have to do it ourself
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: 'videos',
        localField: 'watchHistory',
        foreignField: '_id',
        as: 'WatchHistory',
        pipeline: [
          {
            $lookup: {
              from: 'users',
              localField: 'owner',
              foreignField: '_id',
              as: 'owner',
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
              owner: {
                // $arrayElemAt: ['$owner', 0],
                $first: '$owner',
              },
            },
          },
        ],
      },
    },
  ]);

  // console.log(user);

  return res
    .status(201)
    .json(new ApiResponse(201, user[0].watchHistory, 'Watch history returned'));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
