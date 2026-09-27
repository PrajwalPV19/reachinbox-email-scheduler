describe('CSV & Text Leads Parser (Unit Tests)', () => {
  const parseLeads = (content: string) => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const lines = content.split(/[\r\n,;]+/).map((l) => l.trim()).filter(Boolean);
    const totalRows = lines.length;

    const matchedEmails = content.match(emailRegex) || [];
    const normalized = matchedEmails.map((e) => e.toLowerCase().trim());
    const unique = Array.from(new Set(normalized));

    return {
      totalRows,
      validEmails: unique.length,
      invalidEmails: Math.max(0, totalRows - normalized.length),
      duplicates: normalized.length - unique.length,
      emails: unique,
    };
  };

  it('correctly parses comma-separated, newline-separated and duplicate emails', () => {
    const rawInput = `
      alice@reachinbox.ai
      BOB@company.com
      alice@reachinbox.ai
      invalid-email-row
      charlie@startup.io, david@growth.com
    `;

    const result = parseLeads(rawInput);

    expect(result.validEmails).toBe(4);
    expect(result.duplicates).toBe(1);
    expect(result.emails).toContain('alice@reachinbox.ai');
    expect(result.emails).toContain('bob@company.com');
    expect(result.emails).toContain('charlie@startup.io');
    expect(result.emails).toContain('david@growth.com');
  });

  it('handles empty files gracefully', () => {
    const result = parseLeads('    \n\n  ');
    expect(result.validEmails).toBe(0);
    expect(result.totalRows).toBe(0);
  });
});
