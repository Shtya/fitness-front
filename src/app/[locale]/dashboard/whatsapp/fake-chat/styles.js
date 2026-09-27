import { cn } from '@/utils/cn';
import { IOS_WA_FONT } from './ios-font-and-match';

/** Shared Tailwind class strings for Fake Chat (replaces fake-chat.css). */

export const DEFAULT_WALLPAPER = 'url("/fake-chat/Wallpaper.png")';

export { IOS_WA_FONT };

export const tw = {
	studio:
		'grid h-full min-h-0 grid-cols-1 gap-3 overflow-hidden bg-[#f0f2f5] p-2 max-[900px]:overflow-auto md:grid-cols-[minmax(300px,340px)_minmax(0,1fr)] dark:bg-[#0b141a]',
	panel: 'flex h-full min-h-0 min-w-0 flex-col gap-2 overflow-hidden',
	panelScroll: 'nice-scroll flex min-h-0 flex-1 flex-col gap-2.5 overflow-x-hidden overflow-y-auto pe-0.5 pb-1',
	headTitle: 'm-0 text-sm font-extrabold text-[#111b21] dark:text-[#e9edef]',
	headSub: 'mt-0.5 text-xs text-[#667781]',
	seg: 'grid shrink-0 grid-cols-2 gap-1 rounded-[10px] bg-[#e9edef] p-0.5 dark:bg-[#1f2c34]',
	seg3: 'grid shrink-0 grid-cols-3 gap-1 rounded-[10px] bg-[#e9edef] p-0.5 dark:bg-[#1f2c34]',
	seg4: 'grid shrink-0 grid-cols-4 gap-1 rounded-[10px] bg-[#e9edef] p-0.5 dark:bg-[#1f2c34]',
	seg5: 'grid shrink-0 grid-cols-5 gap-0.5 rounded-[10px] bg-[#e9edef] p-0.5 dark:bg-[#1f2c34]',
	segSm: 'mb-2 grid grid-cols-2 gap-1 rounded-[10px] bg-[#e9edef] p-0.5 dark:bg-[#1f2c34]',
	segBtn:
		'inline-flex h-8 cursor-pointer items-center justify-center gap-0.5 rounded-lg border-0 bg-transparent px-0.5 text-[10px] font-bold text-[#54656f]',
	segBtnActive: 'bg-white text-[#008069] shadow-sm dark:bg-[#111b21] dark:text-[#25d366]',
	clipTray:
		'shrink-0 rounded-[10px] border border-dashed border-[#cfd6db] bg-white p-2 dark:border-[#2a3942] dark:bg-[#111b21]',
	clipHead: 'mb-1.5 flex items-start justify-between gap-2',
	clipTitle: 'm-0 text-[11px] font-extrabold uppercase tracking-wide text-[#667781]',
	clipHint: 'm-0 text-[10px] leading-snug text-[#8696a0]',
	clipEmpty:
		'flex min-h-[52px] cursor-text flex-col items-center justify-center gap-1 rounded-lg bg-[#f0f2f5] px-2 py-3 text-[11px] text-[#667781] outline-none focus:ring-2 focus:ring-[#1dab61]/40',
	clipGrid: 'grid grid-cols-4 gap-1.5',
	clipItem:
		'group relative aspect-square overflow-hidden rounded-lg bg-[#e9edef] ring-1 ring-[#d1d7db]',
	clipThumb: 'h-full w-full object-cover',
	clipPath:
		'pointer-events-none absolute inset-x-0 bottom-0 z-10 m-0 truncate bg-black/55 px-1 py-0.5 text-[7px] leading-tight text-white',
	clipActions:
		'pointer-events-none absolute inset-0 flex items-end justify-center gap-0.5 bg-[linear-gradient(transparent_40%,rgba(0,0,0,0.55))] p-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100',
	clipAct:
		'grid h-6 w-6 place-items-center rounded-md border-0 bg-white/95 text-[#111b21] shadow-sm',
	clipActDanger: 'bg-[#fde8ea] text-[#b42318]',
	card: 'flex min-w-0 shrink-0 flex-col gap-2 overflow-visible rounded-[10px] border border-[#e9edef] bg-white p-2.5 dark:border-[#222d34] dark:bg-[#111b21]',
	cardH3:
		'm-0 text-[12px] font-extrabold uppercase tracking-wide text-[#667781]',
	cardHead: 'flex items-center justify-between gap-1.5',
	label: 'flex flex-col gap-1 text-[11px] font-semibold text-[#54656f]',
	input:
		'box-border h-[30px] w-full rounded-lg border border-[#d1d7db] bg-[#f0f2f5] px-2 text-xs text-[#111b21] outline-none dark:border-[#2a3942] dark:bg-[#0b141a] dark:text-[#e9edef]',
	textarea:
		'box-border h-auto w-full resize-y rounded-lg border border-[#d1d7db] bg-[#f0f2f5] px-2.5 py-2 text-xs text-[#111b21] outline-none dark:border-[#2a3942] dark:bg-[#0b141a] dark:text-[#e9edef]',
	check: '!flex min-h-6 !flex-row items-center !gap-2 overflow-visible',
	rowBtns: 'flex flex-wrap gap-1.5 overflow-visible',
	fileBtn:
		'inline-flex h-8 min-h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#d1d7db] bg-[#f0f2f5] px-2.5 text-[11px] font-bold text-[#111b21]',
	pasteTarget: 'border-[#1dab61] bg-[#d9fdd3] text-[#008069] shadow-[0_0_0_2px_rgba(29,171,97,0.25)]',
	btnAccent: 'border-[#a7e4b5] bg-[#d9fdd3] text-[#008069]',
	fileInputHidden: 'hidden',
	hint: 'm-0 text-xs leading-snug text-[#667781]',
	msgList: 'm-0 flex max-h-[min(280px,40vh)] min-h-0 list-none flex-col gap-1 overflow-auto p-0',
	msgItem:
		'flex min-w-0 items-center gap-2 rounded-lg bg-[#f0f2f5] px-2 py-1.5 text-[11px] text-[#111b21] dark:bg-[#0b141a] dark:text-[#e9edef]',
	msgItemText: 'min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap',
	msgDelete: 'ms-auto cursor-pointer border-0 bg-transparent text-[#e35d6a]',
	listChats: 'm-0 flex max-h-[min(420px,55vh)] list-none flex-col gap-2 overflow-auto p-0',
	listChatItem: 'flex flex-col gap-1.5 rounded-[10px] border border-transparent bg-[#f0f2f5] p-2 dark:bg-[#0b141a]',
	listChatItemPaste: 'border-[#1dab61] shadow-[0_0_0_2px_rgba(29,171,97,0.2)]',
	listChatHead: 'flex items-center justify-between gap-2',
	listChatDelete: 'cursor-pointer border-0 bg-transparent p-1 text-[#e35d6a]',
	actions: 'flex shrink-0 flex-col gap-1.5 border-t border-[#e9edef] bg-[#f0f2f5] pt-1',
	actionsRow: 'grid grid-cols-2 gap-1.5',
	shot: 'inline-flex h-[38px] cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-linear-to-br from-[#1dab61] to-[#128c7e] text-xs font-extrabold text-white shadow-[0_8px_18px_-10px_rgba(29,171,97,0.8)] disabled:cursor-wait disabled:opacity-65',
	reset:
		'inline-flex h-[34px] cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-[#d1d7db] bg-white text-xs font-bold text-[#54656f]',
	stage: 'relative grid min-h-0 place-items-center justify-center overflow-hidden px-1 py-2 max-[900px]:order-[-1]',
	stageEditToggle:
		'absolute end-2 top-2 z-10 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-[#d1d7db] bg-white px-3 text-xs font-bold text-[#111b21] shadow-sm hover:bg-[#f0f2f5]',
	stageEditToggleOn: 'border-[#1dab61] bg-[#1dab61] text-white hover:bg-[#179c57]',
	/** Outer box = scaled visual size; inner keeps fixed 414×896 layout. */
	phoneWrap: 'relative shrink-0',
	phoneScale: 'origin-top-left will-change-transform',
	phone: cn(
		'fc-phone relative flex h-[896px] w-[414px] shrink-0 flex-col overflow-hidden bg-[#f4f1ec] text-black antialiased [font-synthesis:none] [-webkit-font-smoothing:antialiased] [-moz-osx-font-smoothing:grayscale]',
	),
	/** Capture = raw screen (rectangular). Preview rounding lives on phoneDeviceScreen. */
	phoneCapturing: '!rounded-none ![border-radius:0]',
	/** In-mockup edit mode (never rendered while capturing). */
	editable:
		'cursor-text rounded-[3px] outline-1 outline-offset-1 outline-dashed outline-[#1dab61]/70 focus:bg-[#1dab61]/10 focus:outline-2 focus:outline-solid',
	editableGhost: 'opacity-35',
	editAvatar:
		'relative cursor-pointer rounded-full outline-2 outline-offset-2 outline-dashed outline-[#1dab61]/70 hover:outline-solid',
	/** Preview-only chassis — excluded from PNG via data-no-capture. */
	phoneDevice:
		'relative box-border shrink-0 overflow-hidden rounded-[46px] bg-[#1c1c1e] p-[14px]',
	phoneDeviceScreen:
		'relative h-full w-full overflow-hidden rounded-[34px] bg-[#f4f1ec]',
	/** iOS-like: scroll works, scrollbar never drawn (inside the phone only). */
	iosScroll:
		'overflow-auto overflow-x-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
	notch: 'pointer-events-none absolute left-1/2 top-0 z-5 h-[30px] w-[210px] -translate-x-1/2 rounded-b-[18px] bg-black',
	/** Real WA: cream chrome over wallpaper (not solid white slab). */
	chrome: 'relative z-10 shrink-0 bg-[#f4f1ec]',
	chromeList: 'shrink-0 border-b-0 bg-white',
	/** Pixel crop header: status icons + back/actions; overlays for time + person. */
	chromeShot: 'relative z-10 w-full shrink-0 bg-[#f4f1ec] leading-[0]',
	chromeShotImg: 'pointer-events-none block h-auto w-full select-none',
	chromeTimeFloat:
		'pointer-events-none absolute start-[22px] top-[14px] z-20 text-[15px] font-semibold leading-none tracking-[-0.3px] text-black',
	chromeBackHit: 'absolute start-0 top-[44px] z-20 h-[52px] w-[64px] border-0 bg-transparent p-0',
	chromeBackBadgeCover:
		'pointer-events-none absolute start-[26px] top-[54px] z-20 h-[26px] w-[26px] rounded-sm bg-[#f4f1ec]',
	chromeBackBadgeFloat:
		'pointer-events-none absolute start-[28px] top-[60px] z-30 text-[24px] font-normal leading-none text-black',
	chromePersonFloat:
		'absolute start-[64px] end-[88px] top-[48px] z-20 flex h-[44px] min-w-0 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-start',
	composerShot: 'relative z-10 w-full shrink-0 bg-[#f4f1ec] leading-[0]',
	composerShotImg: 'pointer-events-none block h-auto w-full select-none',
	statusBar:
		'relative z-6 flex h-[44px] items-end justify-between px-[22px] pb-[6px] text-black',
	statusTime: 'ps-0.5 text-[15px] font-semibold leading-none tracking-[-0.3px] text-black',
	statusIcons: 'flex items-center gap-[5px] pe-0.5 text-black',
	iconCell: 'block h-[11px] w-[17px] shrink-0 text-black',
	iconWifi: 'block h-[12px] w-[16px] shrink-0 text-black',
	iconBattery: 'block h-[12px] w-[25px] shrink-0 text-black',
	homeIndicator: 'flex h-7 shrink-0 items-start justify-center bg-inherit pt-2',
	homeIndicatorThread: 'bg-transparent pt-1.5 pb-1',
	homeBar: 'h-[5px] w-[134px] rounded-full bg-[#1c1c1e]',
	avatar:
		'grid shrink-0 place-items-center overflow-hidden rounded-full font-bold text-white',
	avatarImg: 'h-full w-full object-cover',
	/** WhatsApp-like default stubs (no photo): soft gradient + white SVG. */
	avatarStubUser:
		'bg-linear-to-b from-[#dfe5e7] to-[#aeb8bf] text-white',
	avatarStubGroup:
		'bg-linear-to-b from-[#9bcbb8] to-[#5f9a86] text-white',
	avatarStubSvg: 'pointer-events-none block shrink-0 translate-y-[6%]',
	threadHeader: 'flex h-[52px] items-center gap-1 px-2.5 pb-1.5 ps-1',
	backBtn:
		'inline-flex cursor-default items-center gap-[2px] border-0 bg-transparent p-0 pe-1 text-black',
	backIcon: 'block h-[20px] w-[12px] shrink-0 text-black',
	backBadge: 'ms-0 text-[17px] font-normal leading-none tracking-tight text-black',
	person: 'flex min-w-0 flex-1 items-center gap-2',
	personName: 'm-0 truncate text-[16px] font-semibold leading-[20px] tracking-[-0.2px] text-black',
	personSub: 'm-0 text-[12px] font-normal leading-[15px] text-[#8e8e93]',
	headerActions: 'flex items-center gap-[16px] pe-2.5 text-black',
	actionIcon: 'block h-[18px] w-[28px] shrink-0 text-black',
	actionPhone: 'block h-[20px] w-[20px] shrink-0 text-black',
	wallpaper: 'flex min-h-0 flex-1 flex-col bg-[#f4f1ec] bg-cover bg-center bg-no-repeat',
	threadScroll:
		'flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-[17px] pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
	row: 'flex w-full',
	rowIn: 'justify-start',
	rowOut: 'justify-end',
	/** Same-sender stack vs side-change — closer to real phone gaps. */
	rowTight: 'mt-[4px]',
	rowLoose: 'mt-[5px]',
	bubble:
		'relative box-border inline-block max-w-[78%] min-w-[56px] overflow-visible rounded-[18px] px-[13px] pb-[7px] pt-[8px] align-top shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]',
	bubbleIn: 'bg-white',
	bubbleOut: 'bg-[#dcf8c6]',
	/** Soft bottom-outer corner so CSS ::before/::after tail joins cleanly. */
	bubbleInTail: 'rounded-es-[5px]',
	bubbleOutTail: 'rounded-ee-[5px]',
	bubbleInGroup: 'rounded-[18px]',
	bubbleOutGroup: 'rounded-[18px]',
	/** Block + float meta → time sits bottom-right on last text line (never outside). */
	/** flex-wrap (no float / ::after) — survives html-to-image cloning. */
	bubbleLine: 'flex flex-wrap items-end gap-x-[8px] leading-[24px]',
	/** Arabic (RTL) messages: WhatsApp iOS puts the time on its own line, bottom-right. */
	bubbleLineRtl: 'flex flex-col [direction:ltr]',
	/** Sizes measured against a real iPhone WhatsApp screenshot (scaled to 414pt). */
	bubbleText:
		'm-0 min-w-0 max-w-full p-0 text-[17.5px] font-medium leading-[24px] break-words whitespace-pre-wrap text-[#111b21] [font-weight:500] [overflow-wrap:break-word] [unicode-bidi:plaintext]',
	meta: 'inline-flex items-center gap-[3px] whitespace-nowrap text-[12px] font-semibold leading-[16px] text-[#54656f] [font-weight:600]',
	/** Pin time to bottom-right of last text line (WhatsApp iOS). */
	metaTail: 'ms-auto shrink-0 translate-y-[2px]',
	metaBelow: 'mt-[4px] self-end',
	reply:
		'mb-1.5 flex flex-col gap-px overflow-hidden rounded-[7px] border-s-[3.5px] border-[#25d366] bg-[rgba(0,0,0,0.05)] px-2 py-[5px]',
	replyAuthor: 'text-[13px] font-semibold leading-[17px] text-[#25d366]',
	replyText: 'truncate text-[13px] font-normal leading-[17px] text-[#667781]',
	bubbleVoice: 'flex min-w-[248px] flex-col !pb-1.5 !pt-2',
	bubbleVoiceMeta: 'mt-0.5 inline-flex self-end pe-0.5',
	bubbleMedia: 'flex flex-col',
	bubbleMediaMeta: 'mt-1 self-end',
	timingBox:
		'mb-2 flex flex-col gap-2 rounded-lg border border-[#d1d7db] bg-[#f0f2f5] p-2 dark:border-[#2a3942] dark:bg-[#0b141a]',
	timingRow: 'flex flex-wrap items-end gap-2',
	timingLabel: 'flex min-w-[88px] flex-1 flex-col gap-1 text-[11px] font-semibold text-[#54656f]',
	timingCheck: 'inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#111b21]',
	timingSelect: 'box-border h-[30px] w-full rounded-lg border border-[#d1d7db] bg-white px-2 text-xs text-[#111b21] outline-none dark:border-[#2a3942] dark:bg-[#111b21] dark:text-[#e9edef]',
	timingHint: 'm-0 text-[10px] leading-snug text-[#8696a0]',
	/** Unknown / first-contact card (WhatsApp iOS). */
	threadIntro: '-mx-[9px] flex flex-col items-center gap-2 px-3 pb-2 pt-1',
	datePill:
		'inline-flex rounded-[8px] bg-white/95 px-2.5 py-[3px] text-[12px] font-semibold leading-[16px] text-[#54656f] shadow-[0_1px_0.5px_rgba(11,20,26,0.08)]',
	encryptBanner:
		'mx-1 flex max-w-[92%] items-start gap-1.5 rounded-[8px] bg-[#fff5c4] px-2.5 py-1.5 text-center text-[12px] leading-[16px] text-[#54656f]',
	encryptBannerText: 'm-0 flex-1 text-center',
	encryptLink: 'font-semibold text-[#027eb5]',
	unknownCard:
		'mx-1 flex w-[min(100%,340px)] flex-col items-center rounded-[24px] bg-white px-4 pb-3.5 pt-4 shadow-[0_1px_0.5px_rgba(11,20,26,0.08)]',
	unknownPhone: 'm-0 mt-2.5 text-center text-[22px] font-bold leading-tight tracking-tight text-[#111b21]',
	unknownAbout: 'm-0 mt-0.5 text-center text-[15px] font-normal leading-[20px] text-[#111b21]',
	unknownMeta: 'm-0 mt-2 max-w-[280px] text-center text-[13px] font-normal leading-[17px] text-[#667781]',
	unknownMetaStrong: 'font-semibold text-[#111b21]',
	unknownSafety:
		'mt-2 inline-flex items-center gap-1 border-0 bg-transparent p-0 text-[14px] font-semibold text-[#027a5a]',
	unknownActions: 'mt-3.5 grid w-full grid-cols-2 gap-2',
	unknownBtn:
		'inline-flex h-[40px] items-center justify-center gap-1.5 rounded-full border-0 bg-[#f0f2f5] text-[15px] font-semibold',
	unknownBtnBlock: 'text-[#e11d48]',
	unknownBtnAdd: 'text-[#111b21]',
	voice: 'flex items-center gap-2 px-0.5',
	voiceAvatarWrap: 'relative shrink-0',
	voiceMicBadge:
		'absolute -bottom-0.5 -end-0.5 grid h-[14px] w-[14px] place-items-center rounded-full bg-[#25d366] text-white',
	voicePlay:
		'grid h-8 w-8 shrink-0 place-items-center rounded-full border-0 bg-transparent p-0 text-[#54656f]',
	voiceBody: 'relative flex min-w-0 flex-1 flex-col justify-center gap-0.5 pe-1',
	voiceWave: 'relative flex h-[22px] items-center gap-[1.5px]',
	voiceWaveBar: 'block w-[2.5px] shrink-0 rounded-full bg-[#8696a0]',
	voiceScrub:
		'absolute top-1/2 h-[10px] w-[10px] -translate-y-1/2 rounded-full bg-[#54656f] shadow-sm',
	voiceDur: 'text-[11px] leading-none text-[#667781]',
	media: 'max-w-[260px] min-w-[200px] overflow-hidden rounded-lg bg-[#d1d7db]',
	mediaImg: 'block h-auto max-h-[320px] w-full object-cover',
	mediaTicketImg: 'max-h-[420px] bg-white object-contain',
	mediaPlaceholder: 'grid h-[140px] place-items-center text-[13px] font-bold text-[#667781]',
	mediaCaption: 'm-0 bg-inherit px-2 py-1.5 text-sm',
	composer: 'w-full shrink-0 bg-[#f4f1ec]',
	composerRow: 'flex items-center gap-[8px] px-[10px] pb-1 pt-1.5',
	composerPlus:
		'grid h-9 w-9 shrink-0 place-items-center border-0 bg-transparent p-0 text-black',
	composerField:
		'flex h-9 min-w-0 flex-1 items-center rounded-full border border-[#d1d7db]/bg-white ps-3.5 pe-2',
	composerFieldGrow: 'min-w-0 flex-1',
	composerSticker: 'grid h-8 w-8 shrink-0 place-items-center text-[#8e8e93]',
	composerCam:
		'grid h-9 w-9 shrink-0 place-items-center border-0 bg-transparent p-0 text-black',
	composerMic:
		'grid h-9 w-9 shrink-0 place-items-center rounded-full border-0 bg-[#25d366] p-0 text-white',
	composerStatic: 'w-full shrink-0 bg-[#f4f1ec] leading-[0]',
	composerStaticImg: 'block h-auto w-full',
	phoneList: 'bg-white',
	listTop: 'relative flex h-11 shrink-0 items-center justify-between px-3.5',
	listTopTitle:
		'pointer-events-none absolute inset-x-14 top-1/2 m-0 -translate-y-1/2 truncate text-center text-[17px] font-bold tracking-tight text-[#1c1c1e]',
	listMore: 'grid h-[34px] w-[34px] place-items-center rounded-full border-0 bg-[#f2f2f7] text-[#1c1c1e]',
	listTopRight: 'flex items-center gap-2.5 text-[#1c1c1e]',
	listTopBtn: 'grid place-items-center border-0 bg-transparent p-0 text-inherit',
	listNew: '!h-[34px] !w-[34px] !rounded-full !bg-[#1dab61] !text-white',
	listTitle: 'mx-4 mb-2.5 mt-0.5 text-[34px] font-extrabold leading-[1.05] tracking-tight',
	listSearch:
		'mx-4 mb-2.5 flex h-9 items-center gap-2 rounded-[10px] bg-[#7676801f] px-3 text-base text-[#8e8e93]',
	listFilters:
		'flex gap-2 overflow-x-auto overflow-y-hidden px-4 pb-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
	chip: 'inline-flex h-[30px] shrink-0 items-center rounded-full border border-[#e5e5ea] bg-white px-3 text-sm font-semibold text-[#1c1c1e]',
	chipActive: 'border-transparent bg-[#d9fdd3] text-[#008069]',
	chipPlus: 'w-[30px] justify-center px-0 text-[#8e8e93]',
	listPane: 'relative flex min-h-0 flex-1 flex-col overflow-hidden',
	listBody:
		'min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-white pb-[76px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
	listRow: 'flex items-center gap-3 px-4 py-[11px]',
	avatarWrap: 'relative shrink-0',
	storyRing: 'after:absolute after:inset-[-3px] after:rounded-full after:border-2 after:border-[#25d366]',
	disappearBadge:
		'absolute -bottom-0.5 -end-0.5 grid h-[18px] w-[18px] place-items-center rounded-full border-2 border-white bg-[#f2f2f7] text-[#54656f]',
	metaAi: 'grid h-[52px] w-[52px] place-items-center overflow-hidden rounded-full bg-transparent',
	metaAiImg: 'h-[78%] w-[78%] object-contain',
	waAvatar: 'grid h-[52px] w-[52px] place-items-center rounded-full bg-[#25d366]',
	groupAvatar: 'grid h-[52px] w-[52px] place-items-center rounded-full bg-[#d0e8da] text-[#128c7e]',
	personAvatar: 'grid h-[52px] w-[52px] place-items-center rounded-full bg-[#c5e1e8] text-[#0b7a8a]',
	listRowBody: 'min-w-0 flex-1 border-b-[0.5px] border-[#e5e5ea] pb-2.5',
	listRowTop: 'flex items-center gap-2',
	listRowBottom: 'flex items-center gap-1.5',
	listName: 'min-w-0 flex-1 truncate text-[17px] font-semibold text-[#111b21]',
	listTime: 'shrink-0 text-[13px] text-[#8e8e93]',
	listTimeGreen: 'font-semibold text-[#1dab61]',
	listPreview: 'mt-0.5 flex min-w-0 flex-1 items-center gap-1 text-[15px] leading-snug text-[#667781]',
	listPreviewText: 'min-w-0 truncate',
	listTrailing: 'flex shrink-0 items-center gap-1.5',
	listMute: 'text-[#8e8e93]',
	listPin: 'text-[#8e8e93]',
	listBadge:
		'grid h-5 min-w-5 place-items-center rounded-full bg-[#1dab61] px-1.5 text-[12px] font-bold text-white',
	startChat: 'relative mt-2 border-t-8 border-[#f2f2f7] px-4 pb-4 pt-2',
	startHead: 'mb-2.5 flex items-center justify-between text-base font-bold',
	startHide: 'h-7 rounded-full border-0 bg-[#f2f2f7] px-3 text-[13px] font-semibold text-[#8e8e93]',
	startRow: 'flex items-center gap-2.5 py-2',
	startName: 'min-w-0 flex-1 text-base font-semibold',
	startChatBtn: 'h-[30px] rounded-full border-0 bg-[#d9fdd3] px-3.5 text-sm font-bold text-[#008069]',
	startX: 'border-0 bg-transparent p-1 text-[#c7c7cc]',
	metaFab:
		'pointer-events-none absolute end-3.5 bottom-2.5 z-20 grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]',
	metaFabImg: 'h-[72%] w-[72%] object-contain',
	tabbar:
		'relative z-30 grid shrink-0 grid-cols-5 border-t-[0.5px] border-[#e5e5ea] bg-[#f9f9f9] px-1 pb-0.5 pt-1.5',
	tabItem: 'relative flex flex-col items-center gap-0.5 text-[10px] font-medium text-[#8e8e93]',
	tabItemActive: 'font-semibold text-[#1c1c1e]',
	tabIconImg: 'relative block h-[26px] w-[26px] object-contain',
	tabIconActiveImg: 'opacity-100',
	tabYouAvatar: 'block h-[26px] w-[26px] rounded-full object-cover',
	tabBadge:
		'absolute -end-2.5 -top-1 grid h-[16px] min-w-[16px] place-items-center rounded-full bg-[#1dab61] px-1 text-[10px] font-bold leading-none text-white',
	tabIcon: 'relative h-[22px] w-7 rounded-md bg-current opacity-[0.18]',
	tabIconActive: 'rounded-lg bg-[#1c1c1e] opacity-100',
	homeIndicatorList: 'relative z-30 shrink-0 bg-[#f9f9f9]',
	grid2: 'grid min-w-0 grid-cols-2 gap-1.5 [&_*]:box-border [&_*]:min-w-0 [&_*]:w-full',
	stack: 'flex min-w-0 flex-col gap-1.5',
	full: 'box-border h-8 w-full max-w-full min-w-0 rounded-lg border border-[#d1d7db] bg-[#f0f2f5] px-2 text-xs text-[#111b21] outline-none dark:border-[#2a3942] dark:bg-[#0b141a] dark:text-[#e9edef]',
	json: 'box-border max-h-[min(62vh,560px)] min-h-[360px] w-full resize-y rounded-lg border border-[#d1d7db] bg-[#0b141a] p-2 font-mono text-[11px] leading-snug text-[#d1e7dd]',
	err: 'm-0 text-[11px] text-[#e35d6a]',
	help: 'text-[11px] text-[#667781]',
	helpPre: 'overflow-auto whitespace-pre-wrap rounded-lg bg-[#f0f2f5] p-2 text-[10px]',
	shareRoot: 'fixed inset-0 z-80 flex items-end justify-center',
	shareBackdrop: 'absolute inset-0 border-0 bg-[rgba(11,20,26,0.45)]',
	shareSheet:
		'relative flex max-h-[min(78vh,640px)] w-[min(480px,100%)] flex-col gap-2.5 rounded-t-[18px] bg-white px-3.5 pb-3.5 pt-2 shadow-[0_-12px_40px_rgba(0,0,0,0.2)] dark:bg-[#111b21]',
	shareHandle: 'mx-auto my-0.5 h-1 w-[42px] rounded-full bg-[#d1d7db]',
	shareHead: 'flex items-start justify-between gap-2',
	shareTitle: 'm-0 text-[15px] font-extrabold text-[#111b21] dark:text-[#e9edef]',
	shareSub: 'mt-0.5 text-xs text-[#667781]',
	shareClose: 'grid h-[30px] w-[30px] place-items-center rounded-full border-0 bg-[#f0f2f5]',
	sharePreviewBtn:
		'group relative mx-auto flex h-40 w-[88px] cursor-zoom-in items-center justify-center overflow-hidden rounded-[10px] border border-[#e9edef] bg-[#f0f2f5] p-0',
	sharePreview: 'h-full w-full object-cover',
	sharePreviewHint:
		'pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgba(0,0,0,0.55))] py-1 text-center text-[9px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100',
	shareLightbox:
		'fixed inset-0 z-90 flex items-center justify-center bg-[rgba(11,20,26,0.88)] p-4',
	shareLightboxClose:
		'absolute end-3 top-3 grid h-10 w-10 place-items-center rounded-full border-0 bg-white/15 text-white backdrop-blur-sm hover:bg-white/25',
	shareLightboxImg:
		'max-h-[min(92vh,920px)] max-w-[min(100%,420px)] rounded-none object-contain shadow-[0_20px_60px_rgba(0,0,0,0.45)]',
	shareSearch: 'flex h-9 items-center gap-2 rounded-[10px] bg-[#f0f2f5] px-2.5 text-[#667781]',
	shareSearchInput: 'flex-1 border-0 bg-transparent text-[13px] text-[#111b21] outline-none',
	shareList: 'nice-scroll flex min-h-0 flex-1 flex-col gap-0.5 overflow-auto',
	shareEmpty: 'my-4 text-center text-[13px] text-[#667781]',
	shareRow:
		'flex cursor-pointer items-center gap-2.5 rounded-[10px] border-0 bg-transparent px-1.5 py-2 text-start hover:bg-[#f0f2f5]',
	shareAvatar: 'grid h-9 w-9 place-items-center rounded-full bg-[#128c7e] text-sm font-bold text-white',
	shareName: 'min-w-0 flex-1 truncate text-[13px] font-[650] text-[#111b21] dark:text-[#e9edef]',
	shareFooter: 'flex gap-2',
	shareGhost:
		'h-9 flex-1 cursor-pointer rounded-[10px] border border-[#d1d7db] bg-white text-xs font-bold text-[#54656f]',

	/* Contact info (WhatsApp iOS) */
	ciRoot: 'flex min-h-0 flex-1 flex-col bg-[#f2f2f7]',
	ciChrome: 'shrink-0 border-b-0 bg-[#f2f2f7]',
	ciNav: 'relative flex h-11 items-center justify-center px-2',
	ciBack:
		'absolute start-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center border-0 bg-transparent p-0 text-[#1c1c1e]',
	ciNavTitle: 'm-0 max-w-[70%] truncate text-center text-[17px] font-semibold tracking-tight text-[#1c1c1e]',
	ciScroll:
		'min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-4 pb-8 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
	ciHero: 'flex shrink-0 flex-col items-center gap-1.5 px-2 pb-1 pt-2',
	ciHeroPhone: 'm-0 text-center text-[28px] font-bold leading-tight tracking-tight text-[#1c1c1e]',
	ciHeroAbout: 'm-0 text-center text-[15px] text-[#8e8e93]',
	ciActions: 'grid shrink-0 grid-cols-3 gap-2.5',
	ciAction:
		'flex flex-col items-center justify-center gap-1.5 rounded-[14px] border-0 bg-white px-2 py-3.5 text-[13px] font-medium text-[#1c1c1e] [&_svg]:shrink-0',
	ciActionIcon: 'block h-7 w-7 object-contain',
	ciCard: 'shrink-0 overflow-hidden rounded-[14px] bg-white',
	ciRow:
		'flex w-full shrink-0 cursor-default items-center gap-3.5 border-0 border-b border-[#e5e5ea] bg-transparent px-4 py-[13px] text-start last:border-b-0',
	ciRowIcon: 'grid h-[26px] w-[26px] shrink-0 place-items-center overflow-hidden text-[#1dab61]',
	ciRowIconImg: 'block h-[26px] w-[26px] object-contain',
	ciRowBody: 'min-w-0 flex-1',
	ciRowLabel: 'm-0 text-[17px] leading-snug text-[#1c1c1e]',
	ciRowSub: 'm-0 mt-0.5 text-[13px] leading-snug text-[#8e8e93]',
	ciRowValue: 'shrink-0 text-[17px] text-[#8e8e93]',
	ciChevron: 'shrink-0 text-[#c7c7cc]',
	ciGreen: 'text-[#008069]',
	ciRed: 'text-[#ff3b30]',
	ciSectionTitle: 'm-0 shrink-0 px-1 text-[17px] font-bold text-[#1c1c1e]',
	ciGroupIcon:
		'grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e5e5ea] text-[#1c1c1e]',
	ciToggle:
		'relative h-[31px] w-[51px] shrink-0 rounded-full border-0 bg-[#e9e9eb] p-0 transition-colors',
	ciToggleOn: 'bg-[#34c759]',
	ciToggleKnob:
		'absolute top-[2px] start-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform',
	ciToggleKnobOn: 'translate-x-5',
	ciToggleImg: 'block h-[31px] w-[51px] shrink-0 object-contain [mix-blend-mode:lighten]',
	ciPersonHit: 'flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-start',
};

export function segBtn(active) {
	return cn(tw.segBtn, active && tw.segBtnActive);
}

export function fileBtn(active, accent) {
	return cn(tw.fileBtn, accent && tw.btnAccent, active && tw.pasteTarget);
}
