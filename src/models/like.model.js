import mongoose from 'mongoose';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';

const likeSchema = new mongoose.Schema(
  {
    comment: {
      type: mongoose.Types.ObjectId,
      ref: 'Comment',
    },
    video: {
      type: mongoose.Types.ObjectId,
      ref: 'Video',
    },
    likedBy: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
    },
    tweet: {
      type: mongoose.Types.ObjectId,
      ref: 'Tweet',
    },
  },
  { timestamps: true }
);

likeSchema.plugin(mongooseAggregatePaginate);

export const Like = mongoose.model('Like', likeSchema);
