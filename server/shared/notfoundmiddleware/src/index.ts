import { NextFunction, Request, Response } from 'express';
import { sendError, ApplicationError } from "config";

const notFound = (req: Request, _: Response, next: NextFunction) => {
  const error = new ApplicationError(`🔍 - Not Found - ${req.originalUrl}`, 404);
  next(error);
}

export const errorMiddleware = (error: any, _: Request, res: Response, __: NextFunction) => {
  if (error instanceof ApplicationError)
    return sendError(res, error.message, { status: error.code ?? 401 });

  return sendError(res, "An application error occured.", { status: 500 })
}

export default notFound;
