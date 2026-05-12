import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const businessSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export type BusinessDocument = InferSchemaType<typeof businessSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const BusinessModel =
  mongoose.models.Business ?? mongoose.model('Business', businessSchema);
