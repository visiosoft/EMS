import {
  BadRequestException,
  Body,
  Controller,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DataSource, EntityManager, In } from 'typeorm';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { ContactAssignment } from '../entities/contact-assignment.entity';
import { ContactInfo } from '../entities/contact-info.entity';
import { Contact } from '../entities/contact.entity';
import { Role } from '../entities/role.entity';
import { Department } from '../entities/department.entity';

class UpdateContactAssignmentBulkDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  cellPhone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  workPhone?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  roleIds: number[];

  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  departmentIds: number[];
}

function assertOptionalE164Phone(
  value: string | null | undefined,
  field: 'work phone' | 'cell phone',
) {
  if (value == null) return;
  const t = String(value).trim();
  if (!t) return;
  if (!isValidPhoneNumber(t)) {
    throw new BadRequestException({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: `Invalid ${field}. Use a full international number (E.164, e.g. +1 415 555 1234) or leave the field empty.`,
    });
  }
}

function uniquePositiveInts(values: number[]): number[] {
  return Array.from(
    new Set(
      (values ?? []).map(Number).filter((n) => Number.isInteger(n) && n > 0),
    ),
  );
}

function getRaw(row: Record<string, unknown>, key: string): unknown {
  if (row[key] !== undefined && row[key] !== null) return row[key];
  const lower = key.toLowerCase();
  for (const k of Object.keys(row))
    if (k.toLowerCase() === lower) return row[k];
  return undefined;
}

@Controller('contact-assignments')
export class ContactAssignmentBulkUpdateController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Patch(':assignmentId/bulk')
  async updateContactBulk(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Body() dto: UpdateContactAssignmentBulkDto,
  ) {
    const roleIds = uniquePositiveInts(dto.roleIds);
    const departmentIds = uniquePositiveInts(dto.departmentIds);
    if (roleIds.length === 0)
      throw new BadRequestException({ message: 'Select at least one role.' });
    if (departmentIds.length === 0)
      throw new BadRequestException({
        message: 'Select at least one department.',
      });
    assertOptionalE164Phone(dto.workPhone ?? null, 'work phone');
    assertOptionalE164Phone(dto.cellPhone ?? null, 'cell phone');

    return this.dataSource.transaction(async (em) => {
      const assignmentRepo = em.getRepository(ContactAssignment);
      const infoRepo = em.getRepository(ContactInfo);
      const contactRepo = em.getRepository(Contact);

      const currentAssignment = await assignmentRepo.findOne({
        where: { contactAssignmentId: assignmentId },
        relations: { contact: { contactInfo: true } },
      });
      if (!currentAssignment)
        throw new NotFoundException(
          `Contact assignment ${assignmentId} not found`,
        );

      const [roles, departments] = await Promise.all([
        em.find(Role, { where: { roleId: In(roleIds) } }),
        em.find(Department, { where: { departmentId: In(departmentIds) } }),
      ]);
      if (roles.length !== roleIds.length)
        throw new BadRequestException({
          message: 'One or more selected roles are invalid.',
        });
      if (departments.length !== departmentIds.length)
        throw new BadRequestException({
          message: 'One or more selected departments are invalid.',
        });

      const companyId = currentAssignment.companyId;
      const oldContactId = currentAssignment.contactId;
      const oldContactInfoId = currentAssignment.contact.contactInfoId;
      const currentInfo = currentAssignment.contact.contactInfo;
      const currentEmail = String(currentInfo.email ?? '')
        .trim()
        .toLowerCase();
      const nextEmail = dto.email?.trim();
      const emailChanged =
        nextEmail !== undefined && nextEmail.toLowerCase() !== currentEmail;

      let targetContactId = oldContactId;
      let targetInfo = currentInfo;

      if (emailChanged && nextEmail) {
        const existingInfo = await infoRepo
          .createQueryBuilder('ci')
          .where('LOWER(ci.email) = LOWER(:email)', { email: nextEmail })
          .getOne();
        if (existingInfo) {
          targetInfo = existingInfo;
          if (dto.firstName !== undefined)
            targetInfo.firstName = dto.firstName.trim();
          if (dto.lastName !== undefined)
            targetInfo.lastName = dto.lastName.trim();
          targetInfo.email = nextEmail;
          if (dto.cellPhone !== undefined)
            targetInfo.cellPhone = dto.cellPhone?.trim() || null;
          if (dto.workPhone !== undefined)
            targetInfo.workPhone = dto.workPhone?.trim() || null;
          await infoRepo.save(targetInfo);
          let targetContact = await contactRepo.findOne({
            where: { contactInfoId: targetInfo.contactInfoId },
          });
          if (!targetContact) {
            targetContact = await contactRepo.save(
              contactRepo.create({ contactInfoId: targetInfo.contactInfoId }),
            );
          }
          targetContactId = targetContact.contactId;
        } else {
          targetInfo = await infoRepo.save(
            infoRepo.create({
              firstName:
                dto.firstName !== undefined
                  ? dto.firstName.trim()
                  : currentInfo.firstName,
              lastName:
                dto.lastName !== undefined
                  ? dto.lastName.trim()
                  : currentInfo.lastName,
              email: nextEmail,
              cellPhone:
                dto.cellPhone !== undefined
                  ? dto.cellPhone?.trim() || null
                  : currentInfo.cellPhone,
              workPhone:
                dto.workPhone !== undefined
                  ? dto.workPhone?.trim() || null
                  : currentInfo.workPhone,
            }),
          );
          const targetContact = await contactRepo.save(
            contactRepo.create({ contactInfoId: targetInfo.contactInfoId }),
          );
          targetContactId = targetContact.contactId;
        }
      } else {
        if (dto.firstName !== undefined)
          targetInfo.firstName = dto.firstName.trim();
        if (dto.lastName !== undefined)
          targetInfo.lastName = dto.lastName.trim();
        if (dto.email !== undefined) targetInfo.email = dto.email.trim();
        if (dto.cellPhone !== undefined)
          targetInfo.cellPhone = dto.cellPhone?.trim() || null;
        if (dto.workPhone !== undefined)
          targetInfo.workPhone = dto.workPhone?.trim() || null;
        await infoRepo.save(targetInfo);
      }

      if (targetContactId !== oldContactId) {
        await assignmentRepo.delete({ companyId, contactId: oldContactId });
      }
      await assignmentRepo.delete({ companyId, contactId: targetContactId });

      const createdIds: number[] = [];
      for (const roleId of roleIds) {
        for (const departmentId of departmentIds) {
          const saved = await assignmentRepo.save(
            assignmentRepo.create({
              companyId,
              contactId: targetContactId,
              roleId,
              departmentId,
            }),
          );
          createdIds.push(saved.contactAssignmentId);
        }
      }

      if (targetContactId !== oldContactId) {
        const remainingForOldContact = await assignmentRepo.count({
          where: { contactId: oldContactId },
        });
        if (remainingForOldContact === 0) {
          await contactRepo.delete({ contactId: oldContactId });
          const stillUsesOldInfo = await contactRepo.count({
            where: { contactInfoId: oldContactInfoId },
          });
          if (stillUsesOldInfo === 0)
            await infoRepo.delete({ contactInfoId: oldContactInfoId });
        }
      }

      return this.getRowsByAssignmentIds(em, createdIds);
    });
  }

  private async getRowsByAssignmentIds(em: EntityManager, ids: number[]) {
    const rows = await em
      .getRepository(ContactAssignment)
      .createQueryBuilder('ca')
      .innerJoin('ca.contact', 'ct')
      .innerJoin('ct.contactInfo', 'ci')
      .innerJoin('ca.role', 'r')
      .innerJoin('ca.department', 'd')
      .where('ca.contactAssignmentId IN (:...ids)', { ids })
      .select([
        'ca.contactAssignmentId AS contactAssignmentId',
        'ca.contactId AS contactId',
        'ci.contactInfoId AS contactInfoId',
        'ci.firstName AS firstName',
        'ci.lastName AS lastName',
        'ci.email AS email',
        'ci.cellPhone AS cellPhone',
        'ci.workPhone AS workPhone',
        'r.roleId AS roleId',
        'r.roleName AS roleName',
        'd.departmentId AS departmentId',
        'd.departmentName AS departmentName',
      ])
      .orderBy('ca.contactAssignmentId', 'ASC')
      .getRawMany();

    return rows.map((row: Record<string, unknown>) => ({
      contactAssignmentId: Number(getRaw(row, 'contactAssignmentId')),
      contactId: Number(getRaw(row, 'contactId')),
      contactInfoId: Number(getRaw(row, 'contactInfoId')),
      firstName: String(getRaw(row, 'firstName') ?? ''),
      lastName: String(getRaw(row, 'lastName') ?? ''),
      email: String(getRaw(row, 'email') ?? ''),
      cellPhone:
        getRaw(row, 'cellPhone') == null
          ? null
          : String(getRaw(row, 'cellPhone')),
      workPhone:
        getRaw(row, 'workPhone') == null
          ? null
          : String(getRaw(row, 'workPhone')),
      roleId: Number(getRaw(row, 'roleId')),
      roleName: String(getRaw(row, 'roleName') ?? ''),
      departmentId: Number(getRaw(row, 'departmentId')),
      departmentName: String(getRaw(row, 'departmentName') ?? ''),
    }));
  }
}
