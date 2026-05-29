interface PhoneInfo {
  valid: boolean
  formatted: string
  flag: string
  country: string
}

// sorted longest prefix first to avoid false matches
const CODES: [string, string, string][] = [
  ['7',   '🇷🇺', 'Russia / Kazakhstan'],
  ['1',   '🇺🇸', 'USA / Canada'],
  ['20',  '🇪🇬', 'Egypt'],
  ['27',  '🇿🇦', 'South Africa'],
  ['30',  '🇬🇷', 'Greece'],
  ['31',  '🇳🇱', 'Netherlands'],
  ['32',  '🇧🇪', 'Belgium'],
  ['33',  '🇫🇷', 'France'],
  ['34',  '🇪🇸', 'Spain'],
  ['36',  '🇭🇺', 'Hungary'],
  ['39',  '🇮🇹', 'Italy'],
  ['40',  '🇷🇴', 'Romania'],
  ['41',  '🇨🇭', 'Switzerland'],
  ['43',  '🇦🇹', 'Austria'],
  ['44',  '🇬🇧', 'UK'],
  ['45',  '🇩🇰', 'Denmark'],
  ['46',  '🇸🇪', 'Sweden'],
  ['47',  '🇳🇴', 'Norway'],
  ['48',  '🇵🇱', 'Poland'],
  ['49',  '🇩🇪', 'Germany'],
  ['51',  '🇵🇪', 'Peru'],
  ['52',  '🇲🇽', 'Mexico'],
  ['53',  '🇨🇺', 'Cuba'],
  ['54',  '🇦🇷', 'Argentina'],
  ['55',  '🇧🇷', 'Brazil'],
  ['56',  '🇨🇱', 'Chile'],
  ['57',  '🇨🇴', 'Colombia'],
  ['58',  '🇻🇪', 'Venezuela'],
  ['60',  '🇲🇾', 'Malaysia'],
  ['61',  '🇦🇺', 'Australia'],
  ['62',  '🇮🇩', 'Indonesia'],
  ['63',  '🇵🇭', 'Philippines'],
  ['64',  '🇳🇿', 'New Zealand'],
  ['65',  '🇸🇬', 'Singapore'],
  ['66',  '🇹🇭', 'Thailand'],
  ['77',  '🇰🇿', 'Kazakhstan'],
  ['81',  '🇯🇵', 'Japan'],
  ['82',  '🇰🇷', 'South Korea'],
  ['84',  '🇻🇳', 'Vietnam'],
  ['86',  '🇨🇳', 'China'],
  ['90',  '🇹🇷', 'Turkey'],
  ['91',  '🇮🇳', 'India'],
  ['92',  '🇵🇰', 'Pakistan'],
  ['93',  '🇦🇫', 'Afghanistan'],
  ['94',  '🇱🇰', 'Sri Lanka'],
  ['95',  '🇲🇲', 'Myanmar'],
  ['98',  '🇮🇷', 'Iran'],
  ['212', '🇲🇦', 'Morocco'],
  ['213', '🇩🇿', 'Algeria'],
  ['216', '🇹🇳', 'Tunisia'],
  ['218', '🇱🇾', 'Libya'],
  ['220', '🇬🇲', 'Gambia'],
  ['234', '🇳🇬', 'Nigeria'],
  ['249', '🇸🇩', 'Sudan'],
  ['380', '🇺🇦', 'Ukraine'],
  ['381', '🇷🇸', 'Serbia'],
  ['994', '🇦🇿', 'Azerbaijan'],
  ['995', '🇬🇪', 'Georgia'],
  ['996', '🇰🇬', 'Kyrgyzstan'],
  ['998', '🇺🇿', 'Uzbekistan'],
]

// sort by code length desc so 3-digit codes are matched before 2-digit
const SORTED = [...CODES].sort((a, b) => b[0].length - a[0].length)

export function parsePhone(raw: string): PhoneInfo {
  const digits = raw.replace(/\D/g, '')

  if (!digits || digits.length < 7 || digits.length > 15) {
    return { valid: false, formatted: raw || '—', flag: '🌍', country: 'Unknown' }
  }

  for (const [code, flag, country] of SORTED) {
    if (digits.startsWith(code)) {
      return { valid: true, formatted: '+' + digits, flag, country }
    }
  }

  return { valid: true, formatted: '+' + digits, flag: '🌍', country: 'Unknown' }
}

export function formatPhone(raw: string): string {
  return parsePhone(raw).formatted
}
