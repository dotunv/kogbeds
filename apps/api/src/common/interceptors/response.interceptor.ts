import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        // Already wrapped (e.g. manually returned { data, meta })
        if (data !== null && typeof data === 'object' && 'data' in data) {
          return { meta: null, ...(data as Record<string, unknown>) };
        }
        return { data, meta: null };
      }),
    );
  }
}
