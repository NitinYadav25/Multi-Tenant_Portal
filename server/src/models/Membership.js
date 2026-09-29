import mongoose from 'mongoose';

export const ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER'
};

const membershipSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization reference is required']
    },
    role: {
      type: String,
      enum: {
        values: [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER],
        message: '{VALUE} is not a supported role'
      },
      default: ROLES.MEMBER,
      required: [true, 'Role is required']
    }
  },
  {
    timestamps: true,
    strict: true
  }
);

// Indexes
membershipSchema.index({ user: 1, organization: 1 }, { unique: true });
membershipSchema.index({ organization: 1 });
membershipSchema.index({ user: 1 });

export const Membership = mongoose.model('Membership', membershipSchema);
