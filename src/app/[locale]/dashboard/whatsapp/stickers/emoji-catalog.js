/**
 * A compact, hand-picked emoji set for the composer picker, grouped the way
 * WhatsApp groups them. Each entry is "emoji keywords…" so search works in
 * English and Arabic without shipping a full emoji database.
 */

const RAW = {
	smileys: `
😀 grin smile happy ضحك ابتسامة
😃 smile happy open ابتسامة
😄 laugh smile eyes ضحك
😁 beam grin teeth ضحك
😆 laugh squint ضحك
😅 sweat relief nervous عرق
😂 joy tears laugh lol ضحك دموع
🤣 rofl rolling laugh ضحك
🙂 slight smile ابتسامة
😉 wink غمزة
😊 blush smile happy خجل
😇 angel halo innocent ملاك
🥰 love hearts adore حب
😍 heart eyes love حب
🤩 star struck wow نجوم
😘 kiss blow قبلة
😋 yum tasty delicious لذيذ
😛 tongue playful لسان
😜 wink tongue crazy
🤪 zany crazy goofy
🤗 hug hugging حضن
🤭 oops giggle hand
🤫 shush quiet secret سر
🤔 thinking hmm تفكير
🤐 zipper mouth silent
😐 neutral meh
😑 expressionless
😶 no mouth speechless
😏 smirk
😒 unamused
🙄 eye roll
😬 grimace awkward
😌 relieved calm ارتياح
😔 pensive sad حزن
😪 sleepy نعسان
😴 sleeping zzz نوم
😷 mask sick مريض
🤒 thermometer fever sick
🤕 bandage hurt
🥵 hot heat حر
🥶 cold freezing برد
🥳 party celebrate حفلة
😎 cool sunglasses
🤓 nerd glasses
🧐 monocle inspect
😕 confused
😟 worried قلق
🙁 frown sad
😮 open mouth wow
😲 astonished shocked
🥺 pleading puppy please رجاء
😢 cry tear sad بكاء
😭 sob crying loud بكاء
😱 scream fear خوف
😖 confounded
😞 disappointed
😓 downcast sweat
😩 weary tired تعب
😫 tired exhausted
🥱 yawn bored
😤 triumph huff
😡 angry rage mad غضب
🤬 cursing swearing
😈 devil smiling
💀 skull dead
🤡 clown
👻 ghost
👽 alien
🤖 robot`,
	people: `
👋 wave hello bye سلام
🤚 raised back hand
✋ hand stop high five
🖐️ hand splayed
👌 ok perfect تمام
🤌 pinched fingers italian
🤏 pinch small
✌️ victory peace
🤞 crossed fingers luck حظ
🤟 love you gesture
🤘 rock horns
🤙 call me shaka
👈 point left
👉 point right
👆 point up
👇 point down
☝️ index up
👍 thumbs up like yes موافق
👎 thumbs down dislike no
✊ fist raised
👊 punch fist bump
👏 clap applause تصفيق
🙌 raise hands celebrate
👐 open hands
🤲 palms up dua دعاء
🤝 handshake deal اتفاق
🙏 pray please thanks شكرا دعاء
✍️ writing
💪 muscle strong flex gym قوة
🦵 leg
🦶 foot
👀 eyes look see
🧠 brain smart
🫀 heart organ
🫁 lungs
🏃 run running جري
🚶 walk walking مشي
🏋️ weight lifting gym
🤸 cartwheel
🧘 yoga meditate
🚴 cycling bike`,
	hearts: `
❤️ red heart love حب
🧡 orange heart
💛 yellow heart
💚 green heart
💙 blue heart
💜 purple heart
🖤 black heart
🤍 white heart
🤎 brown heart
💔 broken heart
❣️ heart exclamation
💕 two hearts
💞 revolving hearts
💓 beating heart
💗 growing heart
💖 sparkling heart
💘 cupid arrow
💝 heart gift
✅ check done yes تم
☑️ checkbox
✔️ check mark
❌ cross no wrong خطأ
❗ exclamation important
❓ question
‼️ double exclamation
💯 hundred perfect
🔥 fire lit hot نار
✨ sparkles
⭐ star نجمة
🌟 glowing star
💫 dizzy
⚡ zap lightning
💥 boom
💤 zzz sleep
🎉 party popper celebrate مبروك
🎊 confetti
🎁 gift present هدية
🏆 trophy win فوز
🥇 gold medal first
🎯 target goal هدف
📌 pin
📍 location pin مكان
⏰ alarm clock
⏳ hourglass waiting
📅 calendar date موعد
🔔 bell notification
📣 megaphone announce`,
	nature: `
🌹 rose flower وردة
🌸 blossom flower
🌺 hibiscus
🌻 sunflower
🌷 tulip
🌱 seedling grow
🌿 herb
🍀 clover luck
🌴 palm tree
🌙 moon night قمر
☀️ sun شمس
🌈 rainbow
☁️ cloud
🌧️ rain مطر
❄️ snow
🌊 wave sea
🐶 dog
🐱 cat
🦁 lion
🐻 bear
🦋 butterfly
🍎 apple fruit تفاح
🍌 banana موز
🍓 strawberry
🍉 watermelon
🥑 avocado
🥦 broccoli
🥕 carrot
🍗 chicken دجاج
🥩 steak meat لحم
🥚 egg بيض
🍳 cooking egg
🥗 salad سلطة
🍕 pizza
🍔 burger
🍟 fries
🍫 chocolate
🍰 cake كيك
☕ coffee قهوة
🍵 tea شاي
🥤 drink
💧 water drop ماء
🥛 milk حليب`,
	activity: `
⚽ soccer football كورة
🏀 basketball
🏐 volleyball
🎾 tennis
🏓 ping pong
🥊 boxing glove
🥋 martial arts
🏊 swimming سباحة
⛹️ ball player
🤾 handball
🧗 climbing
🏆 trophy cup
🏅 medal sports
🎽 running shirt
👟 sneakers shoes
⌚ watch time
📱 phone mobile موبايل
💻 laptop
📷 camera
🎥 video camera
🎧 headphones
📚 books study
📝 memo note ملاحظة
📊 chart stats
📈 trending up growth
💡 idea bulb فكرة
💰 money bag فلوس
💳 card payment
🛒 cart shopping
🚗 car عربية
✈️ plane travel سفر
🏠 home house بيت
🗓️ schedule calendar`,
};

export const EMOJI_CATEGORIES = [
	{ id: 'smileys', en: 'Smileys', ar: 'وجوه' },
	{ id: 'people', en: 'People', ar: 'أشخاص' },
	{ id: 'hearts', en: 'Symbols', ar: 'رموز' },
	{ id: 'nature', en: 'Nature & food', ar: 'طبيعة وأكل' },
	{ id: 'activity', en: 'Activity & objects', ar: 'أنشطة وأشياء' },
];

export const EMOJIS_BY_CATEGORY = Object.fromEntries(
	Object.entries(RAW).map(([id, block]) => [
		id,
		block
			.split('\n')
			.map(line => line.trim())
			.filter(Boolean)
			.map(line => {
				const [emoji, ...words] = line.split(/\s+/);
				return { emoji, keywords: words.join(' ').toLowerCase() };
			}),
	]),
);

export function searchEmojis(query) {
	const needle = String(query || '').trim().toLowerCase();
	if (!needle) return [];
	const seen = new Set();
	const results = [];
	for (const list of Object.values(EMOJIS_BY_CATEGORY)) {
		for (const item of list) {
			if (seen.has(item.emoji)) continue;
			// Word-prefix match: "love" finds the hearts, not cLOVEr or gLOVE.
			if (item.emoji === needle || item.keywords.split(' ').some(word => word.startsWith(needle))) {
				seen.add(item.emoji);
				results.push(item.emoji);
			}
		}
	}
	return results;
}

const RECENT_KEY = 'wa-emoji-recent';
const RECENT_MAX = 24;

export function readRecentEmojis() {
	try {
		const parsed = JSON.parse(window.localStorage.getItem(RECENT_KEY) || '[]');
		return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string').slice(0, RECENT_MAX) : [];
	} catch {
		return [];
	}
}

export function rememberEmoji(emoji, current = []) {
	const next = [emoji, ...current.filter(item => item !== emoji)].slice(0, RECENT_MAX);
	try {
		window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
	} catch {
		/* private mode / storage blocked: recents just stay in memory */
	}
	return next;
}
