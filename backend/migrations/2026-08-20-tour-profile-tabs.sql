/*
  2026-08-20-tour-profile-tabs.sql

  Adds columns needed for the new Tour Profile tabs (Production, Ticketing,
  Booking) plus the additional Marketing tab file fields, and adds the VIP PDF
  override on Engagement.

  Every link/upload field stores its data in dbo.Link (via a nullable
  FK column on dbo.Tour / dbo.Engagement), matching the existing
  TechRiderLinkID / BannerLinkID / LogoLinkID pattern.

  Review then execute manually. Idempotent: uses IF NOT EXISTS guards so it can
  be re-run safely.
*/

SET XACT_ABORT ON;
BEGIN TRANSACTION;

/* ─────────────── dbo.Tour ─────────────── */

IF COL_LENGTH('dbo.Tour', 'DealSheetLinkID') IS NULL
    ALTER TABLE dbo.Tour ADD DealSheetLinkID int NULL;

IF COL_LENGTH('dbo.Tour', 'AgencySalesLinkID') IS NULL
    ALTER TABLE dbo.Tour ADD AgencySalesLinkID int NULL;

IF COL_LENGTH('dbo.Tour', 'MarketingManualLinkID') IS NULL
    ALTER TABLE dbo.Tour ADD MarketingManualLinkID int NULL;

IF COL_LENGTH('dbo.Tour', 'MarketingMaterialLinkID') IS NULL
    ALTER TABLE dbo.Tour ADD MarketingMaterialLinkID int NULL;

IF COL_LENGTH('dbo.Tour', 'VipPdfLinkID') IS NULL
    ALTER TABLE dbo.Tour ADD VipPdfLinkID int NULL;

IF COL_LENGTH('dbo.Tour', 'PreSalePasscode') IS NULL
    ALTER TABLE dbo.Tour ADD PreSalePasscode nvarchar(200) NULL;

IF COL_LENGTH('dbo.Tour', 'SeatHoldRequirements') IS NULL
    ALTER TABLE dbo.Tour ADD SeatHoldRequirements nvarchar(500) NULL;

/* Foreign keys to dbo.Link for the new link columns. */
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Tour_DealSheetLink')
    ALTER TABLE dbo.Tour
        ADD CONSTRAINT FK_Tour_DealSheetLink FOREIGN KEY (DealSheetLinkID) REFERENCES dbo.Link(LinkID);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Tour_AgencySalesLink')
    ALTER TABLE dbo.Tour
        ADD CONSTRAINT FK_Tour_AgencySalesLink FOREIGN KEY (AgencySalesLinkID) REFERENCES dbo.Link(LinkID);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Tour_MarketingManualLink')
    ALTER TABLE dbo.Tour
        ADD CONSTRAINT FK_Tour_MarketingManualLink FOREIGN KEY (MarketingManualLinkID) REFERENCES dbo.Link(LinkID);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Tour_MarketingMaterialLink')
    ALTER TABLE dbo.Tour
        ADD CONSTRAINT FK_Tour_MarketingMaterialLink FOREIGN KEY (MarketingMaterialLinkID) REFERENCES dbo.Link(LinkID);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Tour_VipPdfLink')
    ALTER TABLE dbo.Tour
        ADD CONSTRAINT FK_Tour_VipPdfLink FOREIGN KEY (VipPdfLinkID) REFERENCES dbo.Link(LinkID);


/* ─────────────── dbo.Engagement ─────────────── */
/* VIP PDF override — when set, takes precedence over Tour.VipPdfLinkID for
   this engagement. */

IF COL_LENGTH('dbo.Engagement', 'VipPdfLinkID') IS NULL
    ALTER TABLE dbo.Engagement ADD VipPdfLinkID int NULL;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Engagement_VipPdfLink')
    ALTER TABLE dbo.Engagement
        ADD CONSTRAINT FK_Engagement_VipPdfLink FOREIGN KEY (VipPdfLinkID) REFERENCES dbo.Link(LinkID);


COMMIT TRANSACTION;
