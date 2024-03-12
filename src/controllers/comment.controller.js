import mongoose from 'mongoose';
import { Comment } from '../models/comment.model.js';
import { Video } from '../models/video.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { StatusCodes } from 'http-status-codes';

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10, sort } = req.query;

  if (!videoId) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'VideoId can not be empty');
  }

  const video = await Video.findById(videoId);

  if (!video) {
    await Video.deleteMany({ _id: videoId });
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Video not found');
  }

  const commentAggregate = await Comment.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
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
        foreignField: 'comment',
        as: 'likes',
      },
    },
    {
      $addFields: {
        likeCount: {
          $size: '$likes',
        },
        owner: {
          $first: '$owner',
        },
        isLiked: {
          $cond: {
            $if: {
              $in: [req.user?._id, '$likes.likedBy'],
              then: true,
              else: false,
            },
          },
        },
      },
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        likeCount: 1,
        isLiked: 1,
        owner: {
          username: 1,
          fullName: 1,
          avatar: 1,
        },
      },
    },
  ]);
  // console.log(commentAggregate);

  const options = {
    page,
    limit,
  };
  const comments = await Comment.aggregatePaginate(commentAggregate, options);
  // console.log(comments);

  if (sort === 'new') {
    comments.sort('asc');
  }

  if (!comments || comments.length === 0) {
    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(StatusCodes.OK, {}, 'Video has no comments'));
  }

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        comments[0],
        'Comments fetched successfully'
      )
    );
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;
  const { _id: owner } = req.user;

  if (!content.trim()) {
    throw new ApiError(400, 'Comment can not be empty');
  }

  const video = await Video.findById(videoId);

  if (!video || !video.isPublished) {
    throw new ApiError(404, 'Video can not be found');
  }

  const comment = await Comment.create({
    videoId,
    content,
    owner,
  });

  return res.status(
    new ApiResponse(StatusCodes.CREATED, comment, 'Comment successfully added')
  );
});

const updateComment = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { videoId } = req.params;
  const { commentId, updatedContent } = req.body;

  if (!updatedContent.trim()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Comment can not be empty');
  }

  const video = await Video.findById(videoId);

  if (!video || !video.isPublished) {
    await Comment.findByIdAndDelete(commentId);
    throw new ApiError(StatusCodes.NOT_FOUND, 'Video can not be found');
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Comment not found');
  }

  if (_id !== comment.owner) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Unauthorized to update comment'
    );
  }

  comment.content = updatedContent;
  const updatedComment = await comment.save({ new: true });

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, updatedComment, 'Comment updated'));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.body;

  if (!commentId.trim()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Comment Id can not be empty');
  }

  const comment = await Comment.findByIdAndDelete(commentId);
  if (!comment) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Could not delete comment');
  }

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, {}, 'Comment deleted'));
});

export { getVideoComments, addComment, updateComment, deleteComment };
