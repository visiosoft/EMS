import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { ContactInfo } from '../entities/contact-info.entity';
import { Contact } from '../entities/contact.entity';
import { ContactAssignment } from '../entities/contact-assignment.entity';
import { Company } from '../entities/company.entity';
import { Role } from '../entities/role.entity';
import { Department } from '../entities/department.entity';
import { CreateCompanyContactBulkDto } from './dto/create-company-contact-bulk.dto';

function assertOptionalE164Phone(
  value: string | null | undefined,
  field: 'work phone' | 'cell phone',
) {
  if (value == null) return;
  const t = value.trim();
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

@Controller('companies')
export class CompanyContactBulkController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Post(':id/contacts/bulk')
  async addContactBulk(
    @Param('id', ParseIntPipe) companyId: number,
    @Body() dto: CreateCompanyContactBulkDto,
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
      const company = await em.findOne(Company, { where: { companyId } });
      if (!company)
        throw new BadRequestException({
          message: `Company #${companyId} does not exist.`,
        });

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

      const savedContact = await this.getOrCreateContact(em, dto);
      const createdIds: number[] = [];
      const skipped: string[] = [];

      for (const roleId of roleIds) {
        for (const departmentId of departmentIds) {
          const existing = await em.findOne(ContactAssignment, {
            where: {
              companyId,
              contactId: savedContact.contactId,
              roleId,
              departmentId,
            },
          });
          if (existing) {
            skipped.push(`${roleId}:${departmentId}`);
            continue;
          }
          const saved = await em.save(
            ContactAssignment,
            em.create(ContactAssignment, {
              contactId: savedContact.contactId,
              companyId,
              roleId,
              departmentId,
            }),
          );
          createdIds.push(saved.contactAssignmentId);
        }
      }

      if (createdIds.length === 0) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          message:
            'This contact is already linked to this company for all selected role and department combinations.',
          detail: skipped.join(', '),
        });
      }

      return this.getRowsByAssignmentIds(em, createdIds);
    });
  }

  private async getOrCreateContact(
    em: EntityManager,
    dto: CreateCompanyContactBulkDto,
  ): Promise<Contact> {
    const email = dto.email.trim();
    const existingInfo = await em
      .createQueryBuilder(ContactInfo, 'ci')
      .where('LOWER(ci.email) = LOWER(:email)', { email })
      .getOne();

    const info = existingInfo
      ? await em.save(
          ContactInfo,
          Object.assign(existingInfo, {
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            email,
            cellPhone:
              dto.cellPhone !== undefined
                ? dto.cellPhone?.trim() || null
                : existingInfo.cellPhone,
            workPhone:
              dto.workPhone !== undefined
                ? dto.workPhone?.trim() || null
                : existingInfo.workPhone,
          }),
        )
      : await em.save(
          ContactInfo,
          em.create(ContactInfo, {
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            email,
            cellPhone: dto.cellPhone?.trim() || null,
            workPhone: dto.workPhone?.trim() || null,
          }),
        );

    const existingContact = await em.findOne(Contact, {
      where: { contactInfoId: info.contactInfoId },
    });
    return (
      existingContact ??
      em.save(
        Contact,
        em.create(Contact, { contactInfoId: info.contactInfoId }),
      )
    );
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
