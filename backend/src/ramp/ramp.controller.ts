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
    @Query('accounting_field_selection_id') accountingFieldSelectionId?: string,
    @Query('card_id') cardId?: string,
    @Query('entity_id') entityId?: string,
    @Query('merchant_id') merchantId?: string,
    @Query('state') state?: string,
    @Query('sync_status') syncStatus?: string,
    @Query('min_amount') minAmount?: string,
    @Query('max_amount') maxAmount?: string,
    @Query('sk_category_id') skCategoryId?: string,
    @Query('order_by_date_desc') orderByDateDesc?: string,
    @Query('order_by_date_asc') orderByDateAsc?: string,
    @Query('order_by_amount_desc') orderByAmountDesc?: string,
    @Query('order_by_amount_asc') orderByAmountAsc?: string,
    @Query('has_no_sync_commits') hasNoSyncCommits?: string,
    @Query('requires_memo') requiresMemo?: string,
    @Query('page_size') pageSize?: string,
    @Query('start') start?: string,
  ) {
    return this.rampService.listTransactions({
      from_date: fromDate,
      to_date: toDate,
      department_id: departmentId,
      user_id: userId,
      spend_program_id: spendProgramId,
      accounting_field_selection_id: accountingFieldSelectionId,
      card_id: cardId,
      entity_id: entityId,
      merchant_id: merchantId,
      state,
      sync_status: syncStatus,
      min_amount: minAmount,
      max_amount: maxAmount,
      sk_category_id: skCategoryId ? Number(skCategoryId) : undefined,
      order_by_date_desc: orderByDateDesc === 'true' ? true : undefined,
      order_by_date_asc: orderByDateAsc === 'true' ? true : undefined,
      order_by_amount_desc: orderByAmountDesc === 'true' ? true : undefined,
      order_by_amount_asc: orderByAmountAsc === 'true' ? true : undefined,
      has_no_sync_commits: hasNoSyncCommits === 'true' ? true : undefined,
      requires_memo: requiresMemo === 'true' ? true : undefined,
      page_size: pageSize ? Number(pageSize) : undefined,
      start,
    });
  }

  // ─── Bills ────────────────────────────────────────────────────────────────

  @Get('bills')
  listBills(
    @Query('from_due_date') fromDueDate?: string,
    @Query('to_due_date') toDueDate?: string,
    @Query('from_issued_date') fromIssuedDate?: string,
    @Query('to_issued_date') toIssuedDate?: string,
    @Query('from_created_at') fromCreatedAt?: string,
    @Query('to_created_at') toCreatedAt?: string,
    @Query('from_paid_at') fromPaidAt?: string,
    @Query('to_paid_at') toPaidAt?: string,
    @Query('from_payment_date') fromPaymentDate?: string,
    @Query('to_payment_date') toPaymentDate?: string,
    @Query('vendor_id') vendorId?: string,
    @Query('entity_id') entityId?: string,
    @Query('payment_status') paymentStatus?: string,
    @Query('payment_method') paymentMethod?: string,
    @Query('approval_status') approvalStatus?: string,
    @Query('sync_status') syncStatus?: string,
    @Query('status_summaries') statusSummaries?: string,
    @Query('accounting_field_selection_id') accountingFieldSelectionId?: string,
    @Query('invoice_number') invoiceNumber?: string,
    @Query('remote_id') remoteId?: string,
    @Query('draft_bill_id') draftBillId?: string,
    @Query('is_archived') isArchived?: string,
    @Query('min_amount') minAmount?: string,
    @Query('max_amount') maxAmount?: string,
    @Query('sync_ready') syncReady?: string,
    @Query('page_size') pageSize?: string,
    @Query('start') start?: string,
  ) {
    return this.rampService.listBills({
      from_due_date: fromDueDate,
      to_due_date: toDueDate,
      from_issued_date: fromIssuedDate,
      to_issued_date: toIssuedDate,
      from_created_at: fromCreatedAt,
      to_created_at: toCreatedAt,
      from_paid_at: fromPaidAt,
      to_paid_at: toPaidAt,
      from_payment_date: fromPaymentDate,
      to_payment_date: toPaymentDate,
      vendor_id: vendorId,
      entity_id: entityId,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      approval_status: approvalStatus,
      sync_status: syncStatus,
      status_summaries: statusSummaries,
      accounting_field_selection_id: accountingFieldSelectionId,
      invoice_number: invoiceNumber,
      remote_id: remoteId,
      draft_bill_id: draftBillId,
      is_archived: isArchived !== undefined ? isArchived === 'true' : undefined,
      min_amount: minAmount,
      max_amount: maxAmount,
      sync_ready: syncReady !== undefined ? syncReady === 'true' : undefined,
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
    @Query('email') email?: string,
    @Query('employee_id') employeeId?: string,
    @Query('entity_id') entityId?: string,
    @Query('location_id') locationId?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('page_size') pageSize?: string,
    @Query('start') start?: string,
  ) {
    return this.rampService.listUsers({
      department_id: departmentId,
      email,
      employee_id: employeeId,
      entity_id: entityId,
      location_id: locationId,
      role,
      status,
      page_size: pageSize ? Number(pageSize) : undefined,
      start,
    });
  }

  // ─── Vendors ──────────────────────────────────────────────────────────────

  @Get('vendors')
  listVendors(
    @Query('name') name?: string,
    @Query('page_size') pageSize?: string,
    @Query('start') start?: string,
  ) {
    return this.rampService.listVendors({
      name,
      page_size: pageSize ? Number(pageSize) : undefined,
      start,
    });
  }

  // ─── Receipts ─────────────────────────────────────────────────────────────

  @Get('receipts')
  listReceipts(
    @Query('transaction_id') transactionId?: string,
    @Query('user_id') userId?: string,
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
    @Query('page_size') pageSize?: string,
    @Query('start') start?: string,
  ) {
    return this.rampService.listReceipts({
      transaction_id: transactionId,
      user_id: userId,
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

  /** List all accounting connections for the current business. */
  @Get('accounting/connections')
  listAccountingConnections() {
    return this.rampService.listAccountingConnections();
  }

  /** List general ledger (GL) accounts (chart of accounts). */
  @Get('accounting/gl-accounts')
  listGlAccounts(
    @Query('accounting_connection_id') accountingConnectionId?: string,
    @Query('is_active') isActive?: string,
    @Query('code') code?: string,
    @Query('remote_id') remoteId?: string,
    @Query('page_size') pageSize?: string,
    @Query('start') start?: string,
  ) {
    return this.rampService.listGlAccounts({
      accounting_connection_id: accountingConnectionId,
      is_active: isActive !== undefined ? isActive === 'true' : undefined,
      code,
      remote_id: remoteId,
      page_size: pageSize ? Number(pageSize) : undefined,
      start,
    });
  }

  /** List custom accounting fields. */
  @Get('accounting/fields')
  listAccountingFields(
    @Query('accounting_connection_id') accountingConnectionId?: string,
    @Query('is_active') isActive?: string,
    @Query('remote_id') remoteId?: string,
    @Query('page_size') pageSize?: string,
    @Query('start') start?: string,
  ) {
    return this.rampService.listAccountingFields({
      accounting_connection_id: accountingConnectionId,
      is_active: isActive !== undefined ? isActive === 'true' : undefined,
      remote_id: remoteId,
      page_size: pageSize ? Number(pageSize) : undefined,
      start,
    });
  }

  /** List custom accounting field options for a given field. */
  @Get('accounting/field-options')
  listAccountingFieldOptions(
    @Query('field_id') fieldId: string,
    @Query('accounting_connection_id') accountingConnectionId?: string,
    @Query('is_active') isActive?: string,
    @Query('code') code?: string,
    @Query('remote_id') remoteId?: string,
    @Query('visibility') visibility?: string,
    @Query('page_size') pageSize?: string,
    @Query('start') start?: string,
  ) {
    return this.rampService.listAccountingFieldOptions(fieldId, {
      accounting_connection_id: accountingConnectionId,
      is_active: isActive !== undefined ? isActive === 'true' : undefined,
      code,
      remote_id: remoteId,
      visibility,
      page_size: pageSize ? Number(pageSize) : undefined,
      start,
    });
  }

  /** List accounting vendors from the ERP integration. */
  @Get('accounting/vendors')
  listAccountingVendors(
    @Query('accounting_connection_id') accountingConnectionId?: string,
    @Query('is_active') isActive?: string,
    @Query('is_synced') isSynced?: string,
    @Query('code') code?: string,
    @Query('remote_id') remoteId?: string,
    @Query('page_size') pageSize?: string,
    @Query('start') start?: string,
  ) {
    return this.rampService.listAccountingVendors({
      accounting_connection_id: accountingConnectionId,
      is_active: isActive !== undefined ? isActive === 'true' : undefined,
      is_synced: isSynced !== undefined ? isSynced === 'true' : undefined,
      code,
      remote_id: remoteId,
      page_size: pageSize ? Number(pageSize) : undefined,
      start,
    });
  }

  /** Retrieve Customer/Job data as Ramp Custom Fields and their Options. */
  @Get('accounting/customer-job')
  getCustomerJobFieldOptions() {
    return this.rampService.getCustomerJobFieldOptions();
  }

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
    @Query('department_id') departmentId?: string,
    @Query('user_id') userId?: string,
    @Query('spend_program_id') spendProgramId?: string,
    @Query('card_id') cardId?: string,
    @Query('entity_id') entityId?: string,
    @Query('merchant_id') merchantId?: string,
    @Query('state') state?: string,
    @Query('sync_status') syncStatus?: string,
    @Query('min_amount') minAmount?: string,
    @Query('max_amount') maxAmount?: string,
    @Query('sk_category_id') skCategoryId?: string,
    @Query('page_size') pageSize?: string,
    @Query('start') start?: string,
  ) {
    return this.rampService.getEngagementTransactions(engagementId, {
      from_date: fromDate,
      to_date: toDate,
      department_id: departmentId,
      user_id: userId,
      spend_program_id: spendProgramId,
      card_id: cardId,
      entity_id: entityId,
      merchant_id: merchantId,
      state,
      sync_status: syncStatus,
      min_amount: minAmount,
      max_amount: maxAmount,
      sk_category_id: skCategoryId ? Number(skCategoryId) : undefined,
      page_size: pageSize ? Number(pageSize) : undefined,
      start,
    });
  }

  @Get('engagement/:engagementId/bills')
  getEngagementBills(
    @Param('engagementId', ParseIntPipe) engagementId: number,
    @Query('from_due_date') fromDueDate?: string,
    @Query('to_due_date') toDueDate?: string,
    @Query('from_issued_date') fromIssuedDate?: string,
    @Query('to_issued_date') toIssuedDate?: string,
    @Query('from_created_at') fromCreatedAt?: string,
    @Query('to_created_at') toCreatedAt?: string,
    @Query('from_paid_at') fromPaidAt?: string,
    @Query('to_paid_at') toPaidAt?: string,
    @Query('vendor_id') vendorId?: string,
    @Query('entity_id') entityId?: string,
    @Query('payment_status') paymentStatus?: string,
    @Query('payment_method') paymentMethod?: string,
    @Query('approval_status') approvalStatus?: string,
    @Query('sync_status') syncStatus?: string,
    @Query('status_summaries') statusSummaries?: string,
    @Query('invoice_number') invoiceNumber?: string,
    @Query('min_amount') minAmount?: string,
    @Query('max_amount') maxAmount?: string,
    @Query('page_size') pageSize?: string,
    @Query('start') start?: string,
  ) {
    return this.rampService.getEngagementBills(engagementId, {
      from_due_date: fromDueDate,
      to_due_date: toDueDate,
      from_issued_date: fromIssuedDate,
      to_issued_date: toIssuedDate,
      from_created_at: fromCreatedAt,
      to_created_at: toCreatedAt,
      from_paid_at: fromPaidAt,
      to_paid_at: toPaidAt,
      vendor_id: vendorId,
      entity_id: entityId,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      approval_status: approvalStatus,
      sync_status: syncStatus,
      status_summaries: statusSummaries,
      invoice_number: invoiceNumber,
      min_amount: minAmount,
      max_amount: maxAmount,
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

  /** Full accounting context scoped to an engagement's Customer/Job. */
  @Get('engagement/:engagementId/accounting')
  getEngagementAccounting(
    @Param('engagementId', ParseIntPipe) engagementId: number,
  ) {
    return this.rampService.getEngagementAccountingContext(engagementId);
  }
}
