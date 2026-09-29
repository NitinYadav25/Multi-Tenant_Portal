/**
 * Standard API Success Response
 * format: { success: true, data: ..., meta?: ... }
 */
export const sendSuccess = (res, data = null, statusCode = 200, meta = undefined) => {
  if (statusCode === 204) {
    return res.status(204).end();
  }

  const payload = {
    success: true,
    data
  };

  if (meta !== undefined) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
};

/**
 * Standard API Error Response
 * format: { success: false, error: { code: "...", message: "...", details?: [...] } }
 */
export const sendError = (res, statusCode = 500, code = 'INTERNAL_ERROR', message = 'An unexpected error occurred', details = null) => {
  const errorObj = {
    code,
    message
  };

  if (details !== null && details !== undefined) {
    errorObj.details = details;
  }

  return res.status(statusCode).json({
    success: false,
    error: errorObj
  });
};
