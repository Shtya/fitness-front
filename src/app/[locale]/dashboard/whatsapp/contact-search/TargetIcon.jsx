'use client';

import { FileText, Globe2, Image as ImageIcon, Phone, Tag, Users } from 'lucide-react';
import {
	FaFacebook,
	FaGoogle,
	FaInstagram,
	FaLinkedin,
	FaSnapchatGhost,
	FaTelegramPlane,
	FaTiktok,
	FaWhatsapp,
	FaYoutube,
} from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

export default function TargetIcon({ id, size = 14 }) {
	const style = { width: size, height: size, flex: 'none' };
	if (id.startsWith('facebook')) return <FaFacebook style={{ ...style, color: '#1877f2' }} aria-hidden />;
	if (id.startsWith('instagram')) return <FaInstagram style={{ ...style, color: '#e1306c' }} aria-hidden />;
	if (id.startsWith('tiktok')) return <FaTiktok style={style} aria-hidden />;
	if (id.startsWith('x-')) return <FaXTwitter style={style} aria-hidden />;
	if (id.startsWith('linkedin')) return <FaLinkedin style={{ ...style, color: '#0a66c2' }} aria-hidden />;
	if (id.startsWith('youtube')) return <FaYoutube style={{ ...style, color: '#ff0000' }} aria-hidden />;
	if (id.startsWith('telegram')) return <FaTelegramPlane style={{ ...style, color: '#229ed9' }} aria-hidden />;
	if (id.startsWith('snapchat')) return <FaSnapchatGhost style={{ ...style, color: '#eab308' }} aria-hidden />;
	if (id === 'social-phone') return <Users style={style} aria-hidden />;
	if (id === 'whatsapp' || id === 'wa-mentions') return <FaWhatsapp style={{ ...style, color: '#25d366' }} aria-hidden />;
	if (id === 'classifieds') return <Tag style={style} aria-hidden />;
	if (id === 'google-files') return <FileText style={style} aria-hidden />;
	if (['lens', 'yandex-image', 'bing-image', 'tineye', 'google-images'].includes(id)) return <ImageIcon style={style} aria-hidden />;
	if (id.startsWith('google')) return <FaGoogle style={{ ...style, color: '#4285f4' }} aria-hidden />;
	if (id === 'truecaller' || id === 'syncme') return <Phone style={style} aria-hidden />;
	return <Globe2 style={style} aria-hidden />;
}
