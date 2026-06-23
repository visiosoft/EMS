import type { DataSource } from 'typeorm';
import { OrganizationChartService } from './organization-chart.service';

describe('OrganizationChartService', () => {
  it('requires exactly one internal company', async () => {
    const query = jest.fn().mockResolvedValueOnce([]);
    const service = new OrganizationChartService({
      query,
    } as unknown as DataSource);

    await expect(service.getChart()).resolves.toMatchObject({
      configured: false,
      company: null,
      nodes: [],
      warnings: [expect.stringContaining('Mark one company as internal')],
    });
  });

  it('blocks the chart when legacy data has multiple internal companies', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      { companyId: 12, companyName: 'IAE' },
      { companyId: 18, companyName: 'Another Company' },
    ]);
    const service = new OrganizationChartService({
      query,
    } as unknown as DataSource);

    await expect(service.getChart()).resolves.toMatchObject({
      configured: false,
      nodes: [],
      warnings: [expect.stringContaining('More than one company')],
    });
  });

  it('derives the chart from internal contacts and their existing departments', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ companyId: 12, companyName: 'IAE' }])
      .mockResolvedValueOnce([{ hasColumn: 1 }])
      .mockResolvedValueOnce([
        {
          contactId: 100,
          departmentId: 4,
          departmentName: 'Executive & Programming',
          firstName: 'Adam',
          lastName: 'Epstein',
          email: 'adam@example.com',
          cellPhone: '',
          workPhone: '',
          jobTitle: 'CEO',
          roleName: 'Executive',
        },
        {
          contactId: 101,
          departmentId: 8,
          departmentName: 'Marketing',
          firstName: 'Nichole',
          lastName: 'Ranieri',
          email: 'nichole@example.com',
          cellPhone: '',
          workPhone: '',
          jobTitle: 'Director of Marketing',
          roleName: 'Director',
        },
        {
          contactId: 102,
          departmentId: null,
          departmentName: 'Unknown',
          firstName: 'New',
          lastName: 'Starter',
          email: 'starter@example.com',
          cellPhone: '',
          workPhone: '',
          jobTitle: '',
          roleName: 'Internal Staff',
        },
      ]);
    const service = new OrganizationChartService({
      query,
    } as unknown as DataSource);

    const result = await service.getChart();

    expect(result.configured).toBe(true);
    expect(result.company).toEqual({ companyId: 12, companyName: 'IAE' });
    expect(result.nodes[0]).toMatchObject({
      nodeId: 0,
      parentNodeId: null,
      label: 'IAE',
    });
    expect(result.nodes.slice(1).map((node) => node.label)).toEqual([
      'Executive & Programming',
      'Marketing',
      'Unassigned',
    ]);
    expect(result.nodes.flatMap((node) => node.members)).toHaveLength(3);
    expect(query.mock.calls[2][1]).toEqual([12]);
  });

  it('uses internal roles when ContactInfo.JobTitle is unavailable', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ companyId: 12, companyName: 'IAE' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const service = new OrganizationChartService({
      query,
    } as unknown as DataSource);

    const result = await service.getChart();

    expect(result.warnings).toContain(
      'ContactInfo.JobTitle is not installed, so chart titles use existing internal roles.',
    );
    expect(query.mock.calls[2][0]).toContain("COALESCE(rolePick.roleName, '')");
  });
});
