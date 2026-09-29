import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Membership } from '../models/Membership.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { env } from '../config/env.js';

const getCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.COOKIE_SAMESITE,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
});

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN
  });
};

export const register = asyncHandler(async (req, res, next) => {
  const { name, email, password } = req.body;

  // Check existing user
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('A user with that email already exists', 409, 'CONFLICT'));
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password
  });

  const token = generateToken(user._id);
  res.cookie('token', token, getCookieOptions());

  return sendSuccess(
    res,
    {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    },
    201
  );
});

export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Find user and explicitly select password
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    // Generic error to prevent user enumeration
    return next(new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return next(new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
  }

  const token = generateToken(user._id);
  res.cookie('token', token, getCookieOptions());

  return sendSuccess(res, {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email
    }
  });
});


export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.COOKIE_SAMESITE
  });

  return sendSuccess(res, { message: 'Logged out successfully' });
});

export const getMe = asyncHandler(async (req, res) => {
  // Find all memberships for current user and populate organization
  const memberships = await Membership.find({ user: req.user._id })
    .populate('organization', 'name slug createdAt')
    .sort({ createdAt: -1 });

  // Filter out any where organization might be null (orphaned)
  const validMemberships = memberships
    .filter((m) => m.organization != null)
    .map((m) => ({
      id: m._id,
      role: m.role,
      organization: {
        id: m.organization._id,
        name: m.organization.name,
        slug: m.organization.slug,
        createdAt: m.organization.createdAt
      }
    }));

  return sendSuccess(res, {
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email
    },
    memberships: validMemberships
  });
});
