const { escHtml, parseHash } = require('../app.js');

describe('escHtml', () => {
  test('& karakterini dönüştürür', () => {
    expect(escHtml('a & b')).toBe('a &amp; b');
  });
  test('< ve > karakterlerini dönüştürür', () => {
    expect(escHtml('<script>')).toBe('&lt;script&gt;');
  });
  test('tırnak işaretini dönüştürür', () => {
    expect(escHtml('"test"')).toBe('&quot;test&quot;');
  });
  test('temiz metni değiştirmez', () => {
    expect(escHtml('Alışveriş yap')).toBe('Alışveriş yap');
  });
  test('XSS saldırısını engeller', () => {
    expect(escHtml('<img src=x onerror=alert(1)>')).not.toContain('<img');
  });
});

describe('parseHash', () => {
  function withHash(hash) {
    return { hash };
  }

  test('hash yoksa null döner', () => {
    expect(parseHash(withHash(''))).toBeNull();
  });

  test('access_token içeren hash\'i parse eder', () => {
    const result = parseHash(withHash('#access_token=abc123&type=signup'));
    expect(result.access_token).toBe('abc123');
    expect(result.type).toBe('signup');
  });

  test('hata parametrelerini parse eder', () => {
    const result = parseHash(withHash('#error=access_denied&error_code=otp_expired'));
    expect(result.error).toBe('access_denied');
    expect(result.error_code).toBe('otp_expired');
  });

  test('URL encode edilmiş değerleri çözer', () => {
    const result = parseHash(withHash('#error_description=Email%20link%20is%20invalid'));
    expect(result.error_description).toBe('Email link is invalid');
  });
});
