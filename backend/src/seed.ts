import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';

import { CompanyType } from './entities/company-type.entity';
import { Role } from './entities/role.entity';
import { Department } from './entities/department.entity';
import { SeatingType } from './entities/seating-type.entity';
import { Dma } from './entities/dma.entity';
import { Class } from './entities/class.entity';
import { VenueType } from './entities/venue-type.entity';
import { Brand } from './entities/brand.entity';
import { Tax } from './entities/tax.entity';
import { ServiceProvided } from './entities/service-provided.entity';
import { CompanyTypeService } from './entities/company-type-service.entity';
import { Job } from './entities/job.entity';
import { Address } from './entities/address.entity';
import { Company } from './entities/company.entity';
import { ContactInfo } from './entities/contact-info.entity';
import { Contact } from './entities/contact.entity';
import { ContactAssignment } from './entities/contact-assignment.entity';
import { Attraction } from './entities/attraction.entity';
import { Tour } from './entities/tour.entity';
import { Engagement } from './entities/engagement.entity';
import { Performance } from './entities/performance.entity';
import { Venue } from './entities/venue.entity';
import { VenueTax } from './entities/venue-tax.entity';
import { VenueBrand } from './entities/venue-brand.entity';

async function bootstrap() {
  console.log('Starting Event Flow Database Seeder...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    // --- 1. SEED COMPANY TYPES ---
    const companyTypeRepo = dataSource.getRepository(CompanyType);
    let companyTypes = await companyTypeRepo.find();
    if (companyTypes.length === 0) {
      console.log('Seeding CompanyType...');
      const list = ['IAE', 'Co-Promoter', 'Presenter', 'Talent Agency', 'Venue', 'Vendor'];
      companyTypes = await companyTypeRepo.save(
        list.map((name) => {
          const type = new CompanyType();
          type.companyTypeName = name;
          return type;
        }),
      );
      console.log(`Seeded ${companyTypes.length} CompanyTypes.`);
    } else {
      console.log('CompanyType already seeded.');
    }

    // --- 2. SEED ROLES ---
    const roleRepo = dataSource.getRepository(Role);
    let roles = await roleRepo.find();
    if (roles.length === 0) {
      console.log('Seeding Role...');
      const list = [
        'Administrator',
        'Agent',
        'Artist',
        'Box Office Manager',
        'Co-Promoter Representative',
        'Presenter Representative',
        'Production Manager',
        'Tech Director',
      ];
      roles = await roleRepo.save(
        list.map((name) => {
          const r = new Role();
          r.roleName = name;
          return r;
        }),
      );
      console.log(`Seeded ${roles.length} Roles.`);
    } else {
      console.log('Role already seeded.');
    }

    // --- 3. SEED DEPARTMENTS ---
    const departmentRepo = dataSource.getRepository(Department);
    let departments = await departmentRepo.find();
    if (departments.length === 0) {
      console.log('Seeding Department...');
      const list = ['Administration', 'Box Office', 'Marketing', 'Operations', 'Production', 'Sales'];
      departments = await departmentRepo.save(
        list.map((name) => {
          const d = new Department();
          d.departmentName = name;
          return d;
        }),
      );
      console.log(`Seeded ${departments.length} Departments.`);
    } else {
      console.log('Department already seeded.');
    }

    // --- 4. SEED SEATING TYPES ---
    const seatingTypeRepo = dataSource.getRepository(SeatingType);
    let seatingTypes = await seatingTypeRepo.find();
    if (seatingTypes.length === 0) {
      console.log('Seeding SeatingType...');
      const list = ['Reserved', 'General Admission', 'Cabaret / Table', 'General Admission Standing'];
      seatingTypes = await seatingTypeRepo.save(
        list.map((name) => {
          const s = new SeatingType();
          s.seatingName = name;
          return s;
        }),
      );
      console.log(`Seeded ${seatingTypes.length} SeatingTypes.`);
    } else {
      console.log('SeatingType already seeded.');
    }

    // --- 5. SEED DMAS ---
    const dmaRepo = dataSource.getRepository(Dma);
    let dmas = await dmaRepo.find();
    if (dmas.length === 0) {
      console.log('Seeding Dma...');
      const list = [
        { marketName: 'NEW YORK', postalCode: '10001' },
        { marketName: 'LOS ANGELES', postalCode: '90001' },
        { marketName: 'CHICAGO', postalCode: '60601' },
        { marketName: 'TORONTO', postalCode: 'M5V 2T6' },
        { marketName: 'MONTREAL', postalCode: 'H2W 1Y4' },
      ];
      dmas = await dmaRepo.save(
        list.map((item) => {
          const d = new Dma();
          d.marketName = item.marketName;
          d.postalCode = item.postalCode;
          return d;
        }),
      );
      console.log(`Seeded ${dmas.length} DMAs.`);
    } else {
      console.log('Dma already seeded.');
    }

    // --- 6. SEED CLASSES ---
    const classRepo = dataSource.getRepository(Class);
    let classes = await classRepo.find();
    if (classes.length === 0) {
      console.log('Seeding Class...');
      const list = ['Class A', 'Class B', 'Class C'];
      classes = await classRepo.save(
        list.map((name) => {
          const c = new Class();
          c.className = name;
          return c;
        }),
      );
      console.log(`Seeded ${classes.length} Classes.`);
    } else {
      console.log('Class already seeded.');
    }

    // --- 7. SEED VENUE TYPES ---
    const venueTypeRepo = dataSource.getRepository(VenueType);
    let venueTypes = await venueTypeRepo.find();
    if (venueTypes.length === 0) {
      console.log('Seeding VenueType...');
      const list = ['Arena', 'Club', 'Festival Grounds', 'Stadium', 'Theater'];
      venueTypes = await venueTypeRepo.save(
        list.map((name) => {
          const vt = new VenueType();
          vt.venueTypeName = name;
          return vt;
        }),
      );
      console.log(`Seeded ${venueTypes.length} VenueTypes.`);
    } else {
      console.log('VenueType already seeded.');
    }

    // --- 8. SEED BRANDS ---
    const brandRepo = dataSource.getRepository(Brand);
    let brands = await brandRepo.find();
    if (brands.length === 0) {
      console.log('Seeding Brand...');
      const list = ['IAE Events', 'Broadway Series', 'Rock & Roll Presents'];
      brands = await brandRepo.save(
        list.map((name) => {
          const b = new Brand();
          b.brandName = name;
          return b;
        }),
      );
      console.log(`Seeded ${brands.length} Brands.`);
    } else {
      console.log('Brand already seeded.');
    }

    // --- 9. SEED TAXES ---
    const taxRepo = dataSource.getRepository(Tax);
    let taxes = await taxRepo.find();
    if (taxes.length === 0) {
      console.log('Seeding Tax...');
      const list = [
        { taxName: 'HST Ontario', taxRate: 0.13, taxJurisdictionType: 'State/Province' },
        { taxName: 'GST Canada', taxRate: 0.05, taxJurisdictionType: 'Federal' },
        { taxName: 'Sales Tax New York', taxRate: 0.0888, taxJurisdictionType: 'City' },
      ];
      taxes = await taxRepo.save(
        list.map((item) => {
          const t = new Tax();
          t.taxName = item.taxName;
          t.taxRate = item.taxRate;
          t.taxJurisdictionType = item.taxJurisdictionType;
          return t;
        }),
      );
      console.log(`Seeded ${taxes.length} Taxes.`);
    } else {
      console.log('Tax already seeded.');
    }

    // --- 10. SEED SERVICES PROVIDED ---
    const serviceProvidedRepo = dataSource.getRepository(ServiceProvided);
    let servicesProvided = await serviceProvidedRepo.find();
    if (servicesProvided.length === 0) {
      console.log('Seeding ServiceProvided...');
      const list = ['Catering', 'Cleaning', 'Security', 'Sound & Lights', 'Stagehands', 'Ticketing'];
      servicesProvided = await serviceProvidedRepo.save(
        list.map((name) => {
          const sp = new ServiceProvided();
          sp.serviceName = name;
          return sp;
        }),
      );
      console.log(`Seeded ${servicesProvided.length} ServicesProvided.`);
    } else {
      console.log('ServiceProvided already seeded.');
    }

    // --- 11. SEED COMPANY TYPE SERVICES ---
    const companyTypeServiceRepo = dataSource.getRepository(CompanyTypeService);
    const companyTypeServicesCount = await companyTypeServiceRepo.count();
    if (companyTypeServicesCount === 0) {
      console.log('Seeding CompanyTypeService mappings...');
      const venueType = companyTypes.find((ct) => ct.companyTypeName === 'Venue');
      const vendorType = companyTypes.find((ct) => ct.companyTypeName === 'Vendor');
      const ticketService = servicesProvided.find((sp) => sp.serviceName === 'Ticketing');
      const securityService = servicesProvided.find((sp) => sp.serviceName === 'Security');
      const stagehandsService = servicesProvided.find((sp) => sp.serviceName === 'Stagehands');

      const mappings: CompanyTypeService[] = [];
      if (venueType && ticketService) {
        const cts = new CompanyTypeService();
        cts.companyTypeId = venueType.companyTypeId;
        cts.serviceProvidedId = ticketService.serviceProvidedId;
        mappings.push(cts);
      }
      if (vendorType && securityService) {
        const cts = new CompanyTypeService();
        cts.companyTypeId = vendorType.companyTypeId;
        cts.serviceProvidedId = securityService.serviceProvidedId;
        mappings.push(cts);
      }
      if (vendorType && stagehandsService) {
        const cts = new CompanyTypeService();
        cts.companyTypeId = vendorType.companyTypeId;
        cts.serviceProvidedId = stagehandsService.serviceProvidedId;
        mappings.push(cts);
      }

      if (mappings.length > 0) {
        await companyTypeServiceRepo.save(mappings);
        console.log(`Seeded ${mappings.length} CompanyTypeService mappings.`);
      }
    } else {
      console.log('CompanyTypeService already seeded.');
    }

    // --- 12. SEED JOBS ---
    const jobRepo = dataSource.getRepository(Job);
    let jobs = await jobRepo.find();
    if (jobs.length === 0) {
      console.log('Seeding Job...');
      const list = [
        { jobName: 'Lead Production Specialist', jobCode: 'PROD-001', isActive: true },
        { jobName: 'Audio Engineer', jobCode: 'ENG-AUD', isActive: true },
        { jobName: 'Lighting Director', jobCode: 'LD-001', isActive: true },
      ];
      jobs = await jobRepo.save(
        list.map((item) => {
          const j = new Job();
          j.jobName = item.jobName;
          j.jobCode = item.jobCode;
          j.isActive = item.isActive;
          return j;
        }),
      );
      console.log(`Seeded ${jobs.length} Jobs.`);
    } else {
      console.log('Job already seeded.');
    }

    // --- 13. SEED ADDRESSES AND SAMPLE COMPANIES ---
    const addressRepo = dataSource.getRepository(Address);
    const companyRepo = dataSource.getRepository(Company);
    const companiesCount = await companyRepo.count();

    if (companiesCount === 0) {
      console.log('Seeding Sample Addresses and Companies...');
      // Primary addresses
      const addr1 = new Address();
      addr1.addressLine1 = '123 Broadway Ave';
      addr1.city = 'New York';
      addr1.stateProvince = 'NY';
      addr1.postalCode = '10001';
      addr1.country = 'USA';

      const addr2 = new Address();
      addr2.addressLine1 = '456 Front St W';
      addr2.city = 'Toronto';
      addr2.stateProvince = 'ON';
      addr2.postalCode = 'M5V 2T6';
      addr2.country = 'Canada';

      const savedAddr1 = await addressRepo.save(addr1);
      const savedAddr2 = await addressRepo.save(addr2);

      const presenterType = companyTypes.find((ct) => ct.companyTypeName === 'Presenter');
      const venueType = companyTypes.find((ct) => ct.companyTypeName === 'Venue');
      const nyDma = dmas.find((d) => d.marketName === 'NEW YORK');
      const toDma = dmas.find((d) => d.marketName === 'TORONTO');

      // Presenter Company
      const presCompany = new Company();
      presCompany.companyName = 'Broadway Presents Inc.';
      presCompany.companyTypeId = presenterType?.companyTypeId ?? companyTypes[0].companyTypeId;
      presCompany.physicalAddressId = savedAddr1.addressId;
      presCompany.mailingAddressId = savedAddr1.addressId;
      presCompany.dmaid = nyDma?.dmaid ?? null;
      presCompany.isInternal = false;
      presCompany.createdBy = 'SYSTEM_SEED';
      presCompany.createdAt = new Date();
      const savedPresComp = await companyRepo.save(presCompany);

      // Venue Company
      const venueCompany = new Company();
      venueCompany.companyName = 'Royal Alexandra Theatre';
      venueCompany.companyTypeId = venueType?.companyTypeId ?? companyTypes[0].companyTypeId;
      venueCompany.physicalAddressId = savedAddr2.addressId;
      venueCompany.mailingAddressId = savedAddr2.addressId;
      venueCompany.dmaid = toDma?.dmaid ?? null;
      venueCompany.isInternal = false;
      venueCompany.createdBy = 'SYSTEM_SEED';
      venueCompany.createdAt = new Date();
      const savedVenueComp = await companyRepo.save(venueCompany);

      console.log('Seeded sample companies.');

      // --- 14. SEED VENUE PROFILE ---
      const venueRepo = dataSource.getRepository(Venue);
      const vt = venueTypes.find((v) => v.venueTypeName === 'Theater');
      const st = seatingTypes.find((s) => s.seatingName === 'Reserved');

      const vProfile = new Venue();
      vProfile.companyId = savedVenueComp.companyId;
      vProfile.venueName = savedVenueComp.companyName;
      vProfile.seatingCapacity = 1497;
      vProfile.taxInCart = true;
      vProfile.venueRelationshipIae = 'Co-Presenter';
      vProfile.venueTypeId = vt?.venueTypeId ?? null;
      vProfile.seatingTypeId = st?.seatingTypeId ?? null;
      vProfile.loadDockAddressId = savedAddr2.addressId;
      vProfile.insuranceLanguage = 'Standard theatrical insurance required.';
      vProfile.stageDimensions = '40ft x 30ft';
      vProfile.flySystemSpecs = 'Double-purchase fly system, 32 linesets.';
      vProfile.stageType = 'Proscenium';
      await venueRepo.save(vProfile);
      console.log('Seeded Venue profile for Royal Alexandra Theatre.');

      // --- 15. SEED VENUE TAX & VENUE BRAND RELATIONSHIPS ---
      const venueTaxRepo = dataSource.getRepository(VenueTax);
      const venueBrandRepo = dataSource.getRepository(VenueBrand);

      if (taxes.length > 0) {
        const vt = new VenueTax();
        vt.venueCompanyId = savedVenueComp.companyId;
        vt.taxId = taxes[0].taxId;
        await venueTaxRepo.save(vt);
      }
      if (brands.length > 0) {
        const vb = new VenueBrand();
        vb.venueCompanyId = savedVenueComp.companyId;
        vb.brandId = brands[0].brandId;
        await venueBrandRepo.save(vb);
      }
      console.log('Seeded VenueTax and VenueBrand connections.');

      // --- 16. SEED CONTACTS ---
      const contactInfoRepo = dataSource.getRepository(ContactInfo);
      const contactRepo = dataSource.getRepository(Contact);
      const contactAssignmentRepo = dataSource.getRepository(ContactAssignment);

      const info1 = new ContactInfo();
      info1.firstName = 'John';
      info1.lastName = 'Doe';
      info1.email = 'john.doe@broadwaypresents.com';
      info1.cellPhone = '555-0199';
      info1.workPhone = '555-0100';
      const savedInfo1 = await contactInfoRepo.save(info1);

      const contact1 = new Contact();
      contact1.contactInfoId = savedInfo1.contactInfoId;
      contact1.createdBy = 'SYSTEM_SEED';
      contact1.createdAt = new Date();
      const savedContact1 = await contactRepo.save(contact1);

      const adminRole = roles.find((r) => r.roleName === 'Administrator');
      const adminDept = departments.find((d) => d.departmentName === 'Administration');

      const ca1 = new ContactAssignment();
      ca1.contactId = savedContact1.contactId;
      ca1.companyId = savedPresComp.companyId;
      ca1.roleId = adminRole?.roleId ?? roles[0].roleId;
      ca1.departmentId = adminDept?.departmentId ?? departments[0].departmentId;
      ca1.createdBy = 'SYSTEM_SEED';
      ca1.createdAt = new Date();
      await contactAssignmentRepo.save(ca1);
      console.log('Seeded sample contacts & assignments.');

      // --- 17. SEED ATTRACTIONS AND TOURS ---
      const attractionRepo = dataSource.getRepository(Attraction);
      const tourRepo = dataSource.getRepository(Tour);

      const attraction = new Attraction();
      attraction.attractionName = 'Wicked';
      attraction.createdBy = 'SYSTEM_SEED';
      attraction.createdAt = new Date();
      const savedAttr = await attractionRepo.save(attraction);

      const tour = new Tour();
      tour.tourName = 'Wicked - North American Tour 2026';
      tour.attractionId = savedAttr.attractionId;
      tour.classId = classes[0].classId;
      tour.ascap = true;
      tour.bmi = false;
      tour.sesac = false;
      tour.gmr = false;
      tour.tourStartDate = '2026-09-01';
      tour.tourEndDate = '2026-12-31';
      tour.createdBy = 'SYSTEM_SEED';
      tour.createdAt = new Date();
      const savedTour = await tourRepo.save(tour);
      console.log('Seeded Attractions and Tours.');

      // --- 18. SEED ENGAGEMENTS AND PERFORMANCES ---
      const engagementRepo = dataSource.getRepository(Engagement);
      const performanceRepo = dataSource.getRepository(Performance);

      const engagement = new Engagement();
      engagement.tourId = savedTour.tourId;
      engagement.engagementStatus = 'Confirmed';
      engagement.engagementScaling = 'Scale A';
      engagement.sellableCapacity = 1450;
      engagement.grossPotential = '120000.00';
      engagement.createdBy = 'SYSTEM_SEED';
      engagement.createdAt = new Date();
      const savedEngagement = await engagementRepo.save(engagement);

      const perf = new Performance();
      perf.engagementId = savedEngagement.engagementId;
      perf.performanceStatus = 'On Sale';
      perf.performanceDate = '2026-10-15';
      perf.performanceTime = '20:00:00';
      perf.createdBy = 'SYSTEM_SEED';
      perf.createdAt = new Date();
      await performanceRepo.save(perf);
      console.log('Seeded Engagements and Performances.');
    } else {
      console.log('Sample companies, venues, contacts, tours, engagements already seeded.');
    }

    console.log('Database Seeding Complete!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
