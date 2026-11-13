import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Like JwtAuthGuard but never rejects the request — if no/invalid token is
 * present, req.user stays undefined and the route decides what to do.
 * Used for endpoints that are public but behave differently for the owner.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(OptionalJwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(err: unknown, user: TUser): TUser {
    if (err) {
      this.logger.debug(`JWT validation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    return user;
  }
}
