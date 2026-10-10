import bcrypt from 'bcryptjs';
import { BaseService } from '@nm/api-base';
import { ErrorFactory } from '@nm/errors';
import { IdentityRepository } from '../repositories/IdentityRepository';
import { RoleRepository } from '../repositories/RoleRepository';

import axios from 'axios';

export class RegistrationService extends BaseService {
  private identityRepo: IdentityRepository;
  private roleRepo: RoleRepository;

  constructor() {
    super('RegistrationService');
    this.identityRepo = new IdentityRepository();
    this.roleRepo = new RoleRepository();
  }

  public async register(
    email: string,
    plainText: string,
    roleName: 'STUDENT' | 'FACULTY' | 'ADMINISTRATOR',
    firstName?: string,
    lastName?: string,
    fullName?: string
  ) {
    const existing = await this.identityRepo.findByEmail(email);
    if (existing) {
      throw ErrorFactory.conflict('Email is already registered.');
    }

    let role = await this.roleRepo.findByName(roleName);
    if (!role) {
      // For development/initialization fallback
      role = await this.roleRepo.create({ name: roleName, description: `${roleName} Role` });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(plainText, salt);

    const identity = await this.identityRepo.create({
      email,
      passwordHash,
      roles: {
        create: [{ role: { connect: { id: role.id } } }],
      },
    });

    // Parse/extract first name and last name
    let finalFirst = (firstName || '').trim();
    let finalLast = (lastName || '').trim();

    if (!finalFirst && fullName) {
      const parts = fullName.trim().split(/\s+/);
      finalFirst = parts[0] || '';
      finalLast = parts.slice(1).join(' ');
    }

    // Auto-create initial profile in user-service
    try {
      await axios.post('http://localhost:3002/profile', {
        identityId: identity.id,
        firstName: finalFirst,
        lastName: finalLast,
        email: identity.email,
      });
    } catch (err: any) {
      this.logger.warn(`Could not pre-create user profile in user-service: ${err.message}`);
    }

    return identity;
  }
}
