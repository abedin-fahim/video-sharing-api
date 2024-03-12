import mongoose, { isValidObjectId } from 'mongoose';
import aggregatePaginate from 'mongoose-aggregate-paginate-v2';
import { Video } from '../models/video.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { StatusCodes } from 'http-status-codes';

const isAuthorized = async (videoId, user) => {
  const video = await Video.findById(videoId);
  return video.owner === user;
};

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  let videosPipeline = [];

  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user id');
    }

    videosPipeline.push({
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
        isPublished: true,
      },
    });
  }

  if (query) {
    videosPipeline.push({
      $match: {
        $text: {
          $search: query,
        },
        isPublished: true,
      },
      $lookup: {
        from: 'user',
        localField: 'owner',
        foreignField: '_id',
        as: 'owner',
      },
      $project: {
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        views: 1,
        duration: 1,
        owner: {
          avatar: 1,
          fullName: true,
          username: 1,
        },
      },
    });
  }

  // Sorting
  if (sortBy && sortType) {
    let sortQuery = {};
    sortQuery[sortBy] = sortType === 'asc' ? 1 : -1;

    videosPipeline.push({
      $sort: sortQuery,
    });
  }

  // Pagination
  const options = {
    page,
    limit,
  };

  const videosAggregate = await Video.aggregate(videosPipeline);
  const videosPagination = await Video.aggregatePaginate(
    videosAggregate,
    options
  );

  if (!videosPagination || videosPagination.length === 0) {
    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(StatusCodes.OK, {}, 'No videos found'));
  }

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(StatusCodes.OK, videosPagination[0], 'Videos fetched')
    );
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description, isPublished = false } = req.body;

  if ([title, description].some((field) => field?.trim() === '')) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `${field.toUpperCase()} can not be empty`
    );
  }

  const userId = req.user?._id;
  const videoFileLocalPath = req.files?.videoFile[0].path;
  const thumbnailLocalPath = req.files?.thumbnail[0].path;

  if (!videoFileLocalPath || !thumbnailLocalPath) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Video file or thumbnail is empty'
    );
  }

  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  const video = await Video.create({
    title,
    description,
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    owner: userId,
    isPublished,
  });

  if (!video) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Could not create video'
    );
  }

  return res
    .status(StatusCodes.CREATED)
    .json(new ApiResponse(StatusCodes.CREATED, video, 'Video uploaded'));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
        isPublished: true,
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
      $lookup: {
        from: 'likes',
        localField: '_id',
        foreignField: 'video',
        as: 'likes',
      },
    },
    {
      $lookup: {
        from: 'comments',
        localField: '_id',
        foreignField: 'video',
        as: 'comments',
      },
    },
    {
      $addFields: {
        likeCount: {
          $size: '$likes',
        },
        commentCount: {
          $size: '$comments',
        },
      },
    },
    {
      $project: {
        title: 1,
        description: 1,
        duration: 1,
        view: 1,
        owner: {
          fullName: 1,
          username: 1,
          avatar: 1,
        },
        comments: {
          owner: 1,
          content: 1,
        },
      },
    },
  ]);

  if (!video?.length) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Video not found');
  }

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, video[0], 'Video fetched'));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { _id } = req.user;
  const { title, description } = req.body;
  const thumbnailLocalPath = req.file?.path;

  const isUserVideoOwner = await isAuthorized(videoId, _id);
  if (!isUserVideoOwner) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User is not video owner');
  }

  if (!title) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Title can not be empty');
  }
  if (!description) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Title can not be empty');
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  if (!thumbnail.url) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Error while uploading avatar'
    );
  }

  // Todo: Remove the previous thumbnail from cloudinary
  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: {
          publicId: thumbnail.public_id,
          url: thumbnail.url,
        },
      },
    },
    { new: true }
  );

  if (!updatedVideo) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Video could not be updated'
    );
  }

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, updatedVideo, 'Video updated'));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { _id } = req.user;

  if (!videoId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Video id is required');
  }

  try {
    const video = await Video.findOneAndDelete({ _id: videoId, owner: _id });

    if (!video) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'Not authorized to delete video'
      );
    }

    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(StatusCodes.OK, {}, 'Video deleted'));
  } catch (error) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Could not delete video'
    );
  }
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { _id } = req.user;

  if (!videoId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Video id is required');
  }

  try {
    const video = await Video.findOne({ _id: videoId, owner: _id });

    if (!video) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'Video not found or not owned by user'
      );
    }

    video.isPublished = !video.isPublished;
    const updatedVideo = await video.save();

    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(StatusCodes.OK, updatedVideo, 'Status updated'));
  } catch (error) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Could not update video status'
    );
  }
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
