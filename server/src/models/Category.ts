import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  image?: string;
  parentId?: Types.ObjectId | null;
  subCategories: Array<{ name: string; slug: string; icon?: string }>;
  meta: { title?: string; description?: string; keywords: string[] };
  stats: { shopCount: number; activeShopCount: number };
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, maxlength: 500 },
    icon: { type: String, default: 'Store' }, // lucide-react icon name
    color: { type: String, default: '#0ea5e9', match: /^#[0-9a-fA-F]{6}$/ },
    image: String,

    parentId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    subCategories: {
      type: [{ _id: false, name: String, slug: String, icon: String }],
      default: [],
    },

    meta: {
      title: String,
      description: String,
      keywords: { type: [String], default: [] },
    },

    stats: {
      shopCount: { type: Number, default: 0 },
      activeShopCount: { type: Number, default: 0 },
    },

    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

categorySchema.index({ isActive: 1, displayOrder: 1 });
categorySchema.index({ parentId: 1 });

export const Category: Model<ICategory> = model<ICategory>('Category', categorySchema);
