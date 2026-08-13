export interface HijriDateResult {
  day: number;
  monthIndex: number;
  monthNameEn: string;
  monthNameBn: string;
  year: number;
  formattedEn: string;
  formattedBn: string;
}

const HIJRI_MONTHS_EN = [
  'Muharram',
  'Safar',
  'Rabi al-Awwal',
  'Rabi al-Thani',
  'Jumada al-Awwal',
  'Jumada al-Thani',
  'Rajab',
  'Sha\'ban',
  'Ramadan',
  'Shawwal',
  'Dhu al-Qi\'dah',
  'Dhu al-Hijjah',
];

const HIJRI_MONTHS_BN = [
  'মহররম',
  'সফর',
  'রবিউল আউয়াল',
  'রবিউস সানি',
  'জমাদিউল আউয়াল',
  'জমাদিউস সানি',
  'রজব',
  'শা\'বান',
  'রমজান',
  'শাওয়াল',
  'জিলকদ',
  'জিলহজ্জ',
];

const BANGLA_NUMBERS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBanglaDigits(num: number | string): string {
  return num
    .toString()
    .split('')
    .map((char) => {
      const parsed = parseInt(char, 10);
      return !isNaN(parsed) ? BANGLA_NUMBERS[parsed] : char;
    })
    .join('');
}

const BANGLA_GREGORIAN_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const BANGLA_WEEKDAYS = [
  'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'
];

const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const ENGLISH_WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export function getBanglaGregorianDate(dateInput: Date | string = new Date()): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const day = d.getDate();
  const monthIdx = d.getMonth();
  const year = d.getFullYear();
  const dayOfWeekIdx = d.getDay();

  const dayBn = toBanglaDigits(day);
  const yearBn = toBanglaDigits(year);
  const monthBn = BANGLA_GREGORIAN_MONTHS[monthIdx];
  const weekdayBn = BANGLA_WEEKDAYS[dayOfWeekIdx];

  return `${dayBn} ${monthBn} ${yearBn}, ${weekdayBn}`;
}

export function getEnglishDateFormatted(dateInput: Date | string = new Date()): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const day = d.getDate();
  const monthIdx = d.getMonth();
  const year = d.getFullYear();
  const dayOfWeekIdx = d.getDay();

  const monthEn = ENGLISH_MONTHS[monthIdx];
  const weekdayEn = ENGLISH_WEEKDAYS[dayOfWeekIdx];

  return `${weekdayEn}, ${day} ${monthEn} ${year}`;
}

export interface ThreeDatesResult {
  englishDate: string;
  banglaGregorianDate: string;
  banglaHijriDate: string;
}

export function getThreeFormattedDates(
  dateInput: Date | string = new Date(),
  hijriOffset: number = 0
): ThreeDatesResult {
  const hijri = getHijriDate(dateInput, hijriOffset);
  return {
    englishDate: getEnglishDateFormatted(dateInput),
    banglaGregorianDate: getBanglaGregorianDate(dateInput),
    banglaHijriDate: hijri.formattedBn, // Always Bengali as requested
  };
}

export function getHijriDate(dateInput: Date | string, dayOffset: number = 0): HijriDateResult {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  // Calculate Julian Day Number
  let day = d.getDate() + dayOffset;
  let month = d.getMonth(); // 0-indexed
  let year = d.getFullYear();

  if (month < 2) {
    year -= 1;
    month += 12;
  }

  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);

  const jdn = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;

  // Converts JDN to Tabular Islamic Calendar
  const l = jdn - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l1 = l - 10631 * n + 354;
  const j = Math.floor((10985 - l1) / 5316) * Math.floor((50 * l1) / 17719) + Math.floor(l1 / 5670) * Math.floor((43 * l1) / 15238);
  const l2 = l1 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;

  const hMonth = Math.floor((24 * l2) / 709);
  const hDay = Math.floor(l2 - Math.floor((709 * hMonth) / 24));
  const hYear = Math.floor(30 * n + j - 30);

  const monthIdx = Math.max(0, Math.min(11, hMonth - 1));

  const monthNameEn = HIJRI_MONTHS_EN[monthIdx];
  const monthNameBn = HIJRI_MONTHS_BN[monthIdx];

  const dayBn = toBanglaDigits(hDay);
  const yearBn = toBanglaDigits(hYear);

  return {
    day: hDay,
    monthIndex: monthIdx,
    monthNameEn,
    monthNameBn,
    year: hYear,
    formattedEn: `${hDay} ${monthNameEn} ${hYear} AH`,
    formattedBn: `${dayBn} ${monthNameBn} ${yearBn} হিজরী`,
  };
}
