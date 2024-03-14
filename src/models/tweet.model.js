import mongoose from 'mongoose';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';

const tweetSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
    },
    content: {
      type: String,
      trim: true,
      required: true,
    },
    image: {
      publicId: {
        type: String,
      },
      url: {
        type: String,
      },
    },
  },
  { timestamps: true }
);

tweetSchema.plugin(mongooseAggregatePaginate);

export const Tweet = mongoose.model('Tweet', tweetSchema);
