import { Request, Response, NextFunction } from 'express';
import { BaseResponse } from './BaseResponse';

export abstract class BaseController {
  protected sendSuccess<T>(res: Response, data: T, message?: string) {
    return res.status(200).json(BaseResponse.success(data, message));
  }

  protected sendCreated<T>(res: Response, data: T, message?: string) {
    return res.status(201).json(BaseResponse.success(data, message));
  }
}
