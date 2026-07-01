-- Make CertificationID nullable on LearningSubmission
-- Free-text submissions (not linked to a published certification) need NULL here.

-- 1. Drop the FK constraint first
IF EXISTS (
  SELECT 1 FROM sys.foreign_keys
  WHERE name = 'FK_LearningSubmission_Certification'
)
  ALTER TABLE dbo.LearningSubmission
    DROP CONSTRAINT FK_LearningSubmission_Certification;

-- 2. Alter column to allow NULLs
ALTER TABLE dbo.LearningSubmission
  ALTER COLUMN CertificationID INT NULL;

-- 3. Re-add FK constraint
ALTER TABLE dbo.LearningSubmission
  ADD CONSTRAINT FK_LearningSubmission_Certification
    FOREIGN KEY (CertificationID) REFERENCES dbo.LearningCertification(CertificationID);
