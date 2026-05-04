import { NextFunction, Request, Response } from 'express';

import { assertTenantContext } from '../../middleware/tenantMiddleware.js';
import { getValidated } from '../../middleware/requestValidator.js';
import applicationService, {
  ApplicationListFilters,
  CreateApplicationInput,
  UpdateApplicationInput,
} from '../../services/application/ApplicationService.js';
import {
  ApplicationIdParams,
  CreateApplicationBody,
  DeleteApplicationQuery,
  ListApplicationsQuery,
  UpdateApplicationBody,
} from '../../validators/applicationValidators.js';

const normalizeSortDirection = (direction: string): 'ASC' | 'DESC' => {
  return direction.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
};

export const listApplications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantContext = assertTenantContext(req);
    const query = getValidated<ListApplicationsQuery>(req, 'query');

    const filters: ApplicationListFilters = {
      page: query?.page ?? 1,
      limit: query?.limit ?? 20,
      status: query?.status,
      search: query?.search,
      sortBy: query?.sortBy ?? 'created_at',
      sortDirection: normalizeSortDirection(query?.sortDirection ?? 'desc'),
      includeDeleted: query?.includeDeleted ?? false,
    };

    const result = await applicationService.listApplications(tenantContext, filters);

    res.status(200).json({
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
      traceId: (req as any).traceId,
    });
  } catch (error) {
    next(error);
  }
};

export const getApplicationById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantContext = assertTenantContext(req);
    const params = getValidated<ApplicationIdParams>(req, 'params');
    const applicationId = params?.applicationId || req.params.applicationId;

    const application = await applicationService.getApplicationById(tenantContext, applicationId);

    res.status(200).json({
      success: true,
      data: application,
      traceId: (req as any).traceId,
    });
  } catch (error) {
    next(error);
  }
};

export const createApplication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantContext = assertTenantContext(req);
    const payload = getValidated<CreateApplicationBody>(req, 'body') as CreateApplicationInput;
    const idempotencyKey = (req.headers['idempotency-key'] || req.headers['x-idempotency-key'] || '').toString();

    const result = await applicationService.createApplication(tenantContext, payload, idempotencyKey);

    res.status(result.replayed ? 200 : 201).json({
      success: true,
      data: result.application,
      meta: {
        idempotencyReplayed: result.replayed,
      },
      traceId: (req as any).traceId,
    });
  } catch (error) {
    next(error);
  }
};

export const updateApplication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantContext = assertTenantContext(req);
    const params = getValidated<ApplicationIdParams>(req, 'params');
    const payload = getValidated<UpdateApplicationBody>(req, 'body') as UpdateApplicationInput;
    const applicationId = params?.applicationId || req.params.applicationId;

    const application = await applicationService.updateApplication(tenantContext, applicationId, payload);

    res.status(200).json({
      success: true,
      data: application,
      traceId: (req as any).traceId,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteApplication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantContext = assertTenantContext(req);
    const params = getValidated<ApplicationIdParams>(req, 'params');
    const query = getValidated<DeleteApplicationQuery>(req, 'query');
    const applicationId = params?.applicationId || req.params.applicationId;
    const hardDelete = query?.hard ?? false;

    const result = await applicationService.deleteApplication(tenantContext, applicationId, hardDelete);

    res.status(200).json({
      success: true,
      data: result,
      traceId: (req as any).traceId,
    });
  } catch (error) {
    next(error);
  }
};
