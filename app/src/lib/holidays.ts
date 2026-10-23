// Japanese public holidays, shown on calendars when a plan uses Asia/Tokyo.
const JP: Record<string, [string, string]> = {
  '2026-01-01': ["New Year's Day", '元日'], '2026-01-12': ['Coming of Age Day', '成人の日'],
  '2026-02-11': ['Foundation Day', '建国記念の日'], '2026-02-23': ["Emperor's Birthday", '天皇誕生日'],
  '2026-03-20': ['Vernal Equinox', '春分の日'], '2026-04-29': ['Showa Day', '昭和の日'],
  '2026-05-03': ['Constitution Day', '憲法記念日'], '2026-05-04': ['Greenery Day', 'みどりの日'],
  '2026-05-05': ["Children's Day", 'こどもの日'], '2026-05-06': ['Substitute Holiday', '振替休日'],
  '2026-07-20': ['Marine Day', '海の日'], '2026-08-11': ['Mountain Day', '山の日'],
  '2026-09-21': ['Respect for the Aged Day', '敬老の日'], '2026-09-22': ['National Holiday', '国民の休日'],
  '2026-09-23': ['Autumnal Equinox', '秋分の日'], '2026-10-12': ['Sports Day', 'スポーツの日'],
  '2026-11-03': ['Culture Day', '文化の日'], '2026-11-23': ['Labor Thanksgiving Day', '勤労感謝の日'],
  '2027-01-01': ["New Year's Day", '元日'], '2027-01-11': ['Coming of Age Day', '成人の日'],
  '2027-02-11': ['Foundation Day', '建国記念の日'], '2027-02-23': ["Emperor's Birthday", '天皇誕生日'],
  '2027-03-21': ['Vernal Equinox', '春分の日'], '2027-03-22': ['Substitute Holiday', '振替休日'],
  '2027-04-29': ['Showa Day', '昭和の日'], '2027-05-03': ['Constitution Day', '憲法記念日'],
  '2027-05-04': ['Greenery Day', 'みどりの日'], '2027-05-05': ["Children's Day", 'こどもの日'],
  '2027-07-19': ['Marine Day', '海の日'], '2027-08-11': ['Mountain Day', '山の日'],
  '2027-09-20': ['Respect for the Aged Day', '敬老の日'], '2027-09-23': ['Autumnal Equinox', '秋分の日'],
  '2027-10-11': ['Sports Day', 'スポーツの日'], '2027-11-03': ['Culture Day', '文化の日'],
  '2027-11-23': ['Labor Thanksgiving Day', '勤労感謝の日'],
};

export function holiday(key: string, tz: string, lang: 'en' | 'ja'): string | null {
  if (tz !== 'Asia/Tokyo') return null;
  const h = JP[key];
  return h ? h[lang === 'ja' ? 1 : 0] : null;
}
