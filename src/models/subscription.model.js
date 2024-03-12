import { model, Schema } from 'mongoose';
import aggregatePaginate from 'mongoose-aggregate-paginate-v2';

const subscriptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId, // one who is subscribing / followers
      ref: 'User',
    },
    channel: {
      type: Schema.Types.ObjectId, // one to whom 'subscriber' is subscribing` / user / channel
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

subscriptionSchema.plugin(aggregatePaginate);

export const Subscription = model('Subscription', subscriptionSchema);
