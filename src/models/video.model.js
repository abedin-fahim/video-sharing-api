import { Schema, model } from 'mongoose';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';

const videoSchema = new Schema(
  {
    videoFile: {
      publicId: {
        type: String, // Cloudinary public id
        required: true,
      },
      url: {
        type: String, // Cloudinary url
        required: true,
      },
    },
    thumbnail: {
      publicId: {
        type: String, // Cloudinary public id
        required: true,
      },
      url: {
        type: String, // Cloudinary url
        required: true,
      },
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number, // From cloudinary
      required: true,
    },
    view: {
      type: Number, // From cloudinary
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = model('Video', videoSchema);
