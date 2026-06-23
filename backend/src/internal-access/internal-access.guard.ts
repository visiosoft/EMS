import { CanActivate, Injectable } from '@nestjs/common';

@Injectable()
export class InternalAccessGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}
