import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import {
  CreateCompanyContactDto,
  UpdateCompanyContactDto,
} from './dto/create-company-contact.dto';
import {
  ManageContactDto,
  UpdateManagedContactDto,
} from './dto/manage-contact.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateVenueTicketingDto } from './dto/update-venue-ticketing.dto';
import { UpdateVenueProfileDto } from './dto/update-venue-profile.dto';
import { UpdateVenueDetailsDto } from './dto/update-venue-details.dto';

/** Static path routes must be registered before `:id` to avoid shadowing. */
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}


  @Get()
  findAll(
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number,
    @Query('q') q?: string,
    @Query('companyType') companyType?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
  ) {
    return this.companyService.findAllPaginated(
      offset,
      limit,
      q,
      companyType,
      sortBy,
      sortDir,
    );
  }

  @Post()
  create(@Body() dto: CreateCompanyDto) {
    return this.companyService.create(dto);
  }

  @Get(':id/contacts')
  listContacts(
    @Param('id', ParseIntPipe) id: number,
    @Query('roleId') roleIdRaw?: string,
    @Query('roleName') roleName?: string,
  ) {
    const roleId =
      roleIdRaw != null && String(roleIdRaw).trim().length > 0
        ? Number(roleIdRaw)
        : undefined;
    return this.companyService.listContacts(id, {
      roleId:
        roleId != null && Number.isInteger(roleId) && roleId > 0
          ? roleId
          : undefined,
      roleName,
    });
  }

  @Get(':id/contacts/linked-venues')
  listLinkedVenueContacts(@Param('id', ParseIntPipe) id: number) {
    return this.companyService.listLinkedVenueContactsForComplex(id);
  }

  @Post(':id/contacts')
  addContact(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCompanyContactDto,
  ) {
    return this.companyService.addContact(id, dto);
  }

  @Get(':id/engagements')
  listEngagements(@Param('id', ParseIntPipe) id: number) {
    return this.companyService.listEngagements(id);
  }

  @Get(':id/links')
  getCompanyLinks(@Param('id', ParseIntPipe) id: number) {
    return this.companyService.getCompanyLinks(id);
  }

  @Get(':id/venue-ticketing')
  getVenueTicketing(@Param('id', ParseIntPipe) id: number) {
    return this.companyService.getVenueTicketing(id);
  }

  @Patch(':id/venue-ticketing')
  updateVenueTicketing(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVenueTicketingDto,
  ) {
    return this.companyService.updateVenueTicketing(id, dto);
  }

  @Get(':id/venue-profile')
  getVenueProfile(@Param('id', ParseIntPipe) id: number) {
    return this.companyService.getVenueProfile(id);
  }

  @Post(':id/venue-profile/provision')
  provisionVenueProfile(@Param('id', ParseIntPipe) id: number) {
    return this.companyService.provisionVenueProfile(id);
  }

  @Patch(':id/venue-profile')
  updateVenueProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVenueProfileDto,
  ) {
    return this.companyService.updateVenueProfile(id, dto);
  }

  @Get(':id/venue-details')
  getVenueDetails(@Param('id', ParseIntPipe) id: number) {
    return this.companyService.getVenueDetails(id);
  }

  @Patch(':id/venue-details')
  updateVenueDetails(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVenueDetailsDto,
  ) {
    return this.companyService.updateVenueDetails(id, dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.companyService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCompanyDto) {
    return this.companyService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.companyService.remove(id);
  }
}

@Controller('contact-assignments')
export class ContactAssignmentsController {
  constructor(private readonly companyService: CompanyService) {}

  @Patch(':assignmentId')
  updateContact(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Body() dto: UpdateCompanyContactDto,
  ) {
    return this.companyService.updateContact(assignmentId, dto);
  }

  @Delete(':assignmentId')
  removeContact(@Param('assignmentId', ParseIntPipe) assignmentId: number) {
    return this.companyService.removeContactCompletely(assignmentId);
  }
}

@Controller('contacts')
export class ContactsController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  list(
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number,
    @Query('q') q?: string,
    @Query('companyId') companyIdRaw?: string,
  ) {
    const companyId =
      companyIdRaw != null && String(companyIdRaw).trim()
        ? Number(companyIdRaw)
        : undefined;
    return this.companyService.listManagedContacts(
      offset,
      limit,
      q,
      companyId != null && Number.isInteger(companyId) && companyId > 0
        ? companyId
        : undefined,
    );
  }

  @Post()
  create(@Body() dto: ManageContactDto) {
    return this.companyService.createManagedContact(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateManagedContactDto,
  ) {
    return this.companyService.updateManagedContact(id, dto);
  }

  @Get(':id/connections')
  getConnections(@Param('id', ParseIntPipe) id: number) {
    return this.companyService.getContactConnections(id);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const row = await this.companyService.findManagedContactById(id);
    if (!row) throw new NotFoundException(`Contact ${id} not found`);
    return row;
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.companyService.removeManagedContact(id);
  }
}
