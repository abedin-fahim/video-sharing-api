import { StatusCodes } from 'http-status-codes';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const healthCheck = asyncHandler(async (_, res) => {
  res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, {}, 'Everything is working!'));
});

export { healthCheck };
