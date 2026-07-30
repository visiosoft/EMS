"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RampController = void 0;
const common_1 = require("@nestjs/common");
const ramp_service_1 = require("./ramp.service");
let RampController = class RampController {
    rampService;
    constructor(rampService) {
        this.rampService = rampService;
    }
    getStatus() {
        return { configured: this.rampService.isConfigured() };
    }
    listTransactions(fromDate, toDate, departmentId, userId, spendProgramId, accountingFieldSelectionId, cardId, entityId, merchantId, limitId, locationId, tripId, statementId, state, syncStatus, approvalStatus, minAmount, maxAmount, skCategoryId, orderByDateDesc, orderByDateAsc, orderByAmountDesc, orderByAmountAsc, hasNoSyncCommits, hasStatement, hasBeenApproved, allRequirementsMet, requiresMemo, includeMerchantData, syncedAfter, awaitingApprovalByUserId, pageSize, start) {
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
            limit_id: limitId,
            location_id: locationId,
            trip_id: tripId,
            statement_id: statementId,
            state,
            sync_status: syncStatus,
            approval_status: approvalStatus,
            min_amount: minAmount,
            max_amount: maxAmount,
            sk_category_id: skCategoryId ? Number(skCategoryId) : undefined,
            order_by_date_desc: orderByDateDesc === 'true' ? true : undefined,
            order_by_date_asc: orderByDateAsc === 'true' ? true : undefined,
            order_by_amount_desc: orderByAmountDesc === 'true' ? true : undefined,
            order_by_amount_asc: orderByAmountAsc === 'true' ? true : undefined,
            has_no_sync_commits: hasNoSyncCommits === 'true' ? true : undefined,
            has_statement: hasStatement !== undefined ? hasStatement === 'true' : undefined,
            has_been_approved: hasBeenApproved !== undefined ? hasBeenApproved === 'true' : undefined,
            all_requirements_met_and_approved: allRequirementsMet !== undefined ? allRequirementsMet === 'true' : undefined,
            requires_memo: requiresMemo === 'true' ? true : undefined,
            include_merchant_data: includeMerchantData === 'true' ? true : undefined,
            synced_after: syncedAfter,
            awaiting_approval_by_user_id: awaitingApprovalByUserId,
            page_size: pageSize ? Number(pageSize) : undefined,
            start,
        });
    }
    listBills(fromDueDate, toDueDate, fromIssuedDate, toIssuedDate, fromCreatedAt, toCreatedAt, fromPaidAt, toPaidAt, fromPaymentDate, toPaymentDate, vendorId, entityId, paymentStatus, paymentMethod, approvalStatus, syncStatus, statusSummaries, accountingFieldSelectionId, invoiceNumber, remoteId, draftBillId, isArchived, minAmount, maxAmount, syncReady, pageSize, start) {
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
    listDepartments(pageSize, start) {
        return this.rampService.listDepartments({
            page_size: pageSize ? Number(pageSize) : undefined,
            start,
        });
    }
    listUsers(departmentId, email, employeeId, entityId, locationId, role, status, pageSize, start) {
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
    listVendors(name, isActive, merchantId, externalVendorId, vendorOwnerId, fromCreatedAt, toCreatedAt, fromUpdatedAt, toUpdatedAt, includeDraft, includeSubsidiary, pageSize, start) {
        return this.rampService.listVendors({
            name,
            is_active: isActive !== undefined ? isActive === 'true' : undefined,
            merchant_id: merchantId,
            external_vendor_id: externalVendorId,
            vendor_owner_id: vendorOwnerId,
            from_created_at: fromCreatedAt,
            to_created_at: toCreatedAt,
            from_updated_at: fromUpdatedAt,
            to_updated_at: toUpdatedAt,
            include_draft: includeDraft === 'true' ? true : undefined,
            include_subsidiary: includeSubsidiary === 'true' ? true : undefined,
            page_size: pageSize ? Number(pageSize) : undefined,
            start,
        });
    }
    listReceipts(transactionId, reimbursementId, fromDate, toDate, createdAfter, createdBefore, includeOcrData, pageSize, start) {
        return this.rampService.listReceipts({
            transaction_id: transactionId,
            reimbursement_id: reimbursementId,
            from_date: fromDate,
            to_date: toDate,
            created_after: createdAfter,
            created_before: createdBefore,
            include_ocr_data: includeOcrData === 'true' ? true : undefined,
            page_size: pageSize ? Number(pageSize) : undefined,
            start,
        });
    }
    listSpendPrograms(pageSize, start) {
        return this.rampService.listSpendPrograms({
            page_size: pageSize ? Number(pageSize) : undefined,
            start,
        });
    }
    listMemos(userId, departmentId, cardId, locationId, managerId, merchantId, fromDate, toDate, pageSize, start) {
        return this.rampService.listMemos({
            user_id: userId,
            department_id: departmentId,
            card_id: cardId,
            location_id: locationId,
            manager_id: managerId,
            merchant_id: merchantId,
            from_date: fromDate,
            to_date: toDate,
            page_size: pageSize ? Number(pageSize) : undefined,
            start,
        });
    }
    listAccountingConnections() {
        return this.rampService.listAccountingConnections();
    }
    listGlAccounts(accountingConnectionId, isActive, code, remoteId, pageSize, start) {
        return this.rampService.listGlAccounts({
            accounting_connection_id: accountingConnectionId,
            is_active: isActive !== undefined ? isActive === 'true' : undefined,
            code,
            remote_id: remoteId,
            page_size: pageSize ? Number(pageSize) : undefined,
            start,
        });
    }
    listAccountingFields(accountingConnectionId, isActive, remoteId, pageSize, start) {
        return this.rampService.listAccountingFields({
            accounting_connection_id: accountingConnectionId,
            is_active: isActive !== undefined ? isActive === 'true' : undefined,
            remote_id: remoteId,
            page_size: pageSize ? Number(pageSize) : undefined,
            start,
        });
    }
    listAccountingFieldOptions(fieldId, accountingConnectionId, isActive, code, remoteId, visibility, pageSize, start) {
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
    listAccountingVendors(accountingConnectionId, isActive, isSynced, code, remoteId, pageSize, start) {
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
    getCustomerJobFieldOptions() {
        return this.rampService.getCustomerJobFieldOptions();
    }
    listAccounting(pageSize, start) {
        return this.rampService.listAccounting({
            page_size: pageSize ? Number(pageSize) : undefined,
            start,
        });
    }
    getEngagementMapping(engagementId) {
        return this.rampService.resolveEngagementRampIds(engagementId);
    }
    getEngagementTransactions(engagementId, fromDate, toDate, departmentId, userId, spendProgramId, cardId, entityId, merchantId, state, syncStatus, minAmount, maxAmount, skCategoryId, pageSize, start) {
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
    getEngagementBills(engagementId, fromDueDate, toDueDate, fromIssuedDate, toIssuedDate, fromCreatedAt, toCreatedAt, fromPaidAt, toPaidAt, vendorId, entityId, paymentStatus, paymentMethod, approvalStatus, syncStatus, statusSummaries, invoiceNumber, minAmount, maxAmount, pageSize, start) {
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
    getEngagementReceipts(engagementId, fromDate, toDate, pageSize, start) {
        return this.rampService.getEngagementReceipts(engagementId, {
            from_date: fromDate,
            to_date: toDate,
            page_size: pageSize ? Number(pageSize) : undefined,
            start,
        });
    }
    getEngagementVendors(engagementId, name, isActive, pageSize, start) {
        return this.rampService.getEngagementVendors(engagementId, {
            name,
            is_active: isActive !== undefined ? isActive === 'true' : undefined,
            page_size: pageSize ? Number(pageSize) : undefined,
            start,
        });
    }
    getEngagementAccounting(engagementId) {
        return this.rampService.getEngagementAccountingContext(engagementId);
    }
};
exports.RampController = RampController;
__decorate([
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RampController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('transactions'),
    __param(0, (0, common_1.Query)('from_date')),
    __param(1, (0, common_1.Query)('to_date')),
    __param(2, (0, common_1.Query)('department_id')),
    __param(3, (0, common_1.Query)('user_id')),
    __param(4, (0, common_1.Query)('spend_program_id')),
    __param(5, (0, common_1.Query)('accounting_field_selection_id')),
    __param(6, (0, common_1.Query)('card_id')),
    __param(7, (0, common_1.Query)('entity_id')),
    __param(8, (0, common_1.Query)('merchant_id')),
    __param(9, (0, common_1.Query)('limit_id')),
    __param(10, (0, common_1.Query)('location_id')),
    __param(11, (0, common_1.Query)('trip_id')),
    __param(12, (0, common_1.Query)('statement_id')),
    __param(13, (0, common_1.Query)('state')),
    __param(14, (0, common_1.Query)('sync_status')),
    __param(15, (0, common_1.Query)('approval_status')),
    __param(16, (0, common_1.Query)('min_amount')),
    __param(17, (0, common_1.Query)('max_amount')),
    __param(18, (0, common_1.Query)('sk_category_id')),
    __param(19, (0, common_1.Query)('order_by_date_desc')),
    __param(20, (0, common_1.Query)('order_by_date_asc')),
    __param(21, (0, common_1.Query)('order_by_amount_desc')),
    __param(22, (0, common_1.Query)('order_by_amount_asc')),
    __param(23, (0, common_1.Query)('has_no_sync_commits')),
    __param(24, (0, common_1.Query)('has_statement')),
    __param(25, (0, common_1.Query)('has_been_approved')),
    __param(26, (0, common_1.Query)('all_requirements_met_and_approved')),
    __param(27, (0, common_1.Query)('requires_memo')),
    __param(28, (0, common_1.Query)('include_merchant_data')),
    __param(29, (0, common_1.Query)('synced_after')),
    __param(30, (0, common_1.Query)('awaiting_approval_by_user_id')),
    __param(31, (0, common_1.Query)('page_size')),
    __param(32, (0, common_1.Query)('start')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], RampController.prototype, "listTransactions", null);
__decorate([
    (0, common_1.Get)('bills'),
    __param(0, (0, common_1.Query)('from_due_date')),
    __param(1, (0, common_1.Query)('to_due_date')),
    __param(2, (0, common_1.Query)('from_issued_date')),
    __param(3, (0, common_1.Query)('to_issued_date')),
    __param(4, (0, common_1.Query)('from_created_at')),
    __param(5, (0, common_1.Query)('to_created_at')),
    __param(6, (0, common_1.Query)('from_paid_at')),
    __param(7, (0, common_1.Query)('to_paid_at')),
    __param(8, (0, common_1.Query)('from_payment_date')),
    __param(9, (0, common_1.Query)('to_payment_date')),
    __param(10, (0, common_1.Query)('vendor_id')),
    __param(11, (0, common_1.Query)('entity_id')),
    __param(12, (0, common_1.Query)('payment_status')),
    __param(13, (0, common_1.Query)('payment_method')),
    __param(14, (0, common_1.Query)('approval_status')),
    __param(15, (0, common_1.Query)('sync_status')),
    __param(16, (0, common_1.Query)('status_summaries')),
    __param(17, (0, common_1.Query)('accounting_field_selection_id')),
    __param(18, (0, common_1.Query)('invoice_number')),
    __param(19, (0, common_1.Query)('remote_id')),
    __param(20, (0, common_1.Query)('draft_bill_id')),
    __param(21, (0, common_1.Query)('is_archived')),
    __param(22, (0, common_1.Query)('min_amount')),
    __param(23, (0, common_1.Query)('max_amount')),
    __param(24, (0, common_1.Query)('sync_ready')),
    __param(25, (0, common_1.Query)('page_size')),
    __param(26, (0, common_1.Query)('start')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], RampController.prototype, "listBills", null);
__decorate([
    (0, common_1.Get)('departments'),
    __param(0, (0, common_1.Query)('page_size')),
    __param(1, (0, common_1.Query)('start')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], RampController.prototype, "listDepartments", null);
__decorate([
    (0, common_1.Get)('users'),
    __param(0, (0, common_1.Query)('department_id')),
    __param(1, (0, common_1.Query)('email')),
    __param(2, (0, common_1.Query)('employee_id')),
    __param(3, (0, common_1.Query)('entity_id')),
    __param(4, (0, common_1.Query)('location_id')),
    __param(5, (0, common_1.Query)('role')),
    __param(6, (0, common_1.Query)('status')),
    __param(7, (0, common_1.Query)('page_size')),
    __param(8, (0, common_1.Query)('start')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], RampController.prototype, "listUsers", null);
__decorate([
    (0, common_1.Get)('vendors'),
    __param(0, (0, common_1.Query)('name')),
    __param(1, (0, common_1.Query)('is_active')),
    __param(2, (0, common_1.Query)('merchant_id')),
    __param(3, (0, common_1.Query)('external_vendor_id')),
    __param(4, (0, common_1.Query)('vendor_owner_id')),
    __param(5, (0, common_1.Query)('from_created_at')),
    __param(6, (0, common_1.Query)('to_created_at')),
    __param(7, (0, common_1.Query)('from_updated_at')),
    __param(8, (0, common_1.Query)('to_updated_at')),
    __param(9, (0, common_1.Query)('include_draft')),
    __param(10, (0, common_1.Query)('include_subsidiary')),
    __param(11, (0, common_1.Query)('page_size')),
    __param(12, (0, common_1.Query)('start')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], RampController.prototype, "listVendors", null);
__decorate([
    (0, common_1.Get)('receipts'),
    __param(0, (0, common_1.Query)('transaction_id')),
    __param(1, (0, common_1.Query)('reimbursement_id')),
    __param(2, (0, common_1.Query)('from_date')),
    __param(3, (0, common_1.Query)('to_date')),
    __param(4, (0, common_1.Query)('created_after')),
    __param(5, (0, common_1.Query)('created_before')),
    __param(6, (0, common_1.Query)('include_ocr_data')),
    __param(7, (0, common_1.Query)('page_size')),
    __param(8, (0, common_1.Query)('start')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], RampController.prototype, "listReceipts", null);
__decorate([
    (0, common_1.Get)('spend-programs'),
    __param(0, (0, common_1.Query)('page_size')),
    __param(1, (0, common_1.Query)('start')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], RampController.prototype, "listSpendPrograms", null);
__decorate([
    (0, common_1.Get)('memos'),
    __param(0, (0, common_1.Query)('user_id')),
    __param(1, (0, common_1.Query)('department_id')),
    __param(2, (0, common_1.Query)('card_id')),
    __param(3, (0, common_1.Query)('location_id')),
    __param(4, (0, common_1.Query)('manager_id')),
    __param(5, (0, common_1.Query)('merchant_id')),
    __param(6, (0, common_1.Query)('from_date')),
    __param(7, (0, common_1.Query)('to_date')),
    __param(8, (0, common_1.Query)('page_size')),
    __param(9, (0, common_1.Query)('start')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], RampController.prototype, "listMemos", null);
__decorate([
    (0, common_1.Get)('accounting/connections'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RampController.prototype, "listAccountingConnections", null);
__decorate([
    (0, common_1.Get)('accounting/gl-accounts'),
    __param(0, (0, common_1.Query)('accounting_connection_id')),
    __param(1, (0, common_1.Query)('is_active')),
    __param(2, (0, common_1.Query)('code')),
    __param(3, (0, common_1.Query)('remote_id')),
    __param(4, (0, common_1.Query)('page_size')),
    __param(5, (0, common_1.Query)('start')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], RampController.prototype, "listGlAccounts", null);
__decorate([
    (0, common_1.Get)('accounting/fields'),
    __param(0, (0, common_1.Query)('accounting_connection_id')),
    __param(1, (0, common_1.Query)('is_active')),
    __param(2, (0, common_1.Query)('remote_id')),
    __param(3, (0, common_1.Query)('page_size')),
    __param(4, (0, common_1.Query)('start')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], RampController.prototype, "listAccountingFields", null);
__decorate([
    (0, common_1.Get)('accounting/field-options'),
    __param(0, (0, common_1.Query)('field_id')),
    __param(1, (0, common_1.Query)('accounting_connection_id')),
    __param(2, (0, common_1.Query)('is_active')),
    __param(3, (0, common_1.Query)('code')),
    __param(4, (0, common_1.Query)('remote_id')),
    __param(5, (0, common_1.Query)('visibility')),
    __param(6, (0, common_1.Query)('page_size')),
    __param(7, (0, common_1.Query)('start')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], RampController.prototype, "listAccountingFieldOptions", null);
__decorate([
    (0, common_1.Get)('accounting/vendors'),
    __param(0, (0, common_1.Query)('accounting_connection_id')),
    __param(1, (0, common_1.Query)('is_active')),
    __param(2, (0, common_1.Query)('is_synced')),
    __param(3, (0, common_1.Query)('code')),
    __param(4, (0, common_1.Query)('remote_id')),
    __param(5, (0, common_1.Query)('page_size')),
    __param(6, (0, common_1.Query)('start')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], RampController.prototype, "listAccountingVendors", null);
__decorate([
    (0, common_1.Get)('accounting/customer-job'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RampController.prototype, "getCustomerJobFieldOptions", null);
__decorate([
    (0, common_1.Get)('accounting'),
    __param(0, (0, common_1.Query)('page_size')),
    __param(1, (0, common_1.Query)('start')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], RampController.prototype, "listAccounting", null);
__decorate([
    (0, common_1.Get)('engagement/:engagementId/mapping'),
    __param(0, (0, common_1.Param)('engagementId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], RampController.prototype, "getEngagementMapping", null);
__decorate([
    (0, common_1.Get)('engagement/:engagementId/transactions'),
    __param(0, (0, common_1.Param)('engagementId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('from_date')),
    __param(2, (0, common_1.Query)('to_date')),
    __param(3, (0, common_1.Query)('department_id')),
    __param(4, (0, common_1.Query)('user_id')),
    __param(5, (0, common_1.Query)('spend_program_id')),
    __param(6, (0, common_1.Query)('card_id')),
    __param(7, (0, common_1.Query)('entity_id')),
    __param(8, (0, common_1.Query)('merchant_id')),
    __param(9, (0, common_1.Query)('state')),
    __param(10, (0, common_1.Query)('sync_status')),
    __param(11, (0, common_1.Query)('min_amount')),
    __param(12, (0, common_1.Query)('max_amount')),
    __param(13, (0, common_1.Query)('sk_category_id')),
    __param(14, (0, common_1.Query)('page_size')),
    __param(15, (0, common_1.Query)('start')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], RampController.prototype, "getEngagementTransactions", null);
__decorate([
    (0, common_1.Get)('engagement/:engagementId/bills'),
    __param(0, (0, common_1.Param)('engagementId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('from_due_date')),
    __param(2, (0, common_1.Query)('to_due_date')),
    __param(3, (0, common_1.Query)('from_issued_date')),
    __param(4, (0, common_1.Query)('to_issued_date')),
    __param(5, (0, common_1.Query)('from_created_at')),
    __param(6, (0, common_1.Query)('to_created_at')),
    __param(7, (0, common_1.Query)('from_paid_at')),
    __param(8, (0, common_1.Query)('to_paid_at')),
    __param(9, (0, common_1.Query)('vendor_id')),
    __param(10, (0, common_1.Query)('entity_id')),
    __param(11, (0, common_1.Query)('payment_status')),
    __param(12, (0, common_1.Query)('payment_method')),
    __param(13, (0, common_1.Query)('approval_status')),
    __param(14, (0, common_1.Query)('sync_status')),
    __param(15, (0, common_1.Query)('status_summaries')),
    __param(16, (0, common_1.Query)('invoice_number')),
    __param(17, (0, common_1.Query)('min_amount')),
    __param(18, (0, common_1.Query)('max_amount')),
    __param(19, (0, common_1.Query)('page_size')),
    __param(20, (0, common_1.Query)('start')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], RampController.prototype, "getEngagementBills", null);
__decorate([
    (0, common_1.Get)('engagement/:engagementId/receipts'),
    __param(0, (0, common_1.Param)('engagementId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('from_date')),
    __param(2, (0, common_1.Query)('to_date')),
    __param(3, (0, common_1.Query)('page_size')),
    __param(4, (0, common_1.Query)('start')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String, String, String]),
    __metadata("design:returntype", void 0)
], RampController.prototype, "getEngagementReceipts", null);
__decorate([
    (0, common_1.Get)('engagement/:engagementId/vendors'),
    __param(0, (0, common_1.Param)('engagementId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('name')),
    __param(2, (0, common_1.Query)('is_active')),
    __param(3, (0, common_1.Query)('page_size')),
    __param(4, (0, common_1.Query)('start')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String, String, String]),
    __metadata("design:returntype", void 0)
], RampController.prototype, "getEngagementVendors", null);
__decorate([
    (0, common_1.Get)('engagement/:engagementId/accounting'),
    __param(0, (0, common_1.Param)('engagementId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], RampController.prototype, "getEngagementAccounting", null);
exports.RampController = RampController = __decorate([
    (0, common_1.Controller)('ramp'),
    __metadata("design:paramtypes", [ramp_service_1.RampService])
], RampController);
//# sourceMappingURL=ramp.controller.js.map