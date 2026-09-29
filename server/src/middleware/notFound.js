import { AppError } from '../utils/AppError.js';

export const notFound = (req, res, next) => {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
};
