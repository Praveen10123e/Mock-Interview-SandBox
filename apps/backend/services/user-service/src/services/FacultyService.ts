import { BaseService } from '@nm/api-base';
import { ErrorFactory } from '@nm/errors';
import { ProfileRepository } from '../repositories/ProfileRepository';
import { PrismaClient } from '../generated/client';
import axios from 'axios';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

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

export interface StudentFilterParams {
  search?: string;
  department?: string;
  batch?: string;
  status?: string;
}

export class FacultyService extends BaseService {
  private profileRepo: ProfileRepository;

  constructor() {
    super('FacultyService');
    this.profileRepo = new ProfileRepository();
  }

  /**
   * Check if email belongs to an automated test / development runner
   */
  private isTestOrGeneratedAccount(email: string): boolean {
    const lower = (email || '').toLowerCase().trim();
    if (/^(student_arun_|praveen_sync_|test_profile_)/.test(lower)) {
      return true;
    }
    if (/_178\d{7,}|\.178\d{7,}/.test(lower)) {
      return true;
    }
    return false;
  }

  /**
   * Helper to retrieve all authoritative STUDENT identities from auth_db
   */
  private async getStudentIdentitiesMap(): Promise<Map<string, { id: string; email: string }>> {
    const map = new Map<string, { id: string; email: string }>();
    const authPrisma = getAuthPrisma();
    if (authPrisma) {
      try {
        const identities = await authPrisma.identity.findMany({
          where: {
            roles: {
              some: {
                role: {
                  name: { in: ['STUDENT', 'CANDIDATE'] },
                },
              },
              none: {
                role: {
                  name: { in: ['FACULTY', 'ADMIN', 'ADMINISTRATOR', 'SUPER_ADMIN'] },
                },
              },
            },
          },
          select: { id: true, email: true },
        });
        identities.forEach((i: any) => {
          if (!this.isTestOrGeneratedAccount(i.email)) {
            map.set(i.id, i);
          }
        });
      } catch (err: any) {
        this.logger.warn(`Could not query student identities from auth_db: ${err.message}`);
      }
    }
    return map;
  }

  /**
   * Resolve clean full name dynamically for candidate from profile or email
   */
  private resolveStudentName(profile: any, email?: string): string {
    const raw = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();
    if (raw && raw !== 'New User' && raw !== 'Student') {
      return raw;
    }

    if (email) {
      const prefix = email.split('@')[0].replace(/[._0-9]+/g, ' ').trim();
      const formatted = prefix
        .split(' ')
        .filter(Boolean)
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      if (formatted) return formatted;
    }

    return 'Candidate';
  }

  /**
   * Faculty Overview Dashboard Data
   */
  public async getFacultyDashboard(facultyIdentityId: string) {
    // 1. Fetch authenticated faculty profile
    const faculty = (await this.profileRepo.findByIdentityId(facultyIdentityId)) as any;
    if (!faculty) {
      throw ErrorFactory.notFound('Faculty profile not found');
    }

    const facultyName =
      `${faculty.firstName} ${faculty.lastName || ''}`.trim() || 'Faculty Member';
    const college = faculty.facultyProfile?.college || faculty.nmProfile?.institution || 'Naan Mudhalvan Partner College';
    const department = faculty.facultyProfile?.department || faculty.nmProfile?.department || 'CSE';
    const designation = faculty.facultyProfile?.designation || 'Faculty Instructor';

    // 2. Fetch real student identities from auth_db
    const studentIdentitiesMap = await this.getStudentIdentitiesMap();

    // 3. Fetch all real registered student profiles (strictly excluding faculty and admin)
    const baseWhere: any = {
      identityId: { not: facultyIdentityId },
      facultyProfile: null,
      adminProfile: null,
    };

    const studentProfiles = await prisma.profile.findMany({
      where: baseWhere,
      include: {
        studentProfile: true,
        nmProfile: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const profileMap = new Map(studentProfiles.map((p) => [p.identityId, p]));

    // 4. Query interview-service for real cohort analytics & telemetry
    const allStudentIdentityIds = Array.from(studentIdentitiesMap.keys()).filter(
      (id) => id !== facultyIdentityId
    );

    let cohortAnalytics: any = {
      totalAssessments: 0,
      totalSubmissions: 0,
      averageScore: 0,
      hasEnoughPerformanceData: false,
      performanceTrend: [],
      recentActivity: [],
      studentStats: {},
    };

    if (allStudentIdentityIds.length > 0) {
      try {
        const response = await axios.post(
          'http://localhost:3004/cohort-analytics',
          { identityIds: allStudentIdentityIds },
          { timeout: 5000 }
        );
        if (response.data) {
          cohortAnalytics = response.data;
        }
      } catch (err: any) {
        this.logger.warn(
          `Could not fetch cohort analytics from interview-service: ${err.message}`
        );
      }
    }

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let activeStudentsCount = 0;

    const studentStats = cohortAnalytics.studentStats || {};
    const studentsNeedingAttentionList: any[] = [];

    allStudentIdentityIds.forEach((id) => {
      const profile = profileMap.get(id);
      const email = studentIdentitiesMap.get(id)?.email || `${profile?.firstName?.toLowerCase() || 'student'}@nm.edu`;
      const stats = studentStats[id];
      const studentName = this.resolveStudentName(profile, email);
      const studentDept =
        profile?.studentProfile?.department ||
        profile?.nmProfile?.department ||
        department;
      const studentBatch =
        profile?.studentProfile?.batch || profile?.nmProfile?.batch || '2028';

      if (stats?.lastActiveAt) {
        const lastActiveTime = new Date(stats.lastActiveAt).getTime();
        if (lastActiveTime >= thirtyDaysAgo) {
          activeStudentsCount++;
        }
      }

      if (stats) {
        const scores = stats.scores || [];
        const avgScore =
          scores.length > 0
            ? Math.round(
                (scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10
              ) / 10
            : null;

        const isFailing = avgScore !== null && avgScore < 50;
        const hasFailedSubs = stats.failedSubmissions >= 3;

        if (isFailing || hasFailedSubs) {
          studentsNeedingAttentionList.push({
            id: profile?.id || id,
            identityId: id,
            name: studentName,
            department: studentDept,
            batch: studentBatch,
            performanceScore: isFailing ? `${avgScore}%` : `${stats.failedSubmissions} failures`,
            reason: isFailing
              ? `Low aggregate score (${avgScore}%) below benchmark`
              : `High failure rate (${stats.failedSubmissions} rejected submissions)`,
            severity: isFailing ? 'HIGH' : 'MEDIUM',
            averageScore: avgScore,
            failedSubmissions: stats.failedSubmissions,
            lastActive: stats.lastActiveAt
              ? new Date(stats.lastActiveAt).toLocaleDateString()
              : 'Recently',
          });
        }
      }
    });

    const activeRate =
      allStudentIdentityIds.length > 0
        ? Math.round((activeStudentsCount / allStudentIdentityIds.length) * 1000) / 10
        : 0;

    const enrichedRecentActivity = (cohortAnalytics.recentActivity || []).map((act: any) => {
      const p = profileMap.get(act.identityId);
      const email = studentIdentitiesMap.get(act.identityId)?.email;
      const studentName = this.resolveStudentName(p, email);
      return {
        ...act,
        studentName: studentName || act.studentName,
      };
    });

    return {
      faculty: {
        id: faculty.id,
        identityId: faculty.identityId,
        name: facultyName,
        email: faculty.email || 'faculty@nm.edu',
        college,
        department,
        designation,
      },
      metrics: {
        totalStudents: allStudentIdentityIds.length,
        activeStudents: activeStudentsCount,
        assessments: cohortAnalytics.totalAssessments || 0,
        totalSubmissions: cohortAnalytics.totalSubmissions || 0,
        averagePerformance: cohortAnalytics.averageScore || 0,
        hasEnoughPerformanceData: !!cohortAnalytics.hasEnoughPerformanceData,
      },
      stats: {
        totalStudents: allStudentIdentityIds.length,
        activeStudents: activeStudentsCount,
        activeRate,
        totalAssessments: cohortAnalytics.totalAssessments || 0,
        totalSubmissions: cohortAnalytics.totalSubmissions || 0,
        averageScore: cohortAnalytics.averageScore || null,
        hasEnoughPerformanceData: cohortAnalytics.hasEnoughPerformanceData || false,
      },
      studentsNeedingAttention: studentsNeedingAttentionList.slice(0, 10),
      performanceTrend: cohortAnalytics.performanceTrend || [],
      recentActivity: enrichedRecentActivity,
    };
  }

  /**
   * Get List of Authorized Students with Coding, Interview, and Performance Aggregates
   */
  public async getStudents(facultyIdentityId: string, filters: StudentFilterParams = {}) {
    const faculty = (await this.profileRepo.findByIdentityId(facultyIdentityId)) as any;
    if (!faculty) {
      throw ErrorFactory.unauthorized('Faculty profile not found');
    }

    const college = faculty.facultyProfile?.college || faculty.nmProfile?.institution || 'Naan Mudhalvan Partner College';
    const department = faculty.facultyProfile?.department || faculty.nmProfile?.department || 'CSE';

    // 1. Fetch real student identities from auth_db
    const studentIdentitiesMap = await this.getStudentIdentitiesMap();

    // 2. Fetch all real registered student profiles
    const baseWhere: any = {
      identityId: { not: facultyIdentityId },
      facultyProfile: null,
      adminProfile: null,
    };

    const studentProfiles = await prisma.profile.findMany({
      where: baseWhere,
      include: {
        studentProfile: true,
        nmProfile: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const profileMap = new Map(studentProfiles.map((p) => [p.identityId, p]));

    // 3. Only identities registered as STUDENT / CANDIDATE in auth_db
    const allStudentIdentityIds = Array.from(studentIdentitiesMap.keys()).filter(
      (id) => id !== facultyIdentityId
    );

    // 4. Fetch cohort analytics from interview-service
    let studentStats: Record<string, any> = {};
    if (allStudentIdentityIds.length > 0) {
      try {
        const response = await axios.post(
          'http://localhost:3004/cohort-analytics',
          { identityIds: allStudentIdentityIds },
          { timeout: 5000 }
        );
        if (response.data?.studentStats) {
          studentStats = response.data.studentStats;
        }
      } catch (err: any) {
        this.logger.warn(`Could not fetch student stats: ${err.message}`);
      }
    }

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const deptSet = new Set<string>();
    const batchSet = new Set<string>();

    // 5. Transform students to standardized view model
    const transformedStudents = allStudentIdentityIds.map((id) => {
      const profile = profileMap.get(id);
      const email = studentIdentitiesMap.get(id)?.email || `${profile?.firstName?.toLowerCase() || 'student'}@nm.edu`;
      const stats = studentStats[id] || {
        assessmentsCompleted: 0,
        totalAssessments: 0,
        totalSubmissions: 0,
        scores: [],
        lastActiveAt: null,
        failedSubmissions: 0,
      };

      const fullName = this.resolveStudentName(profile, email);
      const studentDept =
        profile?.studentProfile?.department ||
        profile?.nmProfile?.department ||
        department;
      const studentBatch =
        profile?.studentProfile?.batch || profile?.nmProfile?.batch || '2028';
      const studentCollege =
        profile?.studentProfile?.college ||
        profile?.nmProfile?.institution ||
        college;
      const rollNumber =
        profile?.studentProfile?.rollNumber ||
        profile?.studentProfile?.registerNumber ||
        profile?.nmProfile?.studentId ||
        '—';

      deptSet.add(studentDept);
      batchSet.add(studentBatch);

      const scores: number[] = stats.scores || [];
      const avgScore =
        scores.length > 0
          ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10
          : null;

      // Status resolution
      let isActive = false;
      if (stats.lastActiveAt) {
        isActive = new Date(stats.lastActiveAt).getTime() >= thirtyDaysAgo;
      }

      let status: 'ACTIVE' | 'INACTIVE' | 'NEEDS_ATTENTION' = 'INACTIVE';
      if ((avgScore !== null && avgScore < 50) || stats.failedSubmissions >= 3) {
        status = 'NEEDS_ATTENTION';
      } else if (isActive || stats.totalAssessments > 0 || stats.totalSubmissions > 0) {
        status = 'ACTIVE';
      }

      return {
        id: profile?.id || id,
        identityId: id,
        firstName: profile?.firstName || fullName.split(' ')[0],
        lastName: profile?.lastName || fullName.split(' ').slice(1).join(' '),
        fullName,
        email,
        phone: profile?.phone || '—',
        avatarUrl: profile?.avatarUrl,
        department: studentDept,
        college: studentCollege,
        batch: studentBatch,
        rollNumber,
        codingActivity: {
          totalSubmissions: stats.totalSubmissions,
          hasData: stats.totalSubmissions > 0,
        },
        interviewActivity: {
          totalInterviews: stats.totalAssessments,
          completedInterviews: stats.assessmentsCompleted,
          hasData: stats.totalAssessments > 0,
        },
        performance: {
          averageScore: avgScore,
          hasEnoughData: avgScore !== null,
        },
        status,
        lastActiveAt: stats.lastActiveAt,
      };
    });

    // Apply in-memory search and filters
    let filtered = transformedStudents;

    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      filtered = filtered.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.rollNumber.toLowerCase().includes(q)
      );
    }

    if (filters.department && filters.department !== 'ALL') {
      filtered = filtered.filter(
        (s) => s.department.toLowerCase() === filters.department?.toLowerCase()
      );
    }

    if (filters.batch && filters.batch !== 'ALL') {
      filtered = filtered.filter((s) => s.batch === filters.batch);
    }

    if (filters.status && filters.status !== 'ALL') {
      filtered = filtered.filter((s) => s.status === filters.status);
    }

    return {
      students: filtered,
      totalCount: filtered.length,
      unfilteredCount: transformedStudents.length,
      departments: Array.from(deptSet).sort(),
      batches: Array.from(batchSet).sort(),
    };
  }

  /**
   * Get Detailed Student Performance and Timeline View
   */
  public async getStudentDetail(facultyIdentityId: string, studentId: string) {
    const faculty = (await this.profileRepo.findByIdentityId(facultyIdentityId)) as any;
    if (!faculty) {
      throw ErrorFactory.unauthorized('Faculty profile not found');
    }

    // 1. Fetch real student identities from auth_db
    const studentIdentitiesMap = await this.getStudentIdentitiesMap();

    // 2. Find student by ID or identityId (ensuring they are NOT faculty)
    const student = await prisma.profile.findFirst({
      where: {
        OR: [{ id: studentId }, { identityId: studentId }],
        identityId: { not: facultyIdentityId },
        facultyProfile: null,
        adminProfile: null,
      },
      include: {
        studentProfile: true,
        nmProfile: true,
      },
    });

    const targetIdentityId = student?.identityId || studentId;
    const authIdentity = studentIdentitiesMap.get(targetIdentityId);

    if (!student && !authIdentity) {
      throw ErrorFactory.notFound('Student not found or access denied');
    }

    const college = faculty.facultyProfile?.college || faculty.nmProfile?.institution || 'Naan Mudhalvan Partner College';
    const department = faculty.facultyProfile?.department || faculty.nmProfile?.department || 'CSE';

    // Fetch individual student analytics from interview-service
    let analytics: any = {
      interviewPerformance: {
        totalInterviews: 0,
        completedInterviews: 0,
        averageScore: null,
        hasInterviewData: false,
        interviews: [],
      },
      codingPerformance: {
        totalSubmissions: 0,
        acceptedSubmissions: 0,
        acceptanceRate: null,
        hasCodingData: false,
        submissions: [],
      },
      recentActivity: [],
    };

    try {
      const res = await axios.post(
        'http://localhost:3004/student-analytics',
        { identityId: targetIdentityId },
        { timeout: 5000 }
      );
      if (res.data) {
        analytics = res.data;
      }
    } catch (err: any) {
      this.logger.warn(`Could not fetch student analytics: ${err.message}`);
    }

    const email = authIdentity?.email || `${student?.firstName?.toLowerCase() || 'student'}@nm.edu`;
    const fullName = this.resolveStudentName(student, email);
    const studentDept =
      student?.studentProfile?.department ||
      student?.nmProfile?.department ||
      department;
    const studentBatch =
      student?.studentProfile?.batch || student?.nmProfile?.batch || '2028';
    const studentCollege =
      student?.studentProfile?.college ||
      student?.nmProfile?.institution ||
      college;

    return {
      profile: {
        id: student?.id || targetIdentityId,
        identityId: targetIdentityId,
        firstName: student?.firstName || fullName.split(' ')[0],
        lastName: student?.lastName || fullName.split(' ').slice(1).join(' '),
        fullName,
        email,
        phone: student?.phone || '—',
        avatarUrl: student?.avatarUrl,
        college: studentCollege,
        department: studentDept,
        batch: studentBatch,
        rollNumber:
          student?.studentProfile?.rollNumber ||
          student?.studentProfile?.registerNumber ||
          student?.nmProfile?.studentId ||
          '—',
        placementStatus: student?.studentProfile?.placementStatus || 'Eligible for Campus Placement',
        role: 'STUDENT',
        createdAt: student?.createdAt || new Date().toISOString(),
      },
      codingPerformance: analytics.codingPerformance,
      interviewPerformance: analytics.interviewPerformance,
      recentActivity: analytics.recentActivity,
    };
  }

  /**
   * Get Authenticated Faculty Profile Information
   */
  public async getFacultyProfile(facultyIdentityId: string) {
    const faculty = (await this.profileRepo.findByIdentityId(facultyIdentityId)) as any;
    if (!faculty) {
      throw ErrorFactory.notFound('Faculty profile not found');
    }

    const authPrisma = getAuthPrisma();
    let email = faculty.email;
    let roles: string[] = ['FACULTY'];
    let lastLoginAt: string | null = null;
    let accountStatus: string = 'ACTIVE';

    if (authPrisma) {
      try {
        const ident = await authPrisma.identity.findUnique({
          where: { id: facultyIdentityId },
          include: {
            roles: { include: { role: true } },
          },
        });
        if (ident) {
          email = ident.email;
          roles = ident.roles.map((r: any) => r.role.name);
          accountStatus = (ident as any).status || 'ACTIVE';
          lastLoginAt = (ident as any).lastLoginAt ? new Date((ident as any).lastLoginAt).toISOString() : null;
        }
      } catch (err: any) {
        this.logger.warn(`Could not fetch auth identity info: ${err.message}`);
      }
    }

    const fullName = `${faculty.firstName || ''} ${faculty.lastName || ''}`.trim() || 'Faculty Member';
    const college = faculty.facultyProfile?.college || faculty.nmProfile?.institution || 'Naan Mudhalvan Partner College';
    const department = faculty.facultyProfile?.department || faculty.nmProfile?.department || 'CSE';
    const designation = faculty.facultyProfile?.designation || 'Assistant Professor / Faculty Instructor';
    const employeeId = faculty.facultyProfile?.employeeId || `FAC-${facultyIdentityId.substring(0, 6).toUpperCase()}`;

    return {
      id: faculty.id,
      identityId: faculty.identityId,
      firstName: faculty.firstName || '',
      lastName: faculty.lastName || '',
      fullName,
      email: email || 'faculty@nm.edu',
      phone: faculty.phone || '',
      avatarUrl: faculty.avatarUrl || null,
      college,
      department,
      designation,
      employeeId,
      roles,
      accountStatus,
      createdAt: faculty.createdAt,
      updatedAt: faculty.updatedAt,
      lastLoginAt,
    };
  }

  /**
   * Update Authenticated Faculty Profile Information
   */
  public async updateFacultyProfile(
    facultyIdentityId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      avatarUrl?: string;
      department?: string;
      designation?: string;
      college?: string;
      employeeId?: string;
    }
  ) {
    const faculty = (await this.profileRepo.findByIdentityId(facultyIdentityId)) as any;
    if (!faculty) {
      throw ErrorFactory.notFound('Faculty profile not found');
    }

    // 1. Update base Profile attributes
    await prisma.profile.update({
      where: { id: faculty.id },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName.trim() }),
        ...(data.lastName !== undefined && { lastName: data.lastName.trim() }),
        ...(data.phone !== undefined && { phone: data.phone.trim() }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
    });

    // 2. Upsert facultyProfile attributes
    if (data.department !== undefined || data.designation !== undefined || data.college !== undefined || data.employeeId !== undefined) {
      await prisma.facultyProfile.upsert({
        where: { profileId: faculty.id },
        create: {
          profileId: faculty.id,
          department: data.department?.trim() || faculty.facultyProfile?.department || 'CSE',
          designation: data.designation?.trim() || faculty.facultyProfile?.designation || 'Faculty Instructor',
          college: data.college?.trim() || faculty.facultyProfile?.college || 'Naan Mudhalvan Partner College',
          employeeId: data.employeeId?.trim() || faculty.facultyProfile?.employeeId || null,
        },
        update: {
          ...(data.department !== undefined && { department: data.department.trim() }),
          ...(data.designation !== undefined && { designation: data.designation.trim() }),
          ...(data.college !== undefined && { college: data.college.trim() }),
          ...(data.employeeId !== undefined && { employeeId: data.employeeId.trim() }),
        },
      });
    }

    return this.getFacultyProfile(facultyIdentityId);
  }
}
