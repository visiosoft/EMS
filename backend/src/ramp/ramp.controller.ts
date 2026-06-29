import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { RampService } from './ramp.service';

@Controller('ramp')
export class RampController {
  constructor(private readonly rampService: RampService) {}

  /** Check whether Ramp API credentials are configured. */
  @Get('status')
  getStatus() {
    return { configured: this.rampService.isConfigured() };
  }

  // ─── Transactions ─────────────────────────────────────────────────────────

  @Get('transactions')
  listTransactions(
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
    @Query('department_id') departmentId?: string,
    @Query('user_id') userId?: string,
    @Query('spend_program_id') spendProgramId?: string,
    @Query('page_size') pageSize?: string,
    @Query('start') start?: string,
  ) {
    return this.rampService.listTransactions({
      from_date: fromDate,
      to_date: toDate,
      department_id: departmentId,
      user_id: userId,
      spend_program_id: spendProgramId,
      page_size: pageSize ? Number(pageSize) : undefined,
      start,
    });
  }

  // ─── Bills ────────────────────────────────────────────────────────────────

  @Get('bills')
  listBills(
    @Query('from_due_date') fromDueDate?: string,
    @Query('to_due_date') toDueDate?: string,
    @Query('vendor_id') vendorId?: string,
    @Query('payment_status') paymentStatus?: string,
    @Query('page_size') pageSize?: string,
    @Query('start') start?: string,
  ) {
    return this.rampService.listBills({
      from_due_date: fromDueDate,
      to_due_date: toDueDate,
      vendor_id: vendorId,
      payment_status: paymentStatus,
      page_size: pageSize ? Number(pageSize) : undefined,
      start,
    });
  }

  // ─── Departments ──────────────────────────────────────────────────────────

  @Get('departments')
  listDepartments(
    @Query('page_size') pageSize?: string,
    @Query('start') start?: string,
  ) {
    return this.rampService.listDepartments({
      page_size: pageSize ? Number(pageSize) : undefined,
      start,
    });
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  @Get('users')
  listUsers(
    @Query('department_id') departmentId?: string,
    @Query('page_size') pageSize?: string,
    @Query('start') start?: string,
  ) {
    return this.rampService.listUsers({
      department_id: departmentId,
      page_size: pageSize ? Number(pageSize) : undefined,
      start,
    });
  }

  // ─── Vendors ──────────────────────────────────────────────────────────────

  @Get('vendors')
  listVendors(
    @Query('page_size') pageSize?: string,
    @Query('start') start?: string,
  ) {
    return this.rampService.listVendors({
      page_size: pageSize ? Number(pageSize) : undefined,
      start,
    });
  }

  // ─── Receipts ─────────────────────────────────────────────────────────────

  @Get('receipts')
  listReceipts(
    @Query('transaction_id') transactionId?: string,
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
    @Query('page_size') pageSize?: string,
    @Query('start') start?: string,
  ) {
    return this.rampService.listReceipts({
      transaction_id: transactionId,
      from_date: fromDate,
      to_date: toDate,
      page_size: pageSize ? Number(pageSize) : undefined,
      start,
    });
  }

  // ─── Spend Programs ───────────────────────────────────────────────────────

  @Get('spend-programs')
  listSpendPrograms(
    @Query('page_size') pageSize?: string,
    @Query('start') start?: string,
  ) {
    return this.rampService.listSpendPrograms({
      page_size: pageSize ? Number(pageSize) : undefined,
      start,
    });
  }

  // ─── Memos ────────────────────────────────────────────────────────────────

  @Get('memos')
  listMemos(
    @Query('user_id') userId?: string,
    @Query('department_id') departmentId?: string,
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
    @Query('page_size') pageSize?: string,
    @Query('start') start?: string,
  ) {
    return this.rampService.listMemos({
      user_id: userId,
      department_id: departmentId,
      from_date: fromDate,
      to_date: toDate,
      page_size: pageSize ? Number(pageSize) : undefined,
      start,
    });
  }

  // ─── Accounting ───────────────────────────────────────────────────────────

  @Get('accounting')
  listAccounting(
    @Query('page_size') pageSize?: string,
    @Query('start') start?: string,
  ) {
    return this.rampService.listAccounting({
      page_size: pageSize ? Number(pageSize) : undefined,
      start,
    });
  }
  // ─── Engagement-scoped Ramp data ──────────────────────────────────────

  @Get('engagement/:engagementId/mapping')
  getEngagementMapping(
    @Param('engagementId', ParseIntPipe) engagementId: number,
  ) {
    return this.rampService.resolveEngagementRampIds(engagementId);
  }

  @Get('engagement/:engagementId/transactions')
  getEngagementTransactions(
    @Param('engagementId', ParseIntPipe) engagementId: number,
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
    @Query('page_size') pageSize?: string,
    @Query('start') start?: string,
  ) {
    return this.rampService.getEngagementTransactions(engagementId, {
      from_date: fromDate,
      to_date: toDate,
      page_size: pageSize ? Number(pageSize) : undefined,
      start,
    });
  }

  @Get('engagement/:engagementId/bills')
  getEngagementBills(
    @Param('engagementId', ParseIntPipe) engagementId: number,
    @Query('from_due_date') fromDueDate?: string,
    @Query('to_due_date') toDueDate?: string,
    @Query('page_size') pageSize?: string,
    @Query('start') start?: string,
  ) {
    return this.rampService.getEngagementBills(engagementId, {
      from_due_date: fromDueDate,
      to_due_date: toDueDate,
      page_size: pageSize ? Number(pageSize) : undefined,
      start,
    });
  }

  @Get('engagement/:engagementId/receipts')
  getEngagementReceipts(
    @Param('engagementId', ParseIntPipe) engagementId: number,
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
    @Query('page_size') pageSize?: string,
    @Query('start') start?: string,
  ) {
    return this.rampService.getEngagementReceipts(engagementId, {
      from_date: fromDate,
      to_date: toDate,
      page_size: pageSize ? Number(pageSize) : undefined,
      start,
    });
  }
}
