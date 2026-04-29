import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Class } from '../entities/class.entity';
import { CompanyType } from '../entities/company-type.entity';
import { Department } from '../entities/department.entity';
import { Dma } from '../entities/dma.entity';
import { Role } from '../entities/role.entity';
import { SeatingType } from '../entities/seating-type.entity';
import { VenueType } from '../entities/venue-type.entity';
import { Brand } from '../entities/brand.entity';
import { ServiceProvided } from '../entities/service-provided.entity';
import { Tax } from '../entities/tax.entity';
import { CompanyService as CompanyServiceEntity } from '../entities/company-service.entity';
import { Company } from '../entities/company.entity';
import { NonResidentWithholding } from '../entities/non-resident-withholding.entity';

@Injectable()
export class LookupsService {
  constructor(
    @InjectRepository(CompanyType)
    private readonly companyTypeRepo: Repository<CompanyType>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(SeatingType)
    private readonly seatingTypeRepo: Repository<SeatingType>,
    @InjectRepository(Dma)
    private readonly dmaRepo: Repository<Dma>,
    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,
    @InjectRepository(VenueType)
    private readonly venueTypeRepo: Repository<VenueType>,
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
    @InjectRepository(Tax)
    private readonly taxRepo: Repository<Tax>,
    @InjectRepository(ServiceProvided)
    private readonly serviceProvidedRepo: Repository<ServiceProvided>,
    @InjectRepository(CompanyServiceEntity)
    private readonly companyServiceRepo: Repository<CompanyServiceEntity>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(NonResidentWithholding)
    private readonly nonResidentWithholdingRepo: Repository<NonResidentWithholding>,
  ) {}

  findCompanyTypes() {
    return this.companyTypeRepo.find({
      order: { companyTypeName: 'ASC' },
    });
  }

  findRoles() {
    return this.roleRepo.find({ order: { roleName: 'ASC' } });
  }

  findDepartments() {
    return this.departmentRepo.find({ order: { departmentName: 'ASC' } });
  }

  findSeatingTypes() {
    return this.seatingTypeRepo.find({ order: { seatingName: 'ASC' } });
  }

  findClasses() {
    return this.classRepo.find({ order: { className: 'ASC' } });
  }

  findVenueTypes() {
    return this.venueTypeRepo.find({ order: { venueTypeName: 'ASC' } });
  }

  findBrands() {
    return this.brandRepo.find({ order: { brandName: 'ASC' } });
  }

  findTaxes() {
    return this.taxRepo.find({ order: { taxJurisdictionType: 'ASC' as const, taxName: 'ASC' as const } });
  }

  findServicesProvided() {
    return this.serviceProvidedRepo.find({ order: { serviceName: 'ASC' } });
  }

  async findStagehandProviders(): Promise<{ companyId: number; companyName: string }[]> {
    const stagehands = await this.serviceProvidedRepo
      .createQueryBuilder('sp')
      .where('LOWER(sp.serviceName) = LOWER(:n)', { n: 'Stagehands' })
      .getOne();
    if (!stagehands) return [];

    const rows = await this.companyServiceRepo
      .createQueryBuilder('cs')
      .innerJoin(Company, 'c', 'c.companyId = cs.companyId')
      .where('cs.serviceProvidedId = :sid', { sid: stagehands.serviceProvidedId })
      .select(['c.companyId AS companyId', 'c.companyName AS companyName'])
      .orderBy('c.companyName', 'ASC')
      .getRawMany<Record<string, unknown>>();

    return rows.map((r) => ({
      companyId: Number(r.companyId ?? r.CompanyID),
      companyName: String(r.companyName ?? r.CompanyName ?? ''),
    }));
  }

  async findNonResidentWithholdings(): Promise<
    { withholdingId: number; withholdingTaxRate: string; dmaid: number | null; taxAgencyId: number | null }[]
  > {
    const rows = await this.nonResidentWithholdingRepo.find({
      order: { withholdingId: 'ASC' as const },
    });
    return rows.map((r) => ({
      withholdingId: r.withholdingId,
      withholdingTaxRate: r.withholdingTaxRate,
      dmaid: r.dmaid ?? null,
      taxAgencyId: r.taxAgencyId ?? null,
    }));
  }

  /** First DMA row matching postal code (dbo.DMA is postal-level). */
  async findDmaByPostal(postalCode: string) {
    const pc = postalCode.trim();
    const row = await this.dmaRepo
      .createQueryBuilder('d')
      .where('d.postalCode = :pc', { pc })
      .orderBy('d.dmaid', 'ASC')
      .getOne();
    return row;
  }

  /**
   * All rows from dbo.DMA (DMAID is unique per postal code / row).
   * Do not use `select(['DISTINCT ...'])` — TypeORM generates invalid SQL Server syntax
   * (`SELECT col1, DISTINCT col2`). Use `.distinct(true)` after `.select()` if DISTINCT is ever required.
   */
  async findDmaMarkets(): Promise<
    { dmaid: number; marketName: string; postalCode: string }[]
  > {
    const rows = await this.dmaRepo
      .createQueryBuilder('d')
      .select('d.dmaid', 'dmaid')
      .addSelect('d.marketName', 'marketName')
      .addSelect('d.postalCode', 'postalCode')
      .orderBy('d.marketName', 'ASC')
      .addOrderBy('d.dmaid', 'ASC')
      .getRawMany<Record<string, unknown>>();
    return rows.map((r) => ({
      dmaid: Number(r.dmaid ?? r.DMAID),
      marketName: String(r.marketName ?? r.MarketName ?? ''),
      postalCode: String(r.postalCode ?? r.PostalCode ?? ''),
    }));
  }

  /** Search DMA markets by query string (case-insensitive partial match). */
  async searchDmaMarkets(
    query: string,
    limit = 50,
  ): Promise<{ dmaid: number; marketName: string; postalCode: string }[]> {
    const qb = this.dmaRepo
      .createQueryBuilder('d')
      .select('d.dmaid', 'dmaid')
      .addSelect('d.marketName', 'marketName')
      .addSelect('d.postalCode', 'postalCode')
      .orderBy('d.marketName', 'ASC')
      .addOrderBy('d.dmaid', 'ASC')
      .take(limit);

    if (query.trim()) {
      const sq = `%${query.trim()}%`;
      qb.where(
        "(LOWER(d.marketName) LIKE LOWER(:sq) OR LOWER(ISNULL(d.postalCode, '')) LIKE LOWER(:sq))",
        { sq },
      );
    }

    const rows = await qb.getRawMany<Record<string, unknown>>();
    return rows.map((r) => ({
      dmaid: Number(r.dmaid ?? r.DMAID),
      marketName: String(r.marketName ?? r.MarketName ?? ''),
      postalCode: String(r.postalCode ?? r.PostalCode ?? ''),
    }));
  }

  /** Paginated DMA markets with optional search filter. */
  async findDmaMarketsPaginated(
    offset: number,
    limit: number,
    query = '',
  ): Promise<{
    data: { dmaid: number; marketName: string; postalCode: string }[];
    total: number;
  }> {
    const qb = this.dmaRepo
      .createQueryBuilder('d')
      .select('d.dmaid', 'dmaid')
      .addSelect('d.marketName', 'marketName')
      .addSelect('d.postalCode', 'postalCode')
      .orderBy('d.marketName', 'ASC')
      .addOrderBy('d.dmaid', 'ASC');

    if (query.trim()) {
      const sq = `%${query.trim()}%`;
      qb.where(
        "(LOWER(d.marketName) LIKE LOWER(:sq) OR LOWER(ISNULL(d.postalCode, '')) LIKE LOWER(:sq))",
        { sq },
      );
    }

    const total = await qb.getCount();
    const rows = await qb
      .offset(offset)
      .limit(limit)
      .getRawMany<Record<string, unknown>>();

    return {
      data: rows.map((r) => ({
        dmaid: Number(r.dmaid ?? r.DMAID),
        marketName: String(r.marketName ?? r.MarketName ?? ''),
        postalCode: String(r.postalCode ?? r.PostalCode ?? ''),
      })),
      total,
    };
  }
}
