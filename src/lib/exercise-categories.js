import { baseImg } from '@/utils/axios';

export const categoryMap = {
	Arms: 'الذراعين', Back: 'الظهر', Calves: 'عضلات الساق', Cardio: 'تمارين القلب',
	Chest: 'الصدر', Core: 'الوسط / البطن', Forearms: 'الساعدين', 'Full Body': 'جسم كامل',
	General: 'عام', 'Glutes & Hamstrings': 'المؤخرة وأوتار الركبة', Legs: 'الساقين',
	Other: 'أخرى', 'Quads & Hamstrings': 'عضلات الفخذ الأمامية والخلفية', Shoulders: 'الكتفين',
	Abs: 'عضلات البطن', Biceps: 'عضلات البايسبس', Triceps: 'عضلات الترايسبس',
	Neck: 'الرقبة', Hips: 'الوركين', Thighs: 'الفخذين', 'Lower Body': 'الجزء السفلي',
	'Upper Body': 'الجزء العلوي', 'Lower Back': 'أسفل الظهر', 'Upper Back': 'أعلى الظهر',
	Mobility: 'مرونة الحركة', Stretching: 'تمارين الإطالة', Strength: 'القوة',
	Power: 'القوة الانفجارية', HIIT: 'تدريب عالي الكثافة', Pilates: 'البيلاتس',
	Yoga: 'اليوغا', Meditation: 'التأمل', Warmup: 'الإحماء', Cooldown: 'التهدئة',
	Balance: 'التوازن', Functional: 'اللياقة الوظيفية', Plyometrics: 'البليومتريكس',
	Stability: 'الاستقرار', Endurance: 'التحمل', Aerobic: 'تمارين هوائية',
	Anaerobic: 'تمارين لا هوائية', Flexibility: 'المرونة', Strengthening: 'تقوية العضلات',
	Treadmill: 'جهاز المشي', Elliptical: 'جهاز الإليبتكال', Rowing: 'جهاز التجديف',
	Cycling: 'الدراجة الثابتة', 'Stair Climber': 'جهاز صعود الدرج',
	Running: 'الجري', Walking: 'المشي', Swimming: 'السباحة', Boxing: 'الملاكمة',
	MartialArts: 'الفنون القتالية',
};

export const categoryLabel = (category, locale) =>
	locale === 'ar' ? categoryMap[category] || category : category;

export const exerciseVideoSrc = video => (!video || video.startsWith('http') ? video || '' : baseImg + video);
