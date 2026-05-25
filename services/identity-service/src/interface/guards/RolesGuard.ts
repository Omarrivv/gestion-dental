import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/Roles.decorator';
import { UserRole } from '../../../domain/value-objects/Role';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('No authenticated user');

    const roleHierarchy: UserRole[] = [
      UserRole.SUPERADMIN,
      UserRole.ORG_ADMIN,
      UserRole.BRANCH_ADMIN,
      UserRole.DOCTOR,
      UserRole.RECEPTIONIST,
      UserRole.PATIENT,
    ];

    const userRoleIndex = roleHierarchy.indexOf(user.role as UserRole);
    const hasAccess = requiredRoles.some((role) => {
      const requiredIndex = roleHierarchy.indexOf(role);
      return userRoleIndex <= requiredIndex; // higher privilege index = more access
    });

    if (!hasAccess) {
      throw new ForbiddenException(`Requires one of roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
