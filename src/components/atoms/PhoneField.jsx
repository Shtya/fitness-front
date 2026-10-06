'use client';

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Phone as PhoneIcon, AlertCircle, ChevronDown, Search } from 'lucide-react';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { readGmTokens } from '@/utils/gmTokens';

// Extended metadata per country code
const COUNTRY_META = {
	'+20': {
		iso2: 'EG',
		example: '10 1234 5678',
		min: 10,
		max: 10,
		stripLeadingZero: true,
		allowedStarts: ['10', '11', '12', '15'],
	},
	'+966': {
		iso2: 'SA',
		example: '5 1234 5678',
		min: 9,
		max: 9,
		stripLeadingZero: true,
		allowedStarts: ['5'],
	},
	'+971': {
		iso2: 'AE',
		example: '50 123 4567',
		min: 9,
		max: 9,
		stripLeadingZero: true,
		allowedStarts: ['50', '52', '54', '55', '56'],
	},
	'+962': {
		iso2: 'JO',
		example: '7 9012 3456',
		min: 9,
		max: 9,
		stripLeadingZero: true,
		allowedStarts: ['7'],
	},
	'+964': {
		iso2: 'IQ',
		example: '7 8012 3456',
		min: 10,
		max: 10,
		stripLeadingZero: true,
		allowedStarts: ['7'],
	},
	'+965': {
		iso2: 'KW',
		example: '5000 0000',
		min: 8,
		max: 8,
		stripLeadingZero: false,
		allowedStarts: [],
	},
	'+974': {
		iso2: 'QA',
		example: '3 123 4567',
		min: 8,
		max: 8,
		stripLeadingZero: false,
		allowedStarts: ['3', '5', '6', '7'],
	},
	'+968': {
		iso2: 'OM',
		example: '9 123 4567',
		min: 8,
		max: 8,
		stripLeadingZero: false,
		allowedStarts: ['9'],
	},
	'+1': {
		iso2: 'US',
		example: '555 123 4567',
		min: 10,
		max: 10,
		stripLeadingZero: false,
		allowedStarts: [],
	},
	'+44': {
		iso2: 'GB',
		example: '7123 456789',
		min: 9,
		max: 10,
		stripLeadingZero: true,
		allowedStarts: ['7'],
	},
};

function validateByCountry(countryCode, number, required) {
	const meta = COUNTRY_META[countryCode] || {};
	const digitsOnly = (number || '').replace(/\D/g, '');

	if (!digitsOnly) {
		if (required) {
			return { valid: false, message: 'errors.phoneRequired' };
		}
		return { valid: true, message: '' };
	}

	const countryDigits = countryCode.replace('+', '');
	if (digitsOnly.startsWith(countryDigits)) {
		return { valid: false, message: 'errors.phoneDuplicateCountryCode' };
	}

	if (meta.stripLeadingZero && digitsOnly.startsWith('0')) {
		return { valid: false, message: 'errors.phoneLeadingZero' };
	}

	if (meta.allowedStarts && meta.allowedStarts.length > 0) {
		const okPrefix = meta.allowedStarts.some(prefix => digitsOnly.startsWith(prefix));
		if (!okPrefix) {
			return { valid: false, message: 'errors.phoneStartInvalid' };
		}
	}

	if (meta.min && digitsOnly.length < meta.min) {
		return { valid: false, message: 'errors.phoneTooShort' };
	}

	if (meta.max && digitsOnly.length > meta.max) {
		return { valid: false, message: 'errors.phoneTooLong' };
	}

	try {
		const phoneNumber = parsePhoneNumberFromString(countryCode + digitsOnly);
		if (!phoneNumber || !phoneNumber.isValid()) {
			return { valid: false, message: 'errors.phoneInvalid' };
		}
	} catch (e) {
		return { valid: false, message: 'errors.phoneInvalid' };
	}

	return { valid: true, message: '' };
}

export default function PhoneField({
	label,
	value,
	onChange,
	error,
	required,
	name,
	setError,
	clearErrors,
	t,
	disabled = false,
	clearable = true,
	className = ''
}) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [focused, setFocused] = useState(false);
	const btnRef = useRef(null);
	const menuRef = useRef(null);
	const [pos, setPos] = useState({ top: 0, left: 0, width: 280 });
	const [tokens, setTokens] = useState({});
	const raw = String(value || '').trim();

	const { countryCode, number } = useMemo(() => {
		if (!raw) return { countryCode: '+20', number: '' };

		if (raw.startsWith('+')) {
			const match = raw.match(/^(\+\d{1,4})\s*(.*)$/);
			return {
				countryCode: (match && match[1]) || '+20',
				number: (match && match[2])?.trim() || '',
			};
		}

		return { countryCode: '+20', number: raw };
	}, [raw]);


	const countries = useMemo(
		() => [
			{ id: '+93', label: '🇦🇫 +93' },   // Afghanistan
			{ id: '+355', label: '🇦🇱 +355' }, // Albania
			{ id: '+213', label: '🇩🇿 +213' }, // Algeria
			{ id: '+1-684', label: '🇦🇸 +1-684' }, // American Samoa
			{ id: '+376', label: '🇦🇩 +376' }, // Andorra
			{ id: '+244', label: '🇦🇴 +244' }, // Angola
			{ id: '+1-264', label: '🇦🇮 +1-264' }, // Anguilla
			{ id: '+1-268', label: '🇦🇬 +1-268' }, // Antigua and Barbuda
			{ id: '+54', label: '🇦🇷 +54' },   // Argentina
			{ id: '+374', label: '🇦🇲 +374' }, // Armenia
			{ id: '+297', label: '🇦🇼 +297' }, // Aruba
			{ id: '+61', label: '🇦🇺 +61' },   // Australia
			{ id: '+43', label: '🇦🇹 +43' },   // Austria
			{ id: '+994', label: '🇦🇿 +994' }, // Azerbaijan
			{ id: '+1-242', label: '🇧🇸 +1-242' }, // Bahamas
			{ id: '+973', label: '🇧🇭 +973' }, // Bahrain
			{ id: '+880', label: '🇧🇩 +880' }, // Bangladesh
			{ id: '+1-246', label: '🇧🇧 +1-246' }, // Barbados
			{ id: '+375', label: '🇧🇾 +375' }, // Belarus
			{ id: '+32', label: '🇧🇪 +32' },   // Belgium
			{ id: '+501', label: '🇧🇿 +501' }, // Belize
			{ id: '+229', label: '🇧🇯 +229' }, // Benin
			{ id: '+1-441', label: '🇧🇲 +1-441' }, // Bermuda
			{ id: '+975', label: '🇧🇹 +975' }, // Bhutan
			{ id: '+591', label: '🇧🇴 +591' }, // Bolivia
			{ id: '+387', label: '🇧🇦 +387' }, // Bosnia and Herzegovina
			{ id: '+267', label: '🇧🇼 +267' }, // Botswana
			{ id: '+55', label: '🇧🇷 +55' },   // Brazil
			{ id: '+246', label: '🇮🇴 +246' }, // British Indian Ocean Territory
			{ id: '+1-284', label: '🇻🇬 +1-284' }, // British Virgin Islands
			{ id: '+673', label: '🇧🇳 +673' }, // Brunei
			{ id: '+359', label: '🇧🇬 +359' }, // Bulgaria
			{ id: '+226', label: '🇧🇫 +226' }, // Burkina Faso
			{ id: '+257', label: '🇧🇮 +257' }, // Burundi
			{ id: '+855', label: '🇰🇭 +855' }, // Cambodia
			{ id: '+237', label: '🇨🇲 +237' }, // Cameroon
			{ id: '+1', label: '🇺🇸 +1' },     // USA / Canada shared base code
			{ id: '+238', label: '🇨🇻 +238' }, // Cape Verde
			{ id: '+1-345', label: '🇰🇾 +1-345' }, // Cayman Islands
			{ id: '+236', label: '🇨🇫 +236' }, // Central African Republic
			{ id: '+235', label: '🇹🇩 +235' }, // Chad
			{ id: '+56', label: '🇨🇱 +56' },   // Chile
			{ id: '+86', label: '🇨🇳 +86' },   // China
			{ id: '+57', label: '🇨🇴 +57' },   // Colombia
			{ id: '+269', label: '🇰🇲 +269' }, // Comoros
			{ id: '+682', label: '🇨🇰 +682' }, // Cook Islands
			{ id: '+506', label: '🇨🇷 +506' }, // Costa Rica
			{ id: '+385', label: '🇭🇷 +385' }, // Croatia
			{ id: '+53', label: '🇨🇺 +53' },   // Cuba
			{ id: '+357', label: '🇨🇾 +357' }, // Cyprus
			{ id: '+420', label: '🇨🇿 +420' }, // Czech Republic
			{ id: '+243', label: '🇨🇩 +243' }, // DR Congo
			{ id: '+45', label: '🇩🇰 +45' },   // Denmark
			{ id: '+253', label: '🇩🇯 +253' }, // Djibouti
			{ id: '+1-767', label: '🇩🇲 +1-767' }, // Dominica
			{ id: '+1-809', label: '🇩🇴 +1-809' }, // Dominican Republic
			{ id: '+593', label: '🇪🇨 +593' }, // Ecuador
			{ id: '+20', label: '🇪🇬 +20' },   // Egypt
			{ id: '+503', label: '🇸🇻 +503' }, // El Salvador
			{ id: '+240', label: '🇬🇶 +240' }, // Equatorial Guinea
			{ id: '+291', label: '🇪🇷 +291' }, // Eritrea
			{ id: '+372', label: '🇪🇪 +372' }, // Estonia
			{ id: '+251', label: '🇪🇹 +251' }, // Ethiopia
			{ id: '+500', label: '🇫🇰 +500' }, // Falkland Islands
			{ id: '+298', label: '🇫🇴 +298' }, // Faroe Islands
			{ id: '+679', label: '🇫🇯 +679' }, // Fiji
			{ id: '+358', label: '🇫🇮 +358' }, // Finland
			{ id: '+33', label: '🇫🇷 +33' },   // France
			{ id: '+594', label: '🇬🇫 +594' }, // French Guiana
			{ id: '+689', label: '🇵🇫 +689' }, // French Polynesia
			{ id: '+241', label: '🇬🇦 +241' }, // Gabon
			{ id: '+220', label: '🇬🇲 +220' }, // Gambia
			{ id: '+995', label: '🇬🇪 +995' }, // Georgia
			{ id: '+49', label: '🇩🇪 +49' },   // Germany
			{ id: '+233', label: '🇬🇭 +233' }, // Ghana
			{ id: '+350', label: '🇬🇮 +350' }, // Gibraltar
			{ id: '+30', label: '🇬🇷 +30' },   // Greece
			{ id: '+299', label: '🇬🇱 +299' }, // Greenland
			{ id: '+1-473', label: '🇬🇩 +1-473' }, // Grenada
			{ id: '+590', label: '🇬🇵 +590' }, // Guadeloupe
			{ id: '+1-671', label: '🇬🇺 +1-671' }, // Guam
			{ id: '+502', label: '🇬🇹 +502' }, // Guatemala
			{ id: '+44-1481', label: '🇬🇬 +44-1481' }, // Guernsey
			{ id: '+224', label: '🇬🇳 +224' }, // Guinea
			{ id: '+245', label: '🇬🇼 +245' }, // Guinea-Bissau
			{ id: '+592', label: '🇬🇾 +592' }, // Guyana
			{ id: '+509', label: '🇭🇹 +509' }, // Haiti
			{ id: '+504', label: '🇭🇳 +504' }, // Honduras
			{ id: '+852', label: '🇭🇰 +852' }, // Hong Kong
			{ id: '+36', label: '🇭🇺 +36' },   // Hungary
			{ id: '+354', label: '🇮🇸 +354' }, // Iceland
			{ id: '+91', label: '🇮🇳 +91' },   // India
			{ id: '+62', label: '🇮🇩 +62' },   // Indonesia
			{ id: '+98', label: '🇮🇷 +98' },   // Iran
			{ id: '+964', label: '🇮🇶 +964' }, // Iraq
			{ id: '+353', label: '🇮🇪 +353' }, // Ireland
			{ id: '+44-1624', label: '🇮🇲 +44-1624' }, // Isle of Man
			{ id: '+972', label: '🇮🇱 +972' }, // Israel
			{ id: '+39', label: '🇮🇹 +39' },   // Italy
			{ id: '+225', label: '🇨🇮 +225' }, // Ivory Coast
			{ id: '+1-876', label: '🇯🇲 +1-876' }, // Jamaica
			{ id: '+81', label: '🇯🇵 +81' },   // Japan
			{ id: '+44-1534', label: '🇯🇪 +44-1534' }, // Jersey
			{ id: '+962', label: '🇯🇴 +962' }, // Jordan
			{ id: '+7', label: '🇰🇿 +7' },     // Kazakhstan
			{ id: '+254', label: '🇰🇪 +254' }, // Kenya
			{ id: '+686', label: '🇰🇮 +686' }, // Kiribati
			{ id: '+965', label: '🇰🇼 +965' }, // Kuwait
			{ id: '+996', label: '🇰🇬 +996' }, // Kyrgyzstan
			{ id: '+856', label: '🇱🇦 +856' }, // Laos
			{ id: '+371', label: '🇱🇻 +371' }, // Latvia
			{ id: '+961', label: '🇱🇧 +961' }, // Lebanon
			{ id: '+266', label: '🇱🇸 +266' }, // Lesotho
			{ id: '+231', label: '🇱🇷 +231' }, // Liberia
			{ id: '+218', label: '🇱🇾 +218' }, // Libya
			{ id: '+423', label: '🇱🇮 +423' }, // Liechtenstein
			{ id: '+370', label: '🇱🇹 +370' }, // Lithuania
			{ id: '+352', label: '🇱🇺 +352' }, // Luxembourg
			{ id: '+853', label: '🇲🇴 +853' }, // Macau
			{ id: '+389', label: '🇲🇰 +389' }, // North Macedonia
			{ id: '+261', label: '🇲🇬 +261' }, // Madagascar
			{ id: '+265', label: '🇲🇼 +265' }, // Malawi
			{ id: '+60', label: '🇲🇾 +60' },   // Malaysia
			{ id: '+960', label: '🇲🇻 +960' }, // Maldives
			{ id: '+223', label: '🇲🇱 +223' }, // Mali
			{ id: '+356', label: '🇲🇹 +356' }, // Malta
			{ id: '+692', label: '🇲🇭 +692' }, // Marshall Islands
			{ id: '+596', label: '🇲🇶 +596' }, // Martinique
			{ id: '+222', label: '🇲🇷 +222' }, // Mauritania
			{ id: '+230', label: '🇲🇺 +230' }, // Mauritius
			{ id: '+262', label: '🇾🇹 +262' }, // Mayotte
			{ id: '+52', label: '🇲🇽 +52' },   // Mexico
			{ id: '+691', label: '🇫🇲 +691' }, // Micronesia
			{ id: '+373', label: '🇲🇩 +373' }, // Moldova
			{ id: '+377', label: '🇲🇨 +377' }, // Monaco
			{ id: '+976', label: '🇲🇳 +976' }, // Mongolia
			{ id: '+382', label: '🇲🇪 +382' }, // Montenegro
			{ id: '+1-664', label: '🇲🇸 +1-664' }, // Montserrat
			{ id: '+212', label: '🇲🇦 +212' }, // Morocco
			{ id: '+258', label: '🇲🇿 +258' }, // Mozambique
			{ id: '+95', label: '🇲🇲 +95' },   // Myanmar
			{ id: '+264', label: '🇳🇦 +264' }, // Namibia
			{ id: '+674', label: '🇳🇷 +674' }, // Nauru
			{ id: '+977', label: '🇳🇵 +977' }, // Nepal
			{ id: '+31', label: '🇳🇱 +31' },   // Netherlands
			{ id: '+687', label: '🇳🇨 +687' }, // New Caledonia
			{ id: '+64', label: '🇳🇿 +64' },   // New Zealand
			{ id: '+505', label: '🇳🇮 +505' }, // Nicaragua
			{ id: '+227', label: '🇳🇪 +227' }, // Niger
			{ id: '+234', label: '🇳🇬 +234' }, // Nigeria
			{ id: '+683', label: '🇳🇺 +683' }, // Niue
			{ id: '+850', label: '🇰🇵 +850' }, // North Korea
			{ id: '+1-670', label: '🇲🇵 +1-670' }, // Northern Mariana Islands
			{ id: '+47', label: '🇳🇴 +47' },   // Norway
			{ id: '+968', label: '🇴🇲 +968' }, // Oman
			{ id: '+92', label: '🇵🇰 +92' },   // Pakistan
			{ id: '+680', label: '🇵🇼 +680' }, // Palau
			{ id: '+970', label: '🇵🇸 +970' }, // Palestine
			{ id: '+507', label: '🇵🇦 +507' }, // Panama
			{ id: '+675', label: '🇵🇬 +675' }, // Papua New Guinea
			{ id: '+595', label: '🇵🇾 +595' }, // Paraguay
			{ id: '+51', label: '🇵🇪 +51' },   // Peru
			{ id: '+63', label: '🇵🇭 +63' },   // Philippines
			{ id: '+48', label: '🇵🇱 +48' },   // Poland
			{ id: '+351', label: '🇵🇹 +351' }, // Portugal
			{ id: '+1-787', label: '🇵🇷 +1-787' }, // Puerto Rico
			{ id: '+974', label: '🇶🇦 +974' }, // Qatar
			{ id: '+242', label: '🇨🇬 +242' }, // Republic of the Congo
			{ id: '+40', label: '🇷🇴 +40' },   // Romania
			{ id: '+7', label: '🇷🇺 +7' },     // Russia
			{ id: '+250', label: '🇷🇼 +250' }, // Rwanda
			{ id: '+590', label: '🇧🇱 +590' }, // Saint Barthélemy
			{ id: '+290', label: '🇸🇭 +290' }, // Saint Helena
			{ id: '+1-869', label: '🇰🇳 +1-869' }, // Saint Kitts and Nevis
			{ id: '+1-758', label: '🇱🇨 +1-758' }, // Saint Lucia
			{ id: '+590', label: '🇲🇫 +590' }, // Saint Martin
			{ id: '+508', label: '🇵🇲 +508' }, // Saint Pierre and Miquelon
			{ id: '+1-784', label: '🇻🇨 +1-784' }, // Saint Vincent and the Grenadines
			{ id: '+685', label: '🇼🇸 +685' }, // Samoa
			{ id: '+378', label: '🇸🇲 +378' }, // San Marino
			{ id: '+239', label: '🇸🇹 +239' }, // São Tomé and Príncipe
			{ id: '+966', label: '🇸🇦 +966' }, // Saudi Arabia
			{ id: '+221', label: '🇸🇳 +221' }, // Senegal
			{ id: '+381', label: '🇷🇸 +381' }, // Serbia
			{ id: '+248', label: '🇸🇨 +248' }, // Seychelles
			{ id: '+232', label: '🇸🇱 +232' }, // Sierra Leone
			{ id: '+65', label: '🇸🇬 +65' },   // Singapore
			{ id: '+1-721', label: '🇸🇽 +1-721' }, // Sint Maarten
			{ id: '+421', label: '🇸🇰 +421' }, // Slovakia
			{ id: '+386', label: '🇸🇮 +386' }, // Slovenia
			{ id: '+677', label: '🇸🇧 +677' }, // Solomon Islands
			{ id: '+252', label: '🇸🇴 +252' }, // Somalia
			{ id: '+27', label: '🇿🇦 +27' },   // South Africa
			{ id: '+82', label: '🇰🇷 +82' },   // South Korea
			{ id: '+211', label: '🇸🇸 +211' }, // South Sudan
			{ id: '+34', label: '🇪🇸 +34' },   // Spain
			{ id: '+94', label: '🇱🇰 +94' },   // Sri Lanka
			{ id: '+249', label: '🇸🇩 +249' }, // Sudan
			{ id: '+597', label: '🇸🇷 +597' }, // Suriname
			{ id: '+47', label: '🇸🇯 +47' },   // Svalbard and Jan Mayen
			{ id: '+268', label: '🇸🇿 +268' }, // Eswatini
			{ id: '+46', label: '🇸🇪 +46' },   // Sweden
			{ id: '+41', label: '🇨🇭 +41' },   // Switzerland
			{ id: '+963', label: '🇸🇾 +963' }, // Syria
			{ id: '+886', label: '🇹🇼 +886' }, // Taiwan
			{ id: '+992', label: '🇹🇯 +992' }, // Tajikistan
			{ id: '+255', label: '🇹🇿 +255' }, // Tanzania
			{ id: '+66', label: '🇹🇭 +66' },   // Thailand
			{ id: '+670', label: '🇹🇱 +670' }, // Timor-Leste
			{ id: '+228', label: '🇹🇬 +228' }, // Togo
			{ id: '+690', label: '🇹🇰 +690' }, // Tokelau
			{ id: '+676', label: '🇹🇴 +676' }, // Tonga
			{ id: '+1-868', label: '🇹🇹 +1-868' }, // Trinidad and Tobago
			{ id: '+216', label: '🇹🇳 +216' }, // Tunisia
			{ id: '+90', label: '🇹🇷 +90' },   // Turkey
			{ id: '+993', label: '🇹🇲 +993' }, // Turkmenistan
			{ id: '+1-649', label: '🇹🇨 +1-649' }, // Turks and Caicos Islands
			{ id: '+688', label: '🇹🇻 +688' }, // Tuvalu
			{ id: '+256', label: '🇺🇬 +256' }, // Uganda
			{ id: '+380', label: '🇺🇦 +380' }, // Ukraine
			{ id: '+971', label: '🇦🇪 +971' }, // UAE
			{ id: '+44', label: '🇬🇧 +44' },   // UK
			{ id: '+598', label: '🇺🇾 +598' }, // Uruguay
			{ id: '+998', label: '🇺🇿 +998' }, // Uzbekistan
			{ id: '+678', label: '🇻🇺 +678' }, // Vanuatu
			{ id: '+379', label: '🇻🇦 +379' }, // Vatican City
			{ id: '+58', label: '🇻🇪 +58' },   // Venezuela
			{ id: '+84', label: '🇻🇳 +84' },   // Vietnam
			{ id: '+681', label: '🇼🇫 +681' }, // Wallis and Futuna
			{ id: '+967', label: '🇾🇪 +967' }, // Yemen
			{ id: '+260', label: '🇿🇲 +260' }, // Zambia
			{ id: '+263', label: '🇿🇼 +263' }, // Zimbabwe
		],
		[],
	);



	const currentMeta = COUNTRY_META[countryCode] || {};
	const dynamicPlaceholder = currentMeta.example || '123456789';

	const applyValidation = (code, num) => {
		const { valid, message } = validateByCountry(code, num, required);

		if (!valid && setError && name) {
			setError(name, {
				type: 'manual',
				message,
			});
		} else if (valid && clearErrors && name) {
			clearErrors(name);
		}
	};

	const handleCountryChange = v => {
		const code = typeof v === 'string' ? v : v?.target?.value;
		const next = number ? `${code} ${number}` : code || '';
		onChange && onChange(next);
		applyValidation(code, number);
	};

	const handleNumberChange = e => {
		const num = e.target.value;
		const next = num ? `${countryCode} ${num}` : '';
		onChange && onChange(next);
		applyValidation(countryCode, num);
	};

	const hasError = error && error !== 'users';
	const floated = focused || Boolean(number) || open;
	const selectedCountry = countries.find((c) => c.id === countryCode) || { id: countryCode, label: countryCode };
	const filtered = query
		? countries.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()) || c.id.includes(query))
		: countries;

	const place = useCallback(() => {
		const el = btnRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const pad = 8;
		const width = Math.max(280, rect.width);
		let left = Math.min(Math.max(pad, rect.left), window.innerWidth - width - pad);
		let top = rect.bottom + 6;
		setPos({ top, left, width });
		setTokens(readGmTokens(el));
	}, []);

	useEffect(() => {
		if (!open) return;
		place();
		const onWin = () => place();
		const onDoc = (e) => {
			if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
			setOpen(false);
		};
		window.addEventListener('resize', onWin);
		window.addEventListener('scroll', onWin, true);
		document.addEventListener('mousedown', onDoc);
		return () => {
			window.removeEventListener('resize', onWin);
			window.removeEventListener('scroll', onWin, true);
			document.removeEventListener('mousedown', onDoc);
		};
	}, [open, place]);

	return (
		<div className={`relative w-full ${className}`}>
			<div
				className='relative flex h-11 items-center rounded-[11px] border bg-[color-mix(in_srgb,var(--gm-paper,#fff)_62%,transparent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition-all duration-200'
				style={
					hasError
						? { borderColor: '#f43f5e' }
						: focused || open
							? { borderColor: 'var(--color-primary-500)', boxShadow: '0 0 0 3px color-mix(in srgb, var(--color-primary-500) 12%, transparent), inset 0 1px 0 rgba(255,255,255,0.8)' }
							: { borderColor: 'var(--gm-line, rgba(92,143,211,0.22))' }
				}
			>
				<button
					ref={btnRef}
					type="button"
					disabled={disabled}
					onClick={() => !disabled && setOpen((v) => !v)}
					className="ms-1 flex h-8 shrink-0 items-center gap-1 rounded-[8px] px-2 text-[12px] font-semibold text-[var(--gm-ink-soft)] hover:bg-[color-mix(in_srgb,var(--color-primary-50)_70%,transparent)]"
				>
					<span className="truncate max-w-[72px]">{selectedCountry.label}</span>
					<ChevronDown className={`size-3.5 text-[var(--gm-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
				</button>
				<span className="h-5 w-px bg-[var(--gm-line)]" />
				<PhoneIcon className="mx-2 size-4 shrink-0 text-[var(--gm-muted)]" />
				<input
					type="tel"
					dir="ltr"
					value={number}
					disabled={disabled}
					placeholder={floated ? dynamicPlaceholder : ' '}
					onChange={handleNumberChange}
					onFocus={() => setFocused(true)}
					onBlur={() => setFocused(false)}
					aria-invalid={!!hasError}
					className="h-full min-w-0 flex-1 bg-transparent pe-3 text-[13px] text-[var(--gm-ink)] outline-none placeholder:text-[var(--gm-faint)] disabled:cursor-not-allowed"
				/>
				{label ? (
					<span
						className={`pointer-events-none absolute z-[1] px-1 transition-all duration-200 ${
							floated
								? 'top-0 start-24 -translate-y-1/2 rounded-md bg-[var(--gm-paper,#fff)] text-[11px] font-medium text-[var(--gm-muted)]'
								: 'top-1/2 start-[7.5rem] -translate-y-1/2 text-[13px] text-[var(--gm-faint)]'
						} ${hasError && floated ? 'text-rose-500' : ''}`}
					>
						{label}
						{required ? <span className="ms-0.5 text-rose-500">*</span> : null}
					</span>
				) : null}
			</div>

			{open && typeof document !== 'undefined'
				? createPortal(
					<div
						ref={menuRef}
						className="overflow-hidden rounded-[12px] border p-1.5"
						style={{
							...tokens,
							position: 'fixed',
							top: pos.top,
							left: pos.left,
							width: pos.width,
							zIndex: 1200000,
							background: 'var(--gm-paper, #fff)',
							borderColor: 'var(--gm-line)',
							boxShadow: 'var(--gm-shadow-3)',
						}}
					>
						<div className="mb-1.5 flex h-9 items-center gap-2 rounded-[9px] border px-2" style={{ borderColor: 'var(--gm-line)', background: 'var(--gm-paper)' }}>
							<Search className="size-3.5 text-[var(--gm-muted)]" />
							<input
								autoFocus
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Search country"
								className="h-full w-full bg-transparent text-[12px] outline-none"
							/>
						</div>
						<div className="max-h-56 overflow-auto">
							{filtered.map((opt) => (
								<button
									key={`${opt.id}-${opt.label}`}
									type="button"
									onClick={() => {
										handleCountryChange(opt.id);
										setOpen(false);
										setQuery('');
									}}
									className={`flex w-full items-center rounded-[9px] px-3 py-2 text-start text-[13px] ${
										opt.id === countryCode
											? 'bg-[color-mix(in_srgb,var(--color-primary-100)_80%,transparent)] font-semibold text-[var(--color-primary-700)]'
											: 'text-[var(--gm-ink-soft)] hover:bg-[color-mix(in_srgb,var(--color-primary-50)_80%,transparent)]'
									}`}
								>
									{opt.label}
								</button>
							))}
						</div>
					</div>,
					document.body,
				)
				: null}

			{hasError && (
				<div className="mt-1.5 flex items-center gap-1.5">
					<AlertCircle className="size-3.5 shrink-0 text-rose-600" />
					<p className="text-xs text-rose-600">{error}</p>
				</div>
			)}
		</div>
	);
}