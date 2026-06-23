import { seatingChartMulterOptions, SEATING_CHART_UPLOAD_DIR } from './seating-chart-multer.config';
import { contractMulterOptions, CONTRACT_UPLOAD_DIR } from './contract-multer.config';

describe('seating-chart-multer.config', () => {
  it('should define upload directory under uploads/seating-charts', () => {
    expect(SEATING_CHART_UPLOAD_DIR).toContain('uploads');
    expect(SEATING_CHART_UPLOAD_DIR).toContain('seating-charts');
  });

  it('should return multer options with disk storage', () => {
    const options = seatingChartMulterOptions();
    expect(options).toBeDefined();
    expect(options.storage).toBeDefined();
    expect(options.limits).toEqual({ fileSize: 10 * 1024 * 1024 });
  });

  describe('fileFilter', () => {
    const options = seatingChartMulterOptions();
    const fileFilter = options.fileFilter as (
      req: unknown,
      file: { mimetype: string },
      cb: (err: Error | null, accept: boolean) => void,
    ) => void;

    it.each([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
    ])('should accept %s mimetype', (mimetype) => {
      const cb = jest.fn();
      fileFilter({}, { mimetype }, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should reject unsupported mimetype', () => {
      const cb = jest.fn();
      fileFilter({}, { mimetype: 'application/zip' }, cb);
      expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
    });

    it('should reject text/plain mimetype', () => {
      const cb = jest.fn();
      fileFilter({}, { mimetype: 'text/plain' }, cb);
      expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
    });
  });
});

describe('contract-multer.config', () => {
  it('should define upload directory under uploads/contracts', () => {
    expect(CONTRACT_UPLOAD_DIR).toContain('uploads');
    expect(CONTRACT_UPLOAD_DIR).toContain('contracts');
  });

  it('should return multer options with disk storage and 25MB limit', () => {
    const options = contractMulterOptions();
    expect(options).toBeDefined();
    expect(options.storage).toBeDefined();
    expect(options.limits).toEqual({ fileSize: 25 * 1024 * 1024 });
  });

  describe('fileFilter', () => {
    const options = contractMulterOptions();
    const fileFilter = options.fileFilter as (
      req: unknown,
      file: { mimetype: string; originalname: string },
      cb: (err: Error | null, accept: boolean) => void,
    ) => void;

    it('should accept application/pdf mimetype', () => {
      const cb = jest.fn();
      fileFilter({}, { mimetype: 'application/pdf', originalname: 'contract.pdf' }, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should accept docx mimetype', () => {
      const cb = jest.fn();
      fileFilter(
        {},
        {
          mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          originalname: 'contract.docx',
        },
        cb,
      );
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should accept .docx by extension even with generic mimetype', () => {
      const cb = jest.fn();
      fileFilter({}, { mimetype: 'application/octet-stream', originalname: 'contract.docx' }, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should accept .pdf by extension', () => {
      const cb = jest.fn();
      fileFilter({}, { mimetype: 'application/octet-stream', originalname: 'file.pdf' }, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should reject unsupported file types', () => {
      const cb = jest.fn();
      fileFilter({}, { mimetype: 'image/png', originalname: 'image.png' }, cb);
      expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
    });

    it('should reject text files', () => {
      const cb = jest.fn();
      fileFilter({}, { mimetype: 'text/plain', originalname: 'file.txt' }, cb);
      expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
    });
  });
});
