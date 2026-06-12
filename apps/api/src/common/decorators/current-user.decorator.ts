import { createParamDecorator, ExecutionContext } from '@nestjs/common';

type RequestUser = {
  id: string;
  email: string;
  username: string;
};

export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<{ user: RequestUser }>();
    const user = request.user;

    if (data) {
      return user[data];
    }

    return user;
  },
);
