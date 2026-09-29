import mongoose from 'mongoose';
import crypto from 'crypto';

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      minlength: [2, 'Organization name must be at least 2 characters'],
      maxlength: [80, 'Organization name cannot exceed 80 characters']
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required']
    }
  },
  {
    timestamps: true,
    strict: true
  }
);

// Auto-generate slug before saving if not present
organizationSchema.pre('validate', function (next) {
  if (!this.slug && this.name) {
    const baseSlug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const suffix = crypto.randomBytes(3).toString('hex');
    this.slug = `${baseSlug || 'org'}-${suffix}`;
  }
  next();
});

export const Organization = mongoose.model('Organization', organizationSchema);
