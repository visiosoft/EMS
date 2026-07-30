import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditRequestContext } from '../audit/audit-request-context.service.js';
import {
  CreateCertificationDto,
  CreateSubmissionDto,
  ReviewSubmissionDto,
  UpdateCertificationDto,
} from './dto/learning.dto.js';

@Injectable()
export class LearningService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditContext: AuditRequestContext,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // PLATFORMS
  // ═══════════════════════════════════════════════════════════════════════════
  async getPlatforms() {
    const rows = await this.dataSource.query(`
      SELECT PlatformID, PlatformName, WebsiteUrl, IsActive
      FROM dbo.LearningPlatform
      WHERE IsActive = 1
      ORDER BY PlatformName
    `);
    return rows.map((r: any) => ({
      platformId: r.PlatformID,
      platformName: r.PlatformName,
      websiteUrl: r.WebsiteUrl,
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CERTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  async getCertifications(
    departmentId: number,
    status: string,
    level: string,
    platformId: number,
  ) {
    let where = 'WHERE 1=1';
    const params: any[] = [];
    let idx = 0;

    if (departmentId > 0) {
      where += ` AND c.DepartmentID = @${idx}`;
      params.push(departmentId);
      idx++;
    }
    if (status && status !== 'all') {
      where += ` AND c.Status = @${idx}`;
      params.push(status);
      idx++;
    }
    if (level && level !== 'all') {
      where += ` AND c.DifficultyLevel = @${idx}`;
      params.push(level);
      idx++;
    }
    if (platformId > 0) {
      where += ` AND c.PlatformID = @${idx}`;
      params.push(platformId);
      idx++;
    }

    const rows = await this.dataSource.query(
      `SELECT c.CertificationID, c.Title, c.Description, c.PlatformID,
              p.PlatformName, c.DepartmentID, d.DepartmentName,
              c.DifficultyLevel, c.PointsAwarded, c.EstimatedDuration,
              c.ExternalCourseUrl, c.Status, c.PublishedAt, c.CreatedAt
       FROM dbo.LearningCertification c
       JOIN dbo.LearningPlatform p ON p.PlatformID = c.PlatformID
       JOIN dbo.Department d ON d.DepartmentID = c.DepartmentID
       ${where}
       ORDER BY c.CreatedAt DESC`,
      params,
    );

    // Get tags for all certifications
    const certIds = rows.map((r: any) => r.CertificationID);
    let tagsMap: Record<number, string[]> = {};
    if (certIds.length > 0) {
      const tagRows = await this.dataSource.query(
        `SELECT ct.CertificationID, t.TagName
         FROM dbo.LearningCertificationTag ct
         JOIN dbo.LearningTag t ON t.TagID = ct.TagID
         WHERE ct.CertificationID IN (${certIds.join(',')})`,
      );
      for (const tr of tagRows) {
        if (!tagsMap[tr.CertificationID]) tagsMap[tr.CertificationID] = [];
        tagsMap[tr.CertificationID].push(tr.TagName);
      }
    }

    return rows.map((r: any) => ({
      certificationId: r.CertificationID,
      title: r.Title,
      description: r.Description,
      platformId: r.PlatformID,
      platformName: r.PlatformName,
      departmentId: r.DepartmentID,
      departmentName: r.DepartmentName,
      difficultyLevel: r.DifficultyLevel,
      pointsAwarded: r.PointsAwarded,
      estimatedDuration: r.EstimatedDuration,
      externalCourseUrl: r.ExternalCourseUrl,
      status: r.Status,
      publishedAt: r.PublishedAt,
      tags: tagsMap[r.CertificationID] || [],
    }));
  }

  async getCertificationById(id: number) {
    const rows = await this.dataSource.query(
      `SELECT c.CertificationID, c.Title, c.Description, c.PlatformID,
              p.PlatformName, c.DepartmentID, d.DepartmentName,
              c.DifficultyLevel, c.PointsAwarded, c.EstimatedDuration,
              c.ExternalCourseUrl, c.Status, c.PublishedAt
       FROM dbo.LearningCertification c
       JOIN dbo.LearningPlatform p ON p.PlatformID = c.PlatformID
       JOIN dbo.Department d ON d.DepartmentID = c.DepartmentID
       WHERE c.CertificationID = @0`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException('Certification not found');

    const tagRows = await this.dataSource.query(
      `SELECT t.TagName FROM dbo.LearningCertificationTag ct
       JOIN dbo.LearningTag t ON t.TagID = ct.TagID
       WHERE ct.CertificationID = @0`,
      [id],
    );

    const r = rows[0];
    return {
      certificationId: r.CertificationID,
      title: r.Title,
      description: r.Description,
      platformId: r.PlatformID,
      platformName: r.PlatformName,
      departmentId: r.DepartmentID,
      departmentName: r.DepartmentName,
      difficultyLevel: r.DifficultyLevel,
      pointsAwarded: r.PointsAwarded,
      estimatedDuration: r.EstimatedDuration,
      externalCourseUrl: r.ExternalCourseUrl,
      status: r.Status,
      tags: tagRows.map((t: any) => t.TagName),
    };
  }

  async createCertification(dto: CreateCertificationDto) {
    const userDisplayName = this.auditContext.getUserDisplayName() || 'System';
    const userId = this.auditContext.getUserOid() || userDisplayName;

    // Insert certification
    const result = await this.dataSource.query(
      `INSERT INTO dbo.LearningCertification
        (Title, Description, PlatformID, DepartmentID, DifficultyLevel,
         PointsAwarded, EstimatedDuration, ExternalCourseUrl, Status, PublishedAt, CreatedBy, UpdatedBy)
       OUTPUT INSERTED.CertificationID
       VALUES (@0, @1, @2, @3, @4, @5, @6, @7, 'Active', GETUTCDATE(), @8, @8)`,
      [
        dto.title,
        dto.description || null,
        dto.platformId,
        dto.departmentId,
        dto.difficultyLevel,
        dto.pointsAwarded,
        dto.estimatedDuration || null,
        dto.externalCourseUrl || null,
        userId,
      ],
    );

    const certId = result[0].CertificationID;

    // Insert tags
    if (dto.tags) {
      const tagNames = dto.tags.split(',').map((t) => t.trim()).filter(Boolean);
      for (const tagName of tagNames) {
        // Upsert tag
        await this.dataSource.query(
          `IF NOT EXISTS (SELECT 1 FROM dbo.LearningTag WHERE TagName = @0)
           INSERT INTO dbo.LearningTag (TagName) VALUES (@0)`,
          [tagName],
        );
        // Link to certification
        await this.dataSource.query(
          `INSERT INTO dbo.LearningCertificationTag (CertificationID, TagID)
           SELECT @0, TagID FROM dbo.LearningTag WHERE TagName = @1`,
          [certId, tagName],
        );
      }
    }

    // Audit log
    await this.dataSource.query(
      `INSERT INTO dbo.LearningAuditLog (ActionType, EntityType, EntityID, PerformedBy, Details)
       VALUES ('CERT_PUBLISHED', 'Certification', @0, @1, @2)`,
      [certId, userId, JSON.stringify({ title: dto.title })],
    );

    return this.getCertificationById(certId);
  }

  async updateCertification(id: number, dto: UpdateCertificationDto) {
    const userDisplayName = this.auditContext.getUserDisplayName() || 'System';
    const userId = this.auditContext.getUserOid() || userDisplayName;

    const sets: string[] = [];
    const params: any[] = [];
    let idx = 0;

    if (dto.title !== undefined) { sets.push(`Title = @${idx}`); params.push(dto.title); idx++; }
    if (dto.description !== undefined) { sets.push(`Description = @${idx}`); params.push(dto.description); idx++; }
    if (dto.platformId !== undefined) { sets.push(`PlatformID = @${idx}`); params.push(dto.platformId); idx++; }
    if (dto.departmentId !== undefined) { sets.push(`DepartmentID = @${idx}`); params.push(dto.departmentId); idx++; }
    if (dto.difficultyLevel !== undefined) { sets.push(`DifficultyLevel = @${idx}`); params.push(dto.difficultyLevel); idx++; }
    if (dto.pointsAwarded !== undefined) { sets.push(`PointsAwarded = @${idx}`); params.push(dto.pointsAwarded); idx++; }
    if (dto.estimatedDuration !== undefined) { sets.push(`EstimatedDuration = @${idx}`); params.push(dto.estimatedDuration); idx++; }
    if (dto.externalCourseUrl !== undefined) { sets.push(`ExternalCourseUrl = @${idx}`); params.push(dto.externalCourseUrl); idx++; }
    if (dto.status !== undefined) { sets.push(`Status = @${idx}`); params.push(dto.status); idx++; }

    sets.push(`UpdatedAt = GETUTCDATE()`);
    sets.push(`UpdatedBy = @${idx}`);
    params.push(userId);
    idx++;

    params.push(id); // last param is the ID

    if (sets.length > 2) {
      await this.dataSource.query(
        `UPDATE dbo.LearningCertification SET ${sets.join(', ')} WHERE CertificationID = @${idx}`,
        params,
      );
    }

    // Update tags if provided
    if (dto.tags !== undefined) {
      await this.dataSource.query(
        `DELETE FROM dbo.LearningCertificationTag WHERE CertificationID = @0`,
        [id],
      );
      const tagNames = dto.tags.split(',').map((t) => t.trim()).filter(Boolean);
      for (const tagName of tagNames) {
        await this.dataSource.query(
          `IF NOT EXISTS (SELECT 1 FROM dbo.LearningTag WHERE TagName = @0)
           INSERT INTO dbo.LearningTag (TagName) VALUES (@0)`,
          [tagName],
        );
        await this.dataSource.query(
          `INSERT INTO dbo.LearningCertificationTag (CertificationID, TagID)
           SELECT @0, TagID FROM dbo.LearningTag WHERE TagName = @1`,
          [id, tagName],
        );
      }
    }

    return this.getCertificationById(id);
  }

  async toggleCertificationStatus(id: number) {
    const userDisplayName = this.auditContext.getUserDisplayName() || 'System';
    const userId = this.auditContext.getUserOid() || userDisplayName;
    const rows = await this.dataSource.query(
      `SELECT Status FROM dbo.LearningCertification WHERE CertificationID = @0`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException('Certification not found');

    const newStatus = rows[0].Status === 'Active' ? 'Archived' : 'Active';
    await this.dataSource.query(
      `UPDATE dbo.LearningCertification
       SET Status = @0, UpdatedAt = GETUTCDATE(), UpdatedBy = @1
       WHERE CertificationID = @2`,
      [newStatus, userId, id],
    );

    await this.dataSource.query(
      `INSERT INTO dbo.LearningAuditLog (ActionType, EntityType, EntityID, PerformedBy, Details)
       VALUES (@0, 'Certification', @1, @2, @3)`,
      [
        newStatus === 'Archived' ? 'CERT_ARCHIVED' : 'CERT_PUBLISHED',
        id,
        userId,
        JSON.stringify({ newStatus }),
      ],
    );

    return { certificationId: id, status: newStatus };
  }

  async deleteCertification(id: number) {
    const userDisplayName = this.auditContext.getUserDisplayName() || 'System';
    const userId = this.auditContext.getUserOid() || userDisplayName;

    // Check certification exists
    const rows = await this.dataSource.query(
      `SELECT CertificationID, Title FROM dbo.LearningCertification WHERE CertificationID = @0`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException('Certification not found');

    const certTitle = rows[0].Title;

    // Remove all submissions referencing this certification (and reverse scores)
    const submissionRows = await this.dataSource.query(
      `SELECT SubmissionID FROM dbo.LearningSubmission WHERE CertificationID = @0`,
      [id],
    );
    for (const sub of submissionRows) {
      await this.deleteSubmission(sub.SubmissionID);
    }

    // Delete associated tags
    await this.dataSource.query(
      `DELETE FROM dbo.LearningCertificationTag WHERE CertificationID = @0`,
      [id],
    );

    // Delete associated progress records
    await this.dataSource.query(
      `DELETE FROM dbo.LearningProgress WHERE CertificationID = @0`,
      [id],
    );

    // Delete the certification
    await this.dataSource.query(
      `DELETE FROM dbo.LearningCertification WHERE CertificationID = @0`,
      [id],
    );

    // Audit log
    await this.dataSource.query(
      `INSERT INTO dbo.LearningAuditLog (ActionType, EntityType, EntityID, PerformedBy, Details)
       VALUES ('CERT_DELETED', 'Certification', @0, @1, @2)`,
      [id, userId, JSON.stringify({ title: certTitle })],
    );

    return { certificationId: id, deleted: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBMISSIONS
  // ═══════════════════════════════════════════════════════════════════════════
  async getSubmissions(
    departmentId: number,
    contactId: number,
    status: string,
    search: string,
  ) {
    let where = 'WHERE 1=1';
    const params: any[] = [];
    let idx = 0;

    if (departmentId > 0) {
      where += ` AND s.DepartmentID = @${idx}`;
      params.push(departmentId);
      idx++;
    }
    if (contactId > 0) {
      where += ` AND s.ContactID = @${idx}`;
      params.push(contactId);
      idx++;
    }
    if (status && status !== 'All Statuses' && status !== '') {
      where += ` AND s.Status = @${idx}`;
      params.push(status);
      idx++;
    }
    if (search) {
      where += ` AND (s.CertificationName LIKE @${idx} OR ci.FirstName + ' ' + ci.LastName LIKE @${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    const rows = await this.dataSource.query(
      `SELECT s.SubmissionID, s.CertificationID, s.ContactID, s.DepartmentID,
              s.CertificationName, s.IssuingOrganization, s.DateCompleted,
              s.CredentialId, s.CredentialUrl, s.AdditionalNotes,
              s.Status, s.PointsAwarded, s.ReviewedBy, s.ReviewedAt, s.AdminNotes,
              s.SubmittedAt,
              ci.FirstName + ' ' + ci.LastName AS EmployeeName,
              j.JobName AS EmployeeRole,
              d.DepartmentName,
              c.PlatformID, p.PlatformName
       FROM dbo.LearningSubmission s
       JOIN dbo.Contact ct ON ct.ContactID = s.ContactID
       JOIN dbo.ContactInfo ci ON ci.ContactInfoID = ct.ContactInfoID
       JOIN dbo.Department d ON d.DepartmentID = s.DepartmentID
       LEFT JOIN dbo.LearningCertification c ON c.CertificationID = s.CertificationID
       LEFT JOIN dbo.LearningPlatform p ON p.PlatformID = c.PlatformID
       LEFT JOIN dbo.ContactAssignment ca ON ca.ContactID = s.ContactID AND ca.DepartmentID = s.DepartmentID
       LEFT JOIN dbo.Job j ON j.JobID = ca.RoleID
       ${where}
       ORDER BY s.SubmittedAt DESC`,
      params,
    );

    return rows.map((r: any) => ({
      submissionId: r.SubmissionID,
      certificationId: r.CertificationID,
      contactId: r.ContactID,
      departmentId: r.DepartmentID,
      certificationName: r.CertificationName,
      issuingOrganization: r.IssuingOrganization,
      dateCompleted: r.DateCompleted,
      credentialId: r.CredentialId,
      credentialUrl: r.CredentialUrl,
      additionalNotes: r.AdditionalNotes,
      status: r.Status,
      pointsAwarded: r.PointsAwarded,
      reviewedBy: r.ReviewedBy,
      reviewedAt: r.ReviewedAt,
      adminNotes: r.AdminNotes,
      submittedAt: r.SubmittedAt,
      employeeName: r.EmployeeName,
      employeeRole: r.EmployeeRole,
      departmentName: r.DepartmentName,
      platformName: r.PlatformName,
    }));
  }

  async getSubmissionById(id: number) {
    const rows = await this.dataSource.query(
      `SELECT s.*, ci.FirstName + ' ' + ci.LastName AS EmployeeName,
              j.JobName AS EmployeeRole, p.PlatformName
       FROM dbo.LearningSubmission s
       JOIN dbo.Contact ct ON ct.ContactID = s.ContactID
       JOIN dbo.ContactInfo ci ON ci.ContactInfoID = ct.ContactInfoID
       LEFT JOIN dbo.LearningCertification c ON c.CertificationID = s.CertificationID
       LEFT JOIN dbo.LearningPlatform p ON p.PlatformID = c.PlatformID
       LEFT JOIN dbo.ContactAssignment ca ON ca.ContactID = s.ContactID AND ca.DepartmentID = s.DepartmentID
       LEFT JOIN dbo.Job j ON j.JobID = ca.RoleID
       WHERE s.SubmissionID = @0`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException('Submission not found');

    // Get documents
    const docs = await this.dataSource.query(
      `SELECT DocumentID, FileName, FileType, FileSizeBytes, StoragePath, UploadedAt
       FROM dbo.LearningSubmissionDocument
       WHERE SubmissionID = @0`,
      [id],
    );

    const r = rows[0];
    return {
      submissionId: r.SubmissionID,
      certificationId: r.CertificationID,
      contactId: r.ContactID,
      departmentId: r.DepartmentID,
      certificationName: r.CertificationName,
      issuingOrganization: r.IssuingOrganization,
      dateCompleted: r.DateCompleted,
      credentialId: r.CredentialId,
      credentialUrl: r.CredentialUrl,
      additionalNotes: r.AdditionalNotes,
      status: r.Status,
      pointsAwarded: r.PointsAwarded,
      reviewedBy: r.ReviewedBy,
      reviewedAt: r.ReviewedAt,
      adminNotes: r.AdminNotes,
      submittedAt: r.SubmittedAt,
      employeeName: r.EmployeeName,
      employeeRole: r.EmployeeRole,
      platformName: r.PlatformName,
      documents: docs.map((d: any) => ({
        documentId: d.DocumentID,
        fileName: d.FileName,
        fileType: d.FileType,
        fileSizeBytes: d.FileSizeBytes,
        storagePath: d.StoragePath,
        uploadedAt: d.UploadedAt,
      })),
    };
  }

  async createSubmission(dto: CreateSubmissionDto, file?: Express.Multer.File) {
    const userDisplayName = this.auditContext.getUserDisplayName() || 'System';
    const userOid = this.auditContext.getUserOid();
    const userId = userOid || userDisplayName;

    // Resolve ContactID from current user's OID — for now use the passed contactId
    // In production, look up ContactID from userOid via ContactAssignment

    // Resolve CertificationID: column is NOT NULL with FK, so look up by name if not provided
    let certificationId = dto.certificationId && dto.certificationId > 0 ? dto.certificationId : null;
    if (!certificationId && dto.certificationName) {
      const match = await this.dataSource.query(
        `SELECT TOP 1 CertificationID FROM dbo.LearningCertification
         WHERE Title = @0 AND DepartmentID = @1 AND Status = 'Active'`,
        [dto.certificationName, dto.departmentId],
      );
      if (match.length > 0) certificationId = match[0].CertificationID;
    }
    // If still no match, create an ad-hoc certification so the FK is satisfied
    if (!certificationId) {
      // Try to find a platform by issuing organization name, otherwise use first active platform
      let platformId = 1;
      if (dto.issuingOrganization) {
        const platMatch = await this.dataSource.query(
          `SELECT TOP 1 PlatformID FROM dbo.LearningPlatform WHERE PlatformName = @0 AND IsActive = 1`,
          [dto.issuingOrganization],
        );
        if (platMatch.length > 0) platformId = platMatch[0].PlatformID;
      }
      const inserted = await this.dataSource.query(
        `INSERT INTO dbo.LearningCertification
          (Title, PlatformID, DepartmentID, DifficultyLevel, PointsAwarded, Status, CreatedBy, UpdatedBy)
         OUTPUT INSERTED.CertificationID
         VALUES (@0, @1, @2, 'Beginner', 0, 'Active', @3, @3)`,
        [dto.certificationName, platformId, dto.departmentId, userId],
      );
      certificationId = inserted[0].CertificationID;
    }

    const result = await this.dataSource.query(
      `INSERT INTO dbo.LearningSubmission
        (CertificationID, ContactID, DepartmentID, CertificationName,
         IssuingOrganization, DateCompleted, CredentialId, CredentialUrl,
         AdditionalNotes, Status, PointsAwarded, SubmittedAt, CreatedBy, UpdatedBy)
       OUTPUT INSERTED.SubmissionID
       VALUES (@0, @1, @2, @3, @4, @5, @6, @7, @8, 'PENDING', 0, GETUTCDATE(), @9, @9)`,
      [
        certificationId,
        dto.contactId,
        dto.departmentId,
        dto.certificationName,
        dto.issuingOrganization || null,
        dto.dateCompleted,
        dto.credentialId || null,
        dto.credentialUrl || null,
        dto.additionalNotes || null,
        userId,
      ],
    );

    const submissionId = result[0].SubmissionID;

    // Save file if uploaded
    if (file) {
      await this.dataSource.query(
        `INSERT INTO dbo.LearningSubmissionDocument
          (SubmissionID, FileName, FileType, FileSizeBytes, StoragePath, UploadedBy)
         VALUES (@0, @1, @2, @3, @4, @5)`,
        [
          submissionId,
          file.originalname,
          file.originalname.split('.').pop()?.toUpperCase() || 'PDF',
          file.size,
          file.path,
          userId,
        ],
      );
    }

    // Update employee score (increment certsSubmitted)
    await this.dataSource.query(
      `IF EXISTS (SELECT 1 FROM dbo.LearningEmployeeScore WHERE ContactID = @0 AND DepartmentID = @1)
         UPDATE dbo.LearningEmployeeScore
         SET CertsSubmitted = CertsSubmitted + 1, LastActivityAt = GETUTCDATE(), UpdatedAt = GETUTCDATE()
         WHERE ContactID = @0 AND DepartmentID = @1
       ELSE
         INSERT INTO dbo.LearningEmployeeScore (ContactID, DepartmentID, TotalPoints, CertsSubmitted, CertsApproved, CurrentTier, LastActivityAt)
         VALUES (@0, @1, 0, 1, 0, 'Unranked', GETUTCDATE())`,
      [dto.contactId, dto.departmentId],
    );

    return this.getSubmissionById(submissionId);
  }

  async reviewSubmission(id: number, dto: ReviewSubmissionDto) {
    const userDisplayName = this.auditContext.getUserDisplayName() || 'System';
    const userId = this.auditContext.getUserOid() || userDisplayName;

    if (!['VERIFIED', 'REJECTED'].includes(dto.action)) {
      throw new BadRequestException('Action must be VERIFIED or REJECTED');
    }

    // Get submission to find points and employee
    const sub = await this.dataSource.query(
      `SELECT s.SubmissionID, s.ContactID, s.DepartmentID, s.CertificationID,
              c.PointsAwarded
       FROM dbo.LearningSubmission s
       LEFT JOIN dbo.LearningCertification c ON c.CertificationID = s.CertificationID
       WHERE s.SubmissionID = @0 AND s.Status = 'PENDING'`,
      [id],
    );
    if (sub.length === 0) throw new NotFoundException('Pending submission not found');

    const submission = sub[0];
    const pointsToAward = dto.action === 'VERIFIED' ? (submission.PointsAwarded || 0) : 0;

    // Update submission status
    await this.dataSource.query(
      `UPDATE dbo.LearningSubmission
       SET Status = @0, PointsAwarded = @1, ReviewedBy = @2, ReviewedAt = GETUTCDATE(),
           AdminNotes = @3, RejectionReason = @4, UpdatedAt = GETUTCDATE(), UpdatedBy = @2
       WHERE SubmissionID = @5`,
      [
        dto.action,
        pointsToAward,
        userId,
        dto.adminNotes || null,
        dto.rejectionReason || null,
        id,
      ],
    );

    // If approved, update employee score
    if (dto.action === 'VERIFIED') {
      await this.dataSource.query(
        `UPDATE dbo.LearningEmployeeScore
         SET TotalPoints = TotalPoints + @0,
             CertsApproved = CertsApproved + 1,
             LastActivityAt = GETUTCDATE(),
             UpdatedAt = GETUTCDATE(),
             CurrentTier = CASE
               WHEN TotalPoints + @0 >= 600 THEN 'Platinum'
               WHEN TotalPoints + @0 >= 400 THEN 'Gold'
               WHEN TotalPoints + @0 >= 200 THEN 'Silver'
               WHEN TotalPoints + @0 >= 100 THEN 'Bronze'
               ELSE 'Unranked'
             END
         WHERE ContactID = @1 AND DepartmentID = @2`,
        [pointsToAward, submission.ContactID, submission.DepartmentID],
      );

      // Update progress tracking
      await this.dataSource.query(
        `IF EXISTS (SELECT 1 FROM dbo.LearningProgress WHERE ContactID = @0 AND CertificationID = @1)
           UPDATE dbo.LearningProgress
           SET Status = 'Completed', ProgressPercent = 100, CompletedAt = GETUTCDATE(), UpdatedAt = GETUTCDATE()
           WHERE ContactID = @0 AND CertificationID = @1
         ELSE
           INSERT INTO dbo.LearningProgress (ContactID, CertificationID, DepartmentID, Status, ProgressPercent, CompletedAt)
           VALUES (@0, @1, @2, 'Completed', 100, GETUTCDATE())`,
        [submission.ContactID, submission.CertificationID, submission.DepartmentID],
      );
    }

    // Audit log
    await this.dataSource.query(
      `INSERT INTO dbo.LearningAuditLog (ActionType, EntityType, EntityID, PerformedBy, Details)
       VALUES (@0, 'Submission', @1, @2, @3)`,
      [
        dto.action === 'VERIFIED' ? 'SUBMISSION_APPROVED' : 'SUBMISSION_REJECTED',
        id,
        userId,
        JSON.stringify({ pointsAwarded: pointsToAward, adminNotes: dto.adminNotes }),
      ],
    );

    return this.getSubmissionById(id);
  }

  async deleteSubmission(id: number) {
    const userDisplayName = this.auditContext.getUserDisplayName() || 'System';
    const userId = this.auditContext.getUserOid() || userDisplayName;

    // Get submission details
    const rows = await this.dataSource.query(
      `SELECT s.SubmissionID, s.ContactID, s.DepartmentID, s.CertificationID,
              s.Status, s.PointsAwarded, s.CertificationName,
              ci.FirstName + ' ' + ci.LastName AS EmployeeName
       FROM dbo.LearningSubmission s
       LEFT JOIN dbo.Contact ct ON ct.ContactID = s.ContactID
       LEFT JOIN dbo.ContactInfo ci ON ci.ContactInfoID = ct.ContactInfoID
       WHERE s.SubmissionID = @0`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException('Submission not found');

    const submission = rows[0];
    const wasVerified = submission.Status === 'VERIFIED';
    const pointsToRemove = wasVerified ? (submission.PointsAwarded || 0) : 0;

    // If verified, reverse the score changes
    if (wasVerified) {
      await this.dataSource.query(
        `UPDATE dbo.LearningEmployeeScore
         SET TotalPoints = CASE WHEN TotalPoints - @0 < 0 THEN 0 ELSE TotalPoints - @0 END,
             CertsApproved = CASE WHEN CertsApproved - 1 < 0 THEN 0 ELSE CertsApproved - 1 END,
             CertsSubmitted = CASE WHEN CertsSubmitted - 1 < 0 THEN 0 ELSE CertsSubmitted - 1 END,
             UpdatedAt = GETUTCDATE(),
             CurrentTier = CASE
               WHEN CASE WHEN TotalPoints - @0 < 0 THEN 0 ELSE TotalPoints - @0 END >= 600 THEN 'Platinum'
               WHEN CASE WHEN TotalPoints - @0 < 0 THEN 0 ELSE TotalPoints - @0 END >= 400 THEN 'Gold'
               WHEN CASE WHEN TotalPoints - @0 < 0 THEN 0 ELSE TotalPoints - @0 END >= 200 THEN 'Silver'
               WHEN CASE WHEN TotalPoints - @0 < 0 THEN 0 ELSE TotalPoints - @0 END >= 100 THEN 'Bronze'
               ELSE 'Unranked'
             END
         WHERE ContactID = @1 AND DepartmentID = @2`,
        [pointsToRemove, submission.ContactID, submission.DepartmentID],
      );

      // Remove progress tracking for this certification
      if (submission.CertificationID) {
        await this.dataSource.query(
          `DELETE FROM dbo.LearningProgress WHERE ContactID = @0 AND CertificationID = @1`,
          [submission.ContactID, submission.CertificationID],
        );
      }
    } else {
      // Not verified, just decrement CertsSubmitted
      await this.dataSource.query(
        `UPDATE dbo.LearningEmployeeScore
         SET CertsSubmitted = CASE WHEN CertsSubmitted - 1 < 0 THEN 0 ELSE CertsSubmitted - 1 END,
             UpdatedAt = GETUTCDATE()
         WHERE ContactID = @0 AND DepartmentID = @1`,
        [submission.ContactID, submission.DepartmentID],
      );
    }

    // Delete associated documents
    await this.dataSource.query(
      `DELETE FROM dbo.LearningSubmissionDocument WHERE SubmissionID = @0`,
      [id],
    );

    // Delete the submission
    await this.dataSource.query(
      `DELETE FROM dbo.LearningSubmission WHERE SubmissionID = @0`,
      [id],
    );

    // Audit log
    await this.dataSource.query(
      `INSERT INTO dbo.LearningAuditLog (ActionType, EntityType, EntityID, PerformedBy, Details)
       VALUES ('SUBMISSION_REMOVED', 'Submission', @0, @1, @2)`,
      [
        id,
        userId,
        JSON.stringify({
          certificationName: submission.CertificationName,
          employeeName: submission.EmployeeName,
          contactId: submission.ContactID,
          previousStatus: submission.Status,
          pointsRemoved: pointsToRemove,
        }),
      ],
    );

    return { submissionId: id, deleted: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPLOYEE SCORES
  // ═══════════════════════════════════════════════════════════════════════════
  async getEmployeeScores(departmentId: number) {
    let where = '';
    const params: any[] = [];

    if (departmentId > 0) {
      where = 'WHERE es.DepartmentID = @0';
      params.push(departmentId);
    }

    const rows = await this.dataSource.query(
      `SELECT es.ScoreID, es.ContactID, es.DepartmentID, es.TotalPoints,
              es.CertsSubmitted, es.CertsApproved, es.CurrentTier, es.LastActivityAt,
              ci.FirstName + ' ' + ci.LastName AS EmployeeName,
              j.JobName AS EmployeeRole,
              d.DepartmentName
       FROM dbo.LearningEmployeeScore es
       JOIN dbo.Contact ct ON ct.ContactID = es.ContactID
       JOIN dbo.ContactInfo ci ON ci.ContactInfoID = ct.ContactInfoID
       JOIN dbo.Department d ON d.DepartmentID = es.DepartmentID
       LEFT JOIN dbo.ContactAssignment ca ON ca.ContactID = es.ContactID AND ca.DepartmentID = es.DepartmentID
       LEFT JOIN dbo.Job j ON j.JobID = ca.RoleID
       ${where}
       ORDER BY es.TotalPoints DESC`,
      params,
    );

    return rows.map((r: any, index: number) => ({
      scoreId: r.ScoreID,
      contactId: r.ContactID,
      departmentId: r.DepartmentID,
      totalPoints: r.TotalPoints,
      certsSubmitted: r.CertsSubmitted,
      certsApproved: r.CertsApproved,
      currentTier: r.CurrentTier,
      lastActivityAt: r.LastActivityAt,
      employeeName: r.EmployeeName,
      employeeRole: r.EmployeeRole,
      departmentName: r.DepartmentName,
      rank: index + 1,
    }));
  }

  async getMyScore(contactId: number, departmentId: number) {
    const rows = await this.dataSource.query(
      `SELECT es.TotalPoints, es.CertsSubmitted, es.CertsApproved, es.CurrentTier,
              es.LastActivityAt
       FROM dbo.LearningEmployeeScore es
       WHERE es.ContactID = @0 AND es.DepartmentID = @1`,
      [contactId, departmentId],
    );

    if (rows.length === 0) {
      return { totalPoints: 0, certsSubmitted: 0, certsApproved: 0, currentTier: 'Unranked', rank: 0 };
    }

    // Calculate rank
    const rankRows = await this.dataSource.query(
      `SELECT COUNT(*) + 1 AS Rank
       FROM dbo.LearningEmployeeScore
       WHERE DepartmentID = @0 AND TotalPoints > @1`,
      [departmentId, rows[0].TotalPoints],
    );

    const r = rows[0];
    return {
      totalPoints: r.TotalPoints,
      certsSubmitted: r.CertsSubmitted,
      certsApproved: r.CertsApproved,
      currentTier: r.CurrentTier,
      lastActivityAt: r.LastActivityAt,
      rank: rankRows[0]?.Rank || 1,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROGRESS TRACKING
  // ═══════════════════════════════════════════════════════════════════════════
  async getProgress(contactId: number, departmentId: number) {
    const rows = await this.dataSource.query(
      `SELECT lp.ProgressID, lp.CertificationID, lp.Status, lp.ProgressPercent,
              lp.StartedAt, lp.CompletedAt, c.Title AS CertificationTitle
       FROM dbo.LearningProgress lp
       JOIN dbo.LearningCertification c ON c.CertificationID = lp.CertificationID
       WHERE lp.ContactID = @0 AND lp.DepartmentID = @1
       ORDER BY lp.CompletedAt DESC, lp.UpdatedAt DESC`,
      [contactId, departmentId],
    );

    // Get total certifications count for this department
    const totalRows = await this.dataSource.query(
      `SELECT COUNT(*) AS Total FROM dbo.LearningCertification
       WHERE DepartmentID = @0 AND Status = 'Active'`,
      [departmentId],
    );

    const completed = rows.filter((r: any) => r.Status === 'Completed').length;
    const total = totalRows[0]?.Total || 0;

    return {
      items: rows.map((r: any) => ({
        progressId: r.ProgressID,
        certificationId: r.CertificationID,
        certificationTitle: r.CertificationTitle,
        status: r.Status,
        progressPercent: r.ProgressPercent,
        startedAt: r.StartedAt,
        completedAt: r.CompletedAt,
      })),
      summary: {
        completed,
        total,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POINT TIERS
  // ═══════════════════════════════════════════════════════════════════════════
  async getPointTiers() {
    const rows = await this.dataSource.query(
      `SELECT TierID, TierName, MinPoints, MaxPoints, DisplayIcon, SortOrder
       FROM dbo.LearningPointTier
       ORDER BY SortOrder`,
    );
    return rows.map((r: any) => ({
      tierId: r.TierID,
      tierName: r.TierName,
      minPoints: r.MinPoints,
      maxPoints: r.MaxPoints,
      displayIcon: r.DisplayIcon,
      sortOrder: r.SortOrder,
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OVERVIEW (Admin KPIs)
  // ═══════════════════════════════════════════════════════════════════════════
  async getOverview(departmentId: number) {
    const [empCount] = await this.dataSource.query(
      `SELECT COUNT(DISTINCT ca.ContactID) AS Total
       FROM dbo.ContactAssignment ca
       JOIN dbo.Company company ON company.CompanyID = ca.CompanyID
       WHERE ca.DepartmentID = @0 AND company.is_internal = 1`,
      [departmentId],
    );

    const [certCount] = await this.dataSource.query(
      `SELECT COUNT(*) AS Total FROM dbo.LearningCertification
       WHERE DepartmentID = @0 AND Status = 'Active'`,
      [departmentId],
    );

    const [subCounts] = await this.dataSource.query(
      `SELECT COUNT(*) AS Total,
              SUM(CASE WHEN Status = 'PENDING' THEN 1 ELSE 0 END) AS Pending
       FROM dbo.LearningSubmission
       WHERE DepartmentID = @0`,
      [departmentId],
    );

    return {
      totalEmployees: empCount?.Total || 0,
      activeCertifications: certCount?.Total || 0,
      totalSubmissions: subCounts?.Total || 0,
      pendingSubmissions: subCounts?.Pending || 0,
    };
  }
}
