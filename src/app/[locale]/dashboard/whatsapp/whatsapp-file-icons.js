export const WHATSAPP_FILE_ICON_SRC = '/file.png';
export const WHATSAPP_PDF_ICON_SRC = '/pdf.png';
export const WHATSAPP_EXCEL_ICON_SRC = '/excel.png';

export function whatsappFileIconSrc(extKey = '') {
	const ext = String(extKey || '').toLowerCase();
	if (ext === 'pdf') return WHATSAPP_PDF_ICON_SRC;
	if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return WHATSAPP_EXCEL_ICON_SRC;
	return WHATSAPP_FILE_ICON_SRC;
}

export function WhatsAppFileTypeIcon({ extKey, className = 'wa-file-type-image' }) {
	return (
		<img
			src={whatsappFileIconSrc(extKey)}
			alt=""
			aria-hidden="true"
			className={className}
			draggable={false}
		/>
	);
}
