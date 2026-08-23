import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Publication } from '@prisma/client';
import { TenantRequest } from '../middleware/tenant.middleware';

export const CurrentPublication = createParamDecorator(
  (data: keyof Publication | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const publication = request.tenant?.publication ?? null;

    if (data && publication) {
      return publication[data];
    }

    return publication;
  },
);
