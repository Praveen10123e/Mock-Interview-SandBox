import { BaseService } from '@nm/api-base';
import { PrismaClient as UserPrisma } from '../generated/client';
import { ErrorFactory } from '@nm/errors';

let _userPrisma: UserPrisma | null = null;
function getUserPrisma(): UserPrisma {
  if (!_userPrisma) _userPrisma = new UserPrisma();
  return _userPrisma;
}

const AUTH_DB_URL =
  process.env.AUTH_DATABASE_URL ||
  'postgresql://postgres:9865@localhost:5432/auth_db?schema=public';

let _authPrisma: any = null;
function getAuthPrisma() {
  if (!_authPrisma) {
    try {
      const { PrismaClient: AuthPrismaClient } = require('../../../auth-service/src/generated/client');
      _authPrisma = new AuthPrismaClient({
        datasources: {
          db: {
            url: AUTH_DB_URL,
          },
        },
      });
    } catch {
      _authPrisma = null;
    }
  }
  return _authPrisma;
}

const INTERVIEW_DB_URL =
  process.env.INTERVIEW_DATABASE_URL ||
  'postgresql://postgres:9865@localhost:5432/interview_db?schema=public';

let _interviewPrisma: any = null;
function getInterviewPrisma() {
  if (!_interviewPrisma) {
    try {
      const { PrismaClient: InterviewPrismaClient } = require('../../../interview-service/src/generated/client');
      _interviewPrisma = new InterviewPrismaClient({
        datasources: {
          db: {
            url: INTERVIEW_DB_URL,
          },
        },
      });
    } catch {
      _interviewPrisma = null;
    }
  }
  return _interviewPrisma;
}

function isTestEmail(email: string): boolean {
  const lower = (email || '').toLowerCase().trim();
  return /^(student_arun_|praveen_sync_|test_profile_)/.test(lower) || /_178\d{7,}|\.178\d{7,}/.test(lower);
}

// ─── Role Hierarchy Helpers ──────────────────────────────────────────────────

/**
 * Effective role precedence (highest to lowest):
 *   SUPER_ADMIN → ADMINISTRATOR → FACULTY → STUDENT
 *
 * SUPER_ADMIN is additive. An identity may hold both ADMINISTRATOR and SUPER_ADMIN.
 * When SUPER_ADMIN is present, it takes precedence for all privilege evaluations.
 */
export function resolveEffectiveRole(roleNames: string[]): 'SUPER_ADMIN' | 'ADMINISTRATOR' | 'FACULTY' | 'STUDENT' {
  if (roleNames.includes('SUPER_ADMIN')) return 'SUPER_ADMIN';
  if (roleNames.includes('ADMINISTRATOR') || roleNames.includes('ADMIN')) return 'ADMINISTRATOR';
  if (roleNames.includes('FACULTY')) return 'FACULTY';
  return 'STUDENT';
}

/**
 * Returns true if identity holds SUPER_ADMIN role — the protection gate.
 * This is the authoritative check for whether an account is protected.
 */
export function isSuperAdmin(roleNames: string[]): boolean {
  return roleNames.includes('SUPER_ADMIN');
}

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface AdminUserListParams {
  search?: string;
  role?: string; // 'ALL' | 'SUPER_ADMIN' | 'ADMINISTRATOR' | 'FACULTY' | 'STUDENT'
  status?: string;
  department?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminUserDTO {
  id: string;
  profileId: string | null;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: 'SUPER_ADMIN' | 'ADMINISTRATOR' | 'FACULTY' | 'STUDENT';
  roles: string[];
  department: string;
  designation: string | null;
  college: string;
  status: string;
  failedLoginAttempts: number;
  assessmentsCount: number;
  completedAssessmentsCount: number;
  averageScore: number | null;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
  isProtected: boolean;
}

export class AdminUserService extends BaseService {
  constructor() {
    super('AdminUserService');
  }

  // ─── Internal: DB Role Lookup ──────────────────────────────────────────────

  /**
   * Fetches real role names for an identity from auth_db.
   * NEVER trusts request headers for this — always queries the DB.
   */
  private async getIdentityRoles(identityId: string): Promise<string[]> {
    const authPrisma = getAuthPrisma();
    if (!authPrisma) return [];
    const ir = await authPrisma.identityRole.findMany({
      where: { identityId },
      include: { role: true },
    });
    return ir.map((r: any) => r.role.name);
  }

  /**
   * Counts active SUPER_ADMIN identities in auth_db.
   * Used for the last-super-admin guard.
   */
  private async countActiveSuperAdmins(): Promise<number> {
    const authPrisma = getAuthPrisma();
    if (!authPrisma) return 0;
    const superAdminRole = await authPrisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
    if (!superAdminRole) return 0;
    const records = await authPrisma.identityRole.findMany({
      where: { roleId: superAdminRole.id },
      include: { identity: { select: { id: true, status: true } } },
    });
    return records.filter((r: any) => r.identity.status === 'ACTIVE').length;
  }

  /**
   * Core security gate — enforces role hierarchy for all admin user mutations.
   *
   * Rules:
   *   1. Target is SUPER_ADMIN  → ALWAYS 403, regardless of actor.
   *   2. Actor is ADMINISTRATOR (non-super) → may only mutate FACULTY and STUDENT.
   *   3. Actor is FACULTY or STUDENT → 403 (also guarded at controller level).
   *   4. Self-deactivation → 403 (handled separately in updateUserStatus).
   *   5. Last active SUPER_ADMIN → 403 if operation would remove them.
   */
  private async checkMutationPermission(
    actorIdentityId: string,
    targetIdentityId: string,
    operation: 'STATUS_CHANGE' | 'PROFILE_UPDATE'
  ): Promise<void> {
    const authPrisma = getAuthPrisma();
    if (!authPrisma) {
      // If auth DB unavailable, fail securely
      throw ErrorFactory.internal('Authorization check failed: auth database unavailable');
    }

    // Fetch real roles from DB for both actor and target
    const [actorRoles, targetRoles] = await Promise.all([
      this.getIdentityRoles(actorIdentityId),
      this.getIdentityRoles(targetIdentityId),
    ]);

    const actorEffective = resolveEffectiveRole(actorRoles);
    const targetIsSuperAdmin = isSuperAdmin(targetRoles);

    // Rule 1: Target is SUPER_ADMIN — ALWAYS protected, no exceptions
    if (targetIsSuperAdmin) {
      // Last-super-admin guard for status changes
      if (operation === 'STATUS_CHANGE') {
        const activeSuperAdminCount = await this.countActiveSuperAdmins();
        if (activeSuperAdminCount <= 1) {
          throw ErrorFactory.unauthorized(
            'At least one active Super Admin account must remain. This operation is not permitted.'
          );
        }
      }
      throw ErrorFactory.unauthorized(
        'Super Admin accounts cannot be deactivated, locked, suspended, or modified through normal account management.'
      );
    }

    // Rule 2: ADMINISTRATOR (non-super) may only mutate FACULTY and STUDENT
    if (actorEffective === 'ADMINISTRATOR') {
      const targetEffective = resolveEffectiveRole(targetRoles);
      if (targetEffective === 'ADMINISTRATOR') {
        throw ErrorFactory.unauthorized(
          'Administrators cannot modify other Administrator accounts. Super Admin privileges are required.'
        );
      }
      // FACULTY and STUDENT are allowed — fall through
      return;
    }

    // Rule 3: SUPER_ADMIN actor may mutate FACULTY and STUDENT (SUPER_ADMIN target already blocked above)
    if (actorEffective === 'SUPER_ADMIN') {
      return; // Allowed
    }

    // Rule 4: Anyone else (FACULTY, STUDENT) should not be here at all
    throw ErrorFactory.unauthorized('Administrator or Super Admin privileges are required.');
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Get platform-wide unique user statistics
   */
  public async getUsersOverview() {
    const authPrisma = getAuthPrisma();
    const userPrisma = getUserPrisma();

    let totalUsers = 0;
    let totalStudents = 0;
    let totalFaculty = 0;
    let totalAdmins = 0;
    let totalSuperAdmins = 0;
    let activeUsers = 0;
    const departmentsSet = new Set<string>();

    if (authPrisma) {
      const identities = await authPrisma.identity.findMany({
        include: { roles: { include: { role: true } } },
      });

      const cleanIdentities = identities.filter((i: any) => !isTestEmail(i.email));
      totalUsers = cleanIdentities.length;

      cleanIdentities.forEach((i: any) => {
        if (i.status === 'ACTIVE') activeUsers++;

        const roleNames: string[] = i.roles.map((r: any) => r.role.name);
        const effective = resolveEffectiveRole(roleNames);

        if (effective === 'SUPER_ADMIN') {
          totalSuperAdmins++;
          totalAdmins++; // Super admins are also counted as admins
        } else if (effective === 'ADMINISTRATOR') {
          totalAdmins++;
        } else if (effective === 'FACULTY') {
          totalFaculty++;
        } else {
          totalStudents++;
        }
      });
    }

    if (userPrisma) {
      const profiles = await userPrisma.profile.findMany({
        include: {
          studentProfile: true,
          facultyProfile: true,
          adminProfile: true,
          nmProfile: true,
        },
      });

      profiles.forEach((p) => {
        const dept =
          p.studentProfile?.department ||
          p.facultyProfile?.department ||
          p.adminProfile?.department ||
          p.nmProfile?.department;
        if (dept && dept.trim().length > 0 && dept !== 'N/A') {
          departmentsSet.add(dept.trim());
        }
      });
    }

    return {
      totalUsers,
      totalStudents,
      totalFaculty,
      totalAdmins,
      totalSuperAdmins,
      activeUsers,
      departments: Array.from(departmentsSet).sort(),
    };
  }

  /**
   * List platform users with real filters and server-side pagination
   */
  public async listUsers(params: AdminUserListParams) {
    const authPrisma = getAuthPrisma();
    const userPrisma = getUserPrisma();
    const interviewPrisma = getInterviewPrisma();

    if (!authPrisma) {
      throw ErrorFactory.internal('Authentication database service unavailable');
    }

    // 1. Fetch clean identities from auth_db
    const allIdentities = await authPrisma.identity.findMany({
      include: { roles: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const cleanIdentities = allIdentities.filter((i: any) => !isTestEmail(i.email));

    // 2. Fetch linked profiles from user_db
    const profiles = userPrisma
      ? await userPrisma.profile.findMany({
          where: { identityId: { in: cleanIdentities.map((i: any) => i.id) } },
          include: {
            studentProfile: true,
            facultyProfile: true,
            adminProfile: true,
            nmProfile: true,
          },
        })
      : [];

    const profileMap = new Map(profiles.map((p) => [p.identityId, p]));

    // 3. Fetch interviews from interview_db for activity & score metrics
    const interviews = interviewPrisma
      ? await interviewPrisma.interview.findMany({
          include: { session: true },
        })
      : [];

    // 4. Map to clean AdminUserDTOs
    let users: AdminUserDTO[] = cleanIdentities.map((identity: any) => {
      const prof = profileMap.get(identity.id);
      const roleNames: string[] = identity.roles.map((r: any) => r.role.name);
      const canonicalRole = resolveEffectiveRole(roleNames);
      const protected_ = isSuperAdmin(roleNames);

      const firstName = prof?.firstName || identity.email.split('@')[0];
      const lastName = prof?.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();

      const department =
        prof?.studentProfile?.department ||
        prof?.facultyProfile?.department ||
        prof?.adminProfile?.department ||
        prof?.nmProfile?.department ||
        'N/A';

      const designation =
        prof?.facultyProfile?.designation || prof?.adminProfile?.designation || null;

      const college =
        prof?.studentProfile?.college ||
        prof?.facultyProfile?.college ||
        prof?.nmProfile?.institution ||
        'Naan Mudhalvan Partner Institution';

      const userInterviews = interviews.filter((iv: any) => iv.identityId === identity.id);
      const completedSessions = userInterviews.filter(
        (iv: any) => iv.state === 'COMPLETED' || iv.session?.reportSnapshot != null
      );

      const scores: number[] = [];
      completedSessions.forEach((iv: any) => {
        const rep = iv.session?.reportSnapshot as any;
        const score = rep?.overallScore ?? rep?.metrics?.overallProficiencyScore;
        if (typeof score === 'number' && !isNaN(score)) {
          scores.push(score);
        }
      });

      const averageScore =
        scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : null;

      let latestActivity = identity.updatedAt || identity.createdAt;
      if (userInterviews.length > 0) {
        const latestSessionDate = new Date(
          userInterviews[0].session?.finishedAt || userInterviews[0].createdAt
        );
        if (latestSessionDate > new Date(latestActivity)) {
          latestActivity = latestSessionDate.toISOString();
        }
      }

      return {
        id: identity.id,
        profileId: prof?.id || null,
        name: fullName,
        firstName,
        lastName,
        email: identity.email,
        phone: prof?.phone || null,
        role: canonicalRole,
        roles: roleNames,
        department,
        designation,
        college,
        status: identity.status,
        failedLoginAttempts: identity.failedLoginAttempts || 0,
        assessmentsCount: userInterviews.length,
        completedAssessmentsCount: completedSessions.length,
        averageScore,
        lastActivity: new Date(latestActivity).toISOString(),
        createdAt: new Date(identity.createdAt).toISOString(),
        updatedAt: new Date(identity.updatedAt).toISOString(),
        isProtected: protected_,
      };
    });

    // 5. Apply Filters
    const { search, role, status, department, page = 1, limit = 10 } = params;

    if (search && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.department.toLowerCase().includes(q) ||
          u.college.toLowerCase().includes(q)
      );
    }

    if (role && role !== 'ALL') {
      const targetRole = role.toUpperCase();
      users = users.filter((u) => u.role === targetRole);
    }

    if (status && status !== 'ALL') {
      const targetStatus = status.toUpperCase();
      users = users.filter((u) => u.status === targetStatus);
    }

    if (department && department !== 'ALL') {
      users = users.filter(
        (u) => u.department.toLowerCase() === department.trim().toLowerCase()
      );
    }

    // 6. Pagination
    const total = users.length;
    const pageNum = Math.max(1, Number(page));
    const pageSize = Math.max(1, Number(limit));
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (pageNum - 1) * pageSize;
    const paginatedUsers = users.slice(startIndex, startIndex + pageSize);

    return {
      users: paginatedUsers,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages,
        hasMore: pageNum < totalPages,
      },
    };
  }

  /**
   * Get single user detailed profile & assessment history
   */
  public async getUserDetail(identityId: string) {
    const authPrisma = getAuthPrisma();
    const userPrisma = getUserPrisma();
    const interviewPrisma = getInterviewPrisma();

    if (!authPrisma) {
      throw ErrorFactory.internal('Authentication database service unavailable');
    }

    const identity = await authPrisma.identity.findUnique({
      where: { id: identityId },
      include: { roles: { include: { role: true } } },
    });

    if (!identity) {
      throw ErrorFactory.notFound('User identity not found');
    }

    const roleNames: string[] = identity.roles.map((r: any) => r.role.name);
    const canonicalRole = resolveEffectiveRole(roleNames);
    const protected_ = isSuperAdmin(roleNames);

    const prof = userPrisma
      ? await userPrisma.profile.findUnique({
          where: { identityId },
          include: {
            studentProfile: true,
            facultyProfile: true,
            adminProfile: true,
            nmProfile: true,
          },
        })
      : null;

    // Fetch user assessment history from interview_db
    let interviewsHistory: any[] = [];
    if (interviewPrisma) {
      const rawInterviews = await interviewPrisma.interview.findMany({
        where: { identityId },
        include: { session: true, configuration: true },
        orderBy: { createdAt: 'desc' },
      });

      interviewsHistory = rawInterviews.map((iv: any) => {
        const rep = iv.session?.reportSnapshot as any;
        const score = rep?.overallScore ?? rep?.metrics?.overallProficiencyScore;
        return {
          id: iv.id,
          title: iv.configuration?.title || 'Placement Assessment',
          state: iv.state,
          score: typeof score === 'number' ? score : null,
          startedAt: iv.session?.startedAt || iv.createdAt,
          finishedAt: iv.session?.finishedAt || null,
          configuration: {
            interviewType: iv.configuration?.interviewType,
            difficulty: iv.configuration?.difficulty,
          },
        };
      });
    }

    const completedCount = interviewsHistory.filter(
      (iv) => iv.state === 'COMPLETED' || iv.score !== null
    ).length;
    const scores = interviewsHistory
      .map((iv) => iv.score)
      .filter((s) => typeof s === 'number') as number[];
    const averageScore =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : null;

    return {
      id: identity.id,
      profileId: prof?.id || null,
      firstName: prof?.firstName || identity.email.split('@')[0],
      lastName: prof?.lastName || '',
      email: identity.email,
      phone: prof?.phone || null,
      role: canonicalRole,
      roles: roleNames,
      status: identity.status,
      failedLoginAttempts: identity.failedLoginAttempts || 0,
      createdAt: identity.createdAt,
      updatedAt: identity.updatedAt,
      isProtected: protected_,
      profile: {
        department:
          prof?.studentProfile?.department ||
          prof?.facultyProfile?.department ||
          prof?.adminProfile?.department ||
          prof?.nmProfile?.department ||
          'N/A',
        designation:
          prof?.facultyProfile?.designation || prof?.adminProfile?.designation || null,
        college:
          prof?.studentProfile?.college ||
          prof?.facultyProfile?.college ||
          prof?.nmProfile?.institution ||
          'Naan Mudhalvan Partner Institution',
        rollNumber: prof?.studentProfile?.rollNumber || null,
        registerNumber: prof?.studentProfile?.registerNumber || null,
        employeeId: prof?.facultyProfile?.employeeId || null,
        batch: prof?.studentProfile?.batch || prof?.nmProfile?.batch || null,
      },
      assessmentSummary: {
        totalAssessments: interviewsHistory.length,
        completedAssessments: completedCount,
        inProgressAssessments: interviewsHistory.length - completedCount,
        averageScore,
      },
      interviewsHistory,
    };
  }

  /**
   * Update user profile fields (Sanitized, non-credential edit).
   * Requires actorIdentityId for server-side permission check.
   */
  public async updateUserProfile(
    targetIdentityId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      department?: string;
      designation?: string;
      college?: string;
    },
    actorIdentityId?: string
  ) {
    const userPrisma = getUserPrisma();
    const authPrisma = getAuthPrisma();
    if (!userPrisma) {
      throw ErrorFactory.internal('User database service unavailable');
    }

    // Server-side permission check (DB-backed)
    if (actorIdentityId) {
      await this.checkMutationPermission(actorIdentityId, targetIdentityId, 'PROFILE_UPDATE');
    }

    let profile = await userPrisma.profile.findUnique({
      where: { identityId: targetIdentityId },
      include: { studentProfile: true, facultyProfile: true, adminProfile: true },
    });

    if (!profile) {
      // Create profile if missing
      profile = await userPrisma.profile.create({
        data: {
          identityId: targetIdentityId,
          firstName: data.firstName || 'User',
          lastName: data.lastName || '',
          phone: data.phone || null,
        },
        include: { studentProfile: true, facultyProfile: true, adminProfile: true },
      });
    } else {
      // Update top-level profile fields
      profile = await userPrisma.profile.update({
        where: { id: profile.id },
        data: {
          firstName: data.firstName !== undefined ? data.firstName : profile.firstName,
          lastName: data.lastName !== undefined ? data.lastName : profile.lastName,
          phone: data.phone !== undefined ? data.phone : profile.phone,
        },
        include: { studentProfile: true, facultyProfile: true, adminProfile: true },
      });
    }

    // Update or create role sub-profile fields
    const identity = authPrisma
      ? await authPrisma.identity.findUnique({
          where: { id: targetIdentityId },
          include: { roles: { include: { role: true } } },
        })
      : null;
    const roleNames: string[] = identity?.roles?.map((r: any) => r.role.name) || [];

    if (profile.studentProfile) {
      await userPrisma.studentProfile.update({
        where: { id: profile.studentProfile.id },
        data: {
          department: data.department !== undefined ? data.department : profile.studentProfile.department,
          college: data.college !== undefined ? data.college : profile.studentProfile.college,
        },
      });
    } else if (
      roleNames.includes('STUDENT') ||
      roleNames.includes('CANDIDATE') ||
      (!roleNames.includes('FACULTY') && !roleNames.includes('ADMINISTRATOR') && !roleNames.includes('ADMIN') && !roleNames.includes('SUPER_ADMIN'))
    ) {
      await userPrisma.studentProfile.create({
        data: {
          profileId: profile.id,
          department: data.department || 'N/A',
          college: data.college || 'Naan Mudhalvan Partner Institution',
        },
      });
    }

    if (profile.facultyProfile) {
      await userPrisma.facultyProfile.update({
        where: { id: profile.facultyProfile.id },
        data: {
          department: data.department !== undefined ? data.department : profile.facultyProfile.department,
          designation: data.designation !== undefined ? data.designation : profile.facultyProfile.designation,
          college: data.college !== undefined ? data.college : profile.facultyProfile.college,
        },
      });
    } else if (roleNames.includes('FACULTY')) {
      await userPrisma.facultyProfile.create({
        data: {
          profileId: profile.id,
          department: data.department || 'N/A',
          designation: data.designation || 'Faculty Member',
          college: data.college || 'Naan Mudhalvan Partner Institution',
        },
      });
    }

    if (profile.adminProfile) {
      await userPrisma.adminProfile.update({
        where: { id: profile.adminProfile.id },
        data: {
          department: data.department !== undefined ? data.department : profile.adminProfile.department,
          designation: data.designation !== undefined ? data.designation : profile.adminProfile.designation,
        },
      });
    } else if (roleNames.includes('ADMINISTRATOR') || roleNames.includes('ADMIN') || roleNames.includes('SUPER_ADMIN')) {
      await userPrisma.adminProfile.create({
        data: {
          profileId: profile.id,
          department: data.department || 'System Operations & Quality Assurance',
          designation: data.designation || 'Super Administrator',
        },
      });
    }

    return this.getUserDetail(targetIdentityId);
  }

  /**
   * Update user account status.
   * Requires actorIdentityId for server-side DB permission check.
   * SUPER_ADMIN targets are always rejected with 403.
   */
  public async updateUserStatus(
    targetIdentityId: string,
    newStatus: string,
    actorIdentityId?: string
  ) {
    const authPrisma = getAuthPrisma();
    if (!authPrisma) {
      throw ErrorFactory.internal('Authentication database service unavailable');
    }

    const validStatuses = ['ACTIVE', 'INACTIVE', 'LOCKED', 'BANNED', 'PENDING_VERIFICATION'];
    const normalizedStatus = newStatus.toUpperCase();

    if (!validStatuses.includes(normalizedStatus)) {
      throw ErrorFactory.validation(`Invalid account status: ${newStatus}`);
    }

    // Self-protection: Actor cannot change their own status to non-ACTIVE
    if (
      actorIdentityId &&
      actorIdentityId === targetIdentityId &&
      normalizedStatus !== 'ACTIVE'
    ) {
      throw ErrorFactory.unauthorized(
        'Self-protection: You cannot deactivate, lock, or ban your own currently authenticated account.'
      );
    }

    // Server-side hierarchy permission check (DB-backed — authoritative)
    if (actorIdentityId) {
      await this.checkMutationPermission(actorIdentityId, targetIdentityId, 'STATUS_CHANGE');
    } else {
      // No actorId provided — still check if target is SUPER_ADMIN (for direct API calls)
      const targetRoles = await this.getIdentityRoles(targetIdentityId);
      if (isSuperAdmin(targetRoles)) {
        throw ErrorFactory.unauthorized(
          'Super Admin accounts cannot be deactivated, locked, or suspended through normal account management.'
        );
      }
    }

    const updated = await authPrisma.identity.update({
      where: { id: targetIdentityId },
      data: {
        status: normalizedStatus,
        failedLoginAttempts: normalizedStatus === 'ACTIVE' ? 0 : undefined,
        lockedUntil: normalizedStatus === 'ACTIVE' ? null : undefined,
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      status: updated.status,
      isProtected: false,
      message: `Account status successfully updated to ${updated.status}`,
    };
  }

  /**
   * Create a new Student or Faculty account from the Admin panel.
   * Strictly enforces Administrator authorization and restricts role to STUDENT or FACULTY.
   */
  public async createUser(
    actorIdentityId: string,
    data: {
      firstName: string;
      lastName?: string;
      email: string;
      password?: string;
      role: 'STUDENT' | 'FACULTY';
      department?: string;
      designation?: string;
      college?: string;
    }
  ) {
    const authPrisma = getAuthPrisma();
    const userPrisma = getUserPrisma();
    if (!authPrisma || !userPrisma) {
      throw ErrorFactory.internal('Database services unavailable');
    }

    // Authoritative server-side DB permission check
    const actorRoles = await this.getIdentityRoles(actorIdentityId);
    const actorEffective = resolveEffectiveRole(actorRoles);
    if (actorEffective !== 'ADMINISTRATOR' && actorEffective !== 'SUPER_ADMIN') {
      throw ErrorFactory.unauthorized('Forbidden: Administrator privileges required to create accounts');
    }

    if (!data.email || !data.firstName) {
      throw ErrorFactory.validation('First name and email are required');
    }

    const normalizedEmail = data.email.trim().toLowerCase();
    const existing = await authPrisma.identity.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw ErrorFactory.conflict('An account with this email already exists');
    }

    const requestedRole = (data.role || 'STUDENT').toUpperCase();
    if (requestedRole !== 'STUDENT' && requestedRole !== 'FACULTY') {
      throw ErrorFactory.validation('Role must be either STUDENT or FACULTY');
    }

    let roleRecord = await authPrisma.role.findUnique({ where: { name: requestedRole } });
    if (!roleRecord) {
      roleRecord = await authPrisma.role.create({
        data: { name: requestedRole, description: `${requestedRole} Role` },
      });
    }

    const bcrypt = require('bcryptjs');
    const plainPassword = data.password && data.password.trim() ? data.password.trim() : '123456';
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(plainPassword, salt);

    const identity = await authPrisma.identity.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        status: 'ACTIVE',
        roles: {
          create: [{ roleId: roleRecord.id }],
        },
      },
      include: {
        roles: { include: { role: true } },
      },
    });

    const firstName = data.firstName.trim();
    const lastName = (data.lastName || '').trim();

    const profile = await userPrisma.profile.create({
      data: {
        identityId: identity.id,
        firstName,
        lastName,
        studentProfile:
          requestedRole === 'STUDENT'
            ? {
                create: {
                  department: data.department || 'Computer Science and Engineering',
                  college: data.college || 'Naan Mudhalvan Partner Institution',
                },
              }
            : undefined,
        facultyProfile:
          requestedRole === 'FACULTY'
            ? {
                create: {
                  department: data.department || 'Department of Computer Applications',
                  designation: data.designation || 'Faculty Member',
                  college: data.college || 'Naan Mudhalvan Partner Institution',
                },
              }
            : undefined,
      },
    });

    return {
      id: identity.id,
      email: identity.email,
      name: `${firstName} ${lastName}`.trim(),
      role: requestedRole,
      status: identity.status,
      message: `${requestedRole === 'FACULTY' ? 'Faculty' : 'Student'} account created successfully`,
    };
  }

  /**
   * Admin Reset User Password
   */
  public async resetUserPassword(
    actorIdentityId: string,
    targetIdentityId: string,
    newPassword?: string
  ) {
    const authPrisma = getAuthPrisma();
    if (!authPrisma) {
      throw ErrorFactory.internal('Authentication database service unavailable');
    }

    await this.checkMutationPermission(actorIdentityId, targetIdentityId, 'STATUS_CHANGE');

    const bcrypt = require('bcryptjs');
    const plainPassword = newPassword && newPassword.trim() ? newPassword.trim() : '123456';
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(plainPassword, salt);

    await authPrisma.identity.update({
      where: { id: targetIdentityId },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Invalidate existing sessions
    await authPrisma.session.deleteMany({
      where: { identityId: targetIdentityId },
    });

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }
}
