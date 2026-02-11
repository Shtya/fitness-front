'use client';

import { useState, useRef } from 'react';
import {
	Plus,
	X,
	MoreHorizontal,
	GripVertical,
	Trash2,
	Tag,
	AlignLeft,
	Clock,
	Paperclip,
	MessageSquare,
	CheckSquare,
	Image as ImageIcon,
	Copy,
	Archive,
	Star,
	StarOff,
	Users,
	Search,
	Edit2,
	Check,
	Send,
	Reply,
	ChevronDown,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
	DndContext,
	DragOverlay,
	closestCorners,
	PointerSensor,
	useSensor,
	useSensors,
	useDroppable,
} from '@dnd-kit/core';
import {
	arrayMove,
	SortableContext,
	verticalListSortingStrategy,
	horizontalListSortingStrategy,
	useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
 
 
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

/** =========================
 *  Helpers
 *  ========================= */

const makeListId = (n) => `list-${n}`;
const makeCardId = (n) => `card-${n}`;
const makeColumnId = (listId) => `column-${listId}`;

/** Column color schemes based on list type */
const columnColorSchemes = {
	todo: {
		bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
		headerBg: 'rgba(102, 126, 234, 0.95)',
		border: '#a78bfa',
		shadow: '0 4px 20px rgba(102, 126, 234, 0.15)',
	},
	inProgress: {
		bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
		headerBg: 'rgba(240, 147, 251, 0.95)',
		border: '#f9a8d4',
		shadow: '0 4px 20px rgba(240, 147, 251, 0.15)',
	},
	review: {
		bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
		headerBg: 'rgba(79, 172, 254, 0.95)',
		border: '#60a5fa',
		shadow: '0 4px 20px rgba(79, 172, 254, 0.15)',
	},
	done: {
		bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
		headerBg: 'rgba(67, 233, 123, 0.95)',
		border: '#6ee7b7',
		shadow: '0 4px 20px rgba(67, 233, 123, 0.15)',
	},
	default: {
		bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
		headerBg: 'rgba(250, 112, 154, 0.95)',
		border: '#fdba74',
		shadow: '0 4px 20px rgba(250, 112, 154, 0.15)',
	},
};

/** Get column color based on list title */
const getColumnColor = (title) => {
	const lowerTitle = title.toLowerCase();
	if (lowerTitle.includes('todo') || lowerTitle.includes('مهام')) return columnColorSchemes.todo;
	if (lowerTitle.includes('progress') || lowerTitle.includes('تقدم')) return columnColorSchemes.inProgress;
	if (lowerTitle.includes('review') || lowerTitle.includes('مراجعة')) return columnColorSchemes.review;
	if (lowerTitle.includes('done') || lowerTitle.includes('منتهي')) return columnColorSchemes.done;
	return columnColorSchemes.default;
};

/** =========================
 *  Sortable Card (WHITE DESIGN)
 *  ========================= */
function SortableCard({ card, listId, onCardClick }) {
	const t = useTranslations('board');

	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({
			id: card.id,
			data: {
				type: 'card',
				cardId: card.id,
				listId,
			},
		});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	return (
		<div ref={setNodeRef} style={style} className="mb-3 animate-slide-in">
			<div
				{...attributes}
				{...listeners}
				onClick={(e) => {
					e.stopPropagation();
					onCardClick(card, listId);
				}}
				className="group relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all duration-200 hover:-translate-y-0.5"
			>
				<div className="p-4">
					{card.coverImage && (
						<div className="mb-3 -mx-4 -mt-4 rounded-t-xl overflow-hidden">
							<img
								src={card.coverImage}
								alt={t('card.coverAlt')}
								className="w-full h-32 object-cover"
							/>
						</div>
					)}

					{card.labels && card.labels.length > 0 && (
						<div className="flex flex-wrap gap-1.5 mb-3">
							{card.labels.map((label) => (
								<span
									key={label.id}
									className="px-2.5 py-1 rounded-md text-xs font-semibold text-white"
									style={{ backgroundColor: label.color }}
								>
									{label.name}
								</span>
							))}
						</div>
					)}

					<div className="flex items-start justify-between gap-2 mb-2">
						<h4 className="font-semibold text-gray-900 flex-1 leading-snug text-sm">
							{card.title}
						</h4>
						{card.isStarred && (
							<Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
						)}
					</div>

					{card.description && (
						<p className="text-sm text-gray-600 mb-3 line-clamp-2">{card.description}</p>
					)}

					<div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
						{card.dueDate && (
							<span
								className={`flex items-center gap-1 px-2 py-1 rounded-md ${
									new Date(card.dueDate) < new Date()
										? 'bg-red-100 text-red-700 font-semibold'
										: 'bg-gray-100 text-gray-700'
								}`}
							>
								<Clock className="w-3.5 h-3.5" />
								{new Date(card.dueDate).toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric',
								})}
							</span>
						)}
						{card.checklist && card.checklist.length > 0 && (
							<span
								className={`flex items-center gap-1 px-2 py-1 rounded-md ${
									card.checklist.every((c) => c.completed)
										? 'bg-green-100 text-green-700 font-semibold'
										: 'bg-gray-100 text-gray-700'
								}`}
							>
								<CheckSquare className="w-3.5 h-3.5" />
								{card.checklist.filter((c) => c.completed).length}/{card.checklist.length}
							</span>
						)}
						{card.description && (
							<span className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
								<AlignLeft className="w-3.5 h-3.5" />
							</span>
						)}
						{card.comments && card.comments.length > 0 && (
							<span className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
								<MessageSquare className="w-3.5 h-3.5" />
								{card.comments.length}
							</span>
						)}
						{card.attachments && card.attachments.length > 0 && (
							<span className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
								<Paperclip className="w-3.5 h-3.5" />
								{card.attachments.length}
							</span>
						)}
					</div>

					{card.members && card.members.length > 0 && (
						<div className="flex items-center gap-1 mt-3 -space-x-2">
							{card.members.slice(0, 3).map((member, idx) => (
								<div
									key={idx}
									className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary-600 border-2 border-white flex items-center justify-center text-white font-semibold text-xs shadow-sm"
									title={member.name}
								>
									{member.avatar ? (
										<img
											src={member.avatar}
											alt={member.name}
											className="w-full h-full rounded-full object-cover"
										/>
									) : (
										member.initials
									)}
								</div>
							))}
							{card.members.length > 3 && (
								<div className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-700 font-semibold text-xs shadow-sm">
									+{card.members.length - 3}
								</div>
							)}
						</div>
					)}
				</div>

				<div className="absolute top-2 ltr:left-2 rtl:right-2 opacity-0 group-hover:opacity-100 transition-opacity">
					<div className="p-1 bg-gray-100 rounded">
						<GripVertical className="w-3.5 h-3.5 text-gray-500" />
					</div>
				</div>
			</div>
		</div>
	);
}

 
function CardsDroppableArea({ listId, children }) {
	const columnId = makeColumnId(listId);
	const { setNodeRef, isOver } = useDroppable({
		id: columnId,
		data: { type: 'column', listId },
	});

	return (
		<div
			ref={setNodeRef}
			className={`p-3 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin rounded-b-xl transition-all ${
				isOver ? 'bg-primary/5 ring-2 ring-primary/20' : ''
			}`}
		>
			{children}
		</div>
	);
}
 
function SortableList({
	list,
	cards,
	onAddCard,
	onCardClick,
	onDeleteList,
	onUpdateList,
}) {
	const t = useTranslations('board');

	const sortableListId = `sortable-${list.id}`;

	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({
			id: sortableListId,
			data: { type: 'list', listId: list.id },
		});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	const [isAddingCard, setIsAddingCard] = useState(false);
	const [newCardTitle, setNewCardTitle] = useState('');
	const [cardImages, setCardImages] = useState([]);
	const [showListMenu, setShowListMenu] = useState(false);
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [listTitle, setListTitle] = useState(list.title);
	const textareaRef = useRef(null);
	const fileInputRef = useRef(null);

	const columnColors = getColumnColor(list.title);

	const handlePasteImage = (e) => {
		const items = e.clipboardData?.items;
		if (!items) return;
		for (let i = 0; i < items.length; i++) {
			if (items[i].type.indexOf('image') !== -1) {
				const blob = items[i].getAsFile();
				const reader = new FileReader();
				reader.onload = (event) => {
					setCardImages((prev) => [...prev, event.target.result]);
				};
				reader.readAsDataURL(blob);
			}
		}
	};

	const handleImageUpload = (e) => {
		const files = e.target.files;
		if (!files) return;
		Array.from(files).forEach((file) => {
			const reader = new FileReader();
			reader.onload = (event) => {
				setCardImages((prev) => [...prev, event.target.result]);
			};
			reader.readAsDataURL(file);
		});
	};

	const handleAddCard = () => {
		if (newCardTitle.trim() || cardImages.length > 0) {
			onAddCard(list.id, newCardTitle.trim() || t('list.untitledCard'), cardImages);
			setNewCardTitle('');
			setCardImages([]);
			setIsAddingCard(false);
		}
	};

	const handleSaveTitle = () => {
		if (listTitle.trim()) {
			onUpdateList(list.id, { title: listTitle });
		} else {
			setListTitle(list.title);
		}
		setIsEditingTitle(false);
	};

	return (
		<div ref={setNodeRef} style={style} className="flex-shrink-0 w-80">
			<div 
				className="bg-gray-50 rounded-xl shadow-sm overflow-hidden h-fit border border-gray-200"
			>
				{/* Header with gradient */}
				<div 
					className="p-3 backdrop-blur-sm"
					style={{ 
						background: columnColors.headerBg,
					}}
				>
					<div className="flex items-center justify-between group">
						<div className="flex items-center gap-2 flex-1">
							<div
								{...attributes}
								{...listeners}
								className="cursor-grab active:cursor-grabbing p-1 hover:bg-white/20 rounded transition-colors"
							>
								<GripVertical className="w-4 h-4 text-white/90" />
							</div>

							{isEditingTitle ? (
								<input
									type="text"
									value={listTitle}
									onChange={(e) => setListTitle(e.target.value)}
									onBlur={handleSaveTitle}
									onKeyDown={(e) => {
										if (e.key === 'Enter') handleSaveTitle();
									}}
									className="font-semibold text-white flex-1 text-sm bg-white/20 backdrop-blur-sm border border-white/40 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white/60 placeholder-white/60"
									autoFocus
								/>
							) : (
								<h3
									className="font-semibold text-white flex-1 text-sm cursor-pointer hover:bg-white/10 px-2 py-1 rounded transition-colors"
									onClick={() => setIsEditingTitle(true)}
								>
									{list.title}
								</h3>
							)}

							<span className="bg-white/30 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full font-semibold">
								{cards.length}
							</span>
						</div>

						<div className="relative">
							<button
								onClick={() => setShowListMenu(!showListMenu)}
								className="p-1.5 hover:bg-white/20 rounded transition-colors"
							>
								<MoreHorizontal className="w-4 h-4 text-white/90" />
							</button>

							{showListMenu && (
								<>
									<div className="fixed inset-0 z-10" onClick={() => setShowListMenu(false)} />
									<div className="absolute ltr:right-0 rtl:left-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20 w-48">
										<button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors text-gray-700">
											<Archive className="w-4 h-4" />
											<span className="font-medium">{t('list.archive')}</span>
										</button>
										<button
											onClick={() => {
												onDeleteList(list.id);
												setShowListMenu(false);
											}}
											className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600 transition-colors"
										>
											<Trash2 className="w-4 h-4" />
											<span className="font-medium">{t('list.delete')}</span>
										</button>
									</div>
								</>
							)}
						</div>
					</div>
				</div>

				{/* Cards Droppable Area */}
				<div className="bg-white">
					<CardsDroppableArea listId={list.id}>
						<SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
							{cards.map((card) => (
								<SortableCard key={card.id} card={card} listId={list.id} onCardClick={onCardClick} />
							))}
						</SortableContext>

						{/* Add Card */}
						{isAddingCard ? (
							<div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 mt-2">
								{cardImages.length > 0 && (
									<div className="mb-3 space-y-2">
										{cardImages.map((img, idx) => (
											<div key={idx} className="relative rounded-lg overflow-hidden">
												<img src={img} alt={`Preview ${idx + 1}`} className="w-full h-32 object-cover" />
												<button
													onClick={() => setCardImages((prev) => prev.filter((_, i) => i !== idx))}
													className="absolute top-2 ltr:right-2 rtl:left-2 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white shadow-lg transition-colors"
												>
													<X className="w-3.5 h-3.5" />
												</button>
											</div>
										))}
									</div>
								)}

								<textarea
									ref={textareaRef}
									value={newCardTitle}
									onChange={(e) => setNewCardTitle(e.target.value)}
									onPaste={handlePasteImage}
									onKeyDown={(e) => {
										if (e.key === 'Enter' && !e.shiftKey) {
											e.preventDefault();
											handleAddCard();
										}
									}}
									placeholder={t('list.cardTitlePlaceholder')}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm resize-none transition-all"
									rows="2"
									autoFocus
								/>

								<div className="flex items-center gap-2 mt-2">
									<button
										onClick={handleAddCard}
										className="px-4 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-all"
									>
										{t('list.addCard')}
									</button>

									<button
										onClick={() => fileInputRef.current?.click()}
										className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
										title={t('list.uploadImage')}
									>
										<ImageIcon className="w-4 h-4 text-gray-600" />
									</button>
									<input
										ref={fileInputRef}
										type="file"
										accept="image/*"
										multiple
										onChange={handleImageUpload}
										className="hidden"
									/>

									<button
										onClick={() => {
											setIsAddingCard(false);
											setNewCardTitle('');
											setCardImages([]);
										}}
										className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors ltr:ml-auto rtl:mr-auto"
									>
										<X className="w-4 h-4 text-gray-600" />
									</button>
								</div>
							</div>
						) : (
							<button
								onClick={() => setIsAddingCard(true)}
								className="w-full p-2.5 text-left text-gray-600 hover:bg-gray-50 rounded-lg transition-all flex items-center gap-2 group text-sm font-medium"
							>
								<Plus className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
								<span className="group-hover:text-primary transition-colors">
									{t('list.addCardButton')}
								</span>
							</button>
						)}
					</CardsDroppableArea>
				</div>
			</div>
		</div>
	);
}

/** =========================
 *  Main Board / Todos Tab
 *  ========================= */
export default function BoardTab() {
	const t = useTranslations('board');

	const [lists, setLists] = useState([
		{ id: makeListId(1), title: 'To Do' },
		{ id: makeListId(2), title: 'In Progress' },
		{ id: makeListId(3), title: 'Review' },
		{ id: makeListId(4), title: 'Done' },
	]);

	const [cards, setCards] = useState([
		{
			id: makeCardId(1),
			listId: makeListId(1),
			title: 'Design new landing page',
			description: 'Create mockups and wireframes for the new marketing site',
			dueDate: '2024-02-15',
			labels: [
				{ id: 'l1', name: 'Design', color: '#7c3aed' },
				{ id: 'l2', name: 'High Priority', color: '#ef4444' },
			],
			members: [{ name: 'Sarah Chen', initials: 'SC' }],
			checklist: [
				{ id: '1', text: 'Research competitors', completed: true },
				{ id: '2', text: 'Create wireframes', completed: false },
			],
			comments: [],
			attachments: [],
			isStarred: true,
		},
		{
			id: makeCardId(2),
			listId: makeListId(1),
			title: 'Update documentation',
			description: 'Add API examples and improve getting started guide',
			dueDate: '2024-02-20',
			labels: [{ id: 'l3', name: 'Documentation', color: '#3b82f6' }],
			comments: [],
			attachments: [],
		},
		{
			id: makeCardId(3),
			listId: makeListId(2),
			title: 'Implement authentication',
			description: 'OAuth integration with Google and GitHub',
			labels: [
				{ id: 'l4', name: 'Backend', color: '#10b981' },
				{ id: 'l5', name: 'Security', color: '#f59e0b' },
			],
			members: [{ name: 'Alex Kumar', initials: 'AK' }],
			checklist: [
				{ id: '1', text: 'Setup OAuth providers', completed: true },
				{ id: '2', text: 'Implement JWT tokens', completed: false },
			],
			comments: [],
			attachments: [],
		},
		{
			id: makeCardId(4),
			listId: makeListId(4),
			title: 'Setup project repository',
			description: 'Initialize Git repo with proper structure',
			labels: [{ id: 'l6', name: 'DevOps', color: '#8b5cf6' }],
			members: [{ name: 'Jordan Lee', initials: 'JL' }],
			comments: [],
			attachments: [],
		},
	]);

	const [activeCardId, setActiveCardId] = useState(null);
	const [activeListSortableId, setActiveListSortableId] = useState(null);

	const [selectedCard, setSelectedCard] = useState(null);

	const [isAddingList, setIsAddingList] = useState(false);
	const [newListTitle, setNewListTitle] = useState('');

	const [searchTerm, setSearchTerm] = useState('');
	const [filterLabel, setFilterLabel] = useState('all');
	const [filterMember, setFilterMember] = useState('all');
	const [sortBy, setSortBy] = useState('none');

	const [newComment, setNewComment] = useState('');
	const [replyTo, setReplyTo] = useState(null);
	const [editingChecklistId, setEditingChecklistId] = useState(null);
	const [checklistText, setChecklistText] = useState('');

	const fileInputRef = useRef(null);
	const coverInputRef = useRef(null);
	const attachmentInputRef = useRef(null);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 8 },
		})
	);

	const getFilteredCards = (listId) => {
		let filtered = cards.filter((c) => c.listId === listId);

		if (searchTerm) {
			const s = searchTerm.toLowerCase();
			filtered = filtered.filter(
				(c) =>
					c.title.toLowerCase().includes(s) ||
					(c.description || '').toLowerCase().includes(s)
			);
		}

		if (filterLabel && filterLabel !== 'all') {
			filtered = filtered.filter((c) => c.labels?.some((l) => l.id === filterLabel));
		}

		if (filterMember && filterMember !== 'all') {
			filtered = filtered.filter((c) => c.members?.some((m) => m.name === filterMember));
		}

		if (sortBy === 'dueDate') {
			filtered = [...filtered].sort((a, b) => {
				if (!a.dueDate) return 1;
				if (!b.dueDate) return -1;
				return new Date(a.dueDate) - new Date(b.dueDate);
			});
		} else if (sortBy === 'title') {
			filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
		}

		return filtered;
	};

	const handleDragStart = (event) => {
		const { active } = event;
		const data = active.data.current;

		if (data?.type === 'card') {
			setActiveCardId(active.id);
		} else if (data?.type === 'list') {
			setActiveListSortableId(active.id);
		}
	};

	const handleDragOver = (event) => {
		const { active, over } = event;
		if (!over) return;

		const activeData = active.data.current;
		const overData = over.data.current;

		// Only handle card movements
		if (activeData?.type !== 'card') return;

		const activeCard = cards.find((c) => c.id === active.id);
		if (!activeCard) return;

		// Handle dropping over column
		if (overData?.type === 'column') {
			const overListId = overData.listId;
			// IMPORTANT: Only update if actually changing columns
			if (activeCard.listId !== overListId) {
				setCards((prev) =>
					prev.map((c) => (c.id === active.id ? { ...c, listId: overListId } : c))
				);
			}
			return;
		}

		// Handle dropping over another card
		if (overData?.type === 'card') {
			const overCard = cards.find((c) => c.id === over.id);
			if (!overCard) return;
			
			const overListId = overCard.listId;
			// IMPORTANT: Only update if actually changing columns
			if (activeCard.listId !== overListId) {
				setCards((prev) =>
					prev.map((c) => (c.id === active.id ? { ...c, listId: overListId } : c))
				);
			}
		}
	};

	const handleDragEnd = (event) => {
		const { active, over } = event;

		setActiveCardId(null);
		setActiveListSortableId(null);

		if (!over) return;

		const activeData = active.data.current;
		const overData = over.data.current;

		// LIST reorder
		if (activeData?.type === 'list' && overData?.type === 'list') {
			const activeListId = activeData.listId;
			const overListId = overData.listId;

			const activeIndex = lists.findIndex((l) => l.id === activeListId);
			const overIndex = lists.findIndex((l) => l.id === overListId);

			if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
				setLists((prev) => arrayMove(prev, activeIndex, overIndex));
			}
			return;
		}

		// CARD reorder
		if (activeData?.type === 'card') {
			const activeCard = cards.find((c) => c.id === active.id);
			if (!activeCard) return;

			if (overData?.type === 'card') {
				const overCard = cards.find((c) => c.id === over.id);
				if (!overCard) return;

				if (activeCard.listId === overCard.listId) {
					const listId = activeCard.listId;
					const listCards = cards.filter((c) => c.listId === listId);
					const otherCards = cards.filter((c) => c.listId !== listId);

					const oldIndex = listCards.findIndex((c) => c.id === active.id);
					const newIndex = listCards.findIndex((c) => c.id === over.id);

					if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
						const reordered = arrayMove(listCards, oldIndex, newIndex);
						setCards([...otherCards, ...reordered]);
					}
				}
				return;
			}

			if (overData?.type === 'column') {
				return;
			}
		}
	};

	const handleAddList = () => {
		if (newListTitle.trim()) {
			const newList = {
				id: `list-${Date.now()}`,
				title: newListTitle.trim(),
			};
			setLists((prev) => [...prev, newList]);
			setNewListTitle('');
			setIsAddingList(false);
		}
	};

	const handleAddCard = (listId, title, images = []) => {
		const newCard = {
			id: `card-${Date.now()}`,
			listId,
			title,
			description: '',
			labels: [],
			members: [],
			checklist: [],
			comments: [],
			attachments: images.length > 0 ? images.map((img, idx) => ({ id: `att-${Date.now()}-${idx}`, url: img, name: `Image ${idx + 1}` })) : [],
			coverImage: images.length > 0 ? images[0] : null,
		};
		setCards((prev) => [...prev, newCard]);
	};

	const handleDeleteList = (listId) => {
		setLists((prev) => prev.filter((l) => l.id !== listId));
		setCards((prev) => prev.filter((c) => c.listId !== listId));
	};

	const handleUpdateList = (listId, updates) => {
		setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, ...updates } : l)));
	};

	const handleCardClick = (card, listId) => {
		setSelectedCard({ card, listId });
	};

	const handleUpdateCard = (updates) => {
		setCards((prev) =>
			prev.map((c) => (selectedCard && c.id === selectedCard.card.id ? { ...c, ...updates } : c))
		);
		setSelectedCard((prev) =>
			prev ? { ...prev, card: { ...prev.card, ...updates } } : prev
		);
	};

	const handleDeleteCard = () => {
		setCards((prev) => prev.filter((c) => c.id !== selectedCard.card.id));
		setSelectedCard(null);
	};

	const handleToggleChecklist = (checklistId) => {
		const updatedChecklist = (selectedCard.card.checklist || []).map((item) =>
			item.id === checklistId ? { ...item, completed: !item.completed } : item
		);
		handleUpdateCard({ checklist: updatedChecklist });
	};

	const handleAddChecklistItem = () => {
		const newItem = {
			id: `${Date.now()}`,
			text: t('modal.newChecklistItem'),
			completed: false,
		};
		const updatedChecklist = [...(selectedCard.card.checklist || []), newItem];
		handleUpdateCard({ checklist: updatedChecklist });
		setEditingChecklistId(newItem.id);
		setChecklistText(newItem.text);
	};

	const handleEditChecklistItem = (itemId, newText) => {
		const updatedChecklist = (selectedCard.card.checklist || []).map((item) =>
			item.id === itemId ? { ...item, text: newText } : item
		);
		handleUpdateCard({ checklist: updatedChecklist });
		setEditingChecklistId(null);
		setChecklistText('');
	};

	const handleDeleteChecklistItem = (itemId) => {
		const updatedChecklist = (selectedCard.card.checklist || []).filter((item) => item.id !== itemId);
		handleUpdateCard({ checklist: updatedChecklist });
	};

	const handleImagePaste = (e) => {
		const items = e.clipboardData?.items;
		if (!items) return;
		for (let i = 0; i < items.length; i++) {
			if (items[i].type.indexOf('image') !== -1) {
				const blob = items[i].getAsFile();
				const reader = new FileReader();
				reader.onload = (event) => {
					if (selectedCard) handleUpdateCard({ coverImage: event.target.result });
				};
				reader.readAsDataURL(blob);
			}
		}
	};

	const handleCoverUpload = (e) => {
		const file = e.target.files?.[0];
		if (file && selectedCard) {
			const reader = new FileReader();
			reader.onload = (event) => handleUpdateCard({ coverImage: event.target.result });
			reader.readAsDataURL(file);
		}
	};

	const handleAttachmentUpload = (e) => {
		const files = e.target.files;
		if (!files || !selectedCard) return;
		
		const newAttachments = [];
		Array.from(files).forEach((file) => {
			const reader = new FileReader();
			reader.onload = (event) => {
				const attachment = {
					id: `att-${Date.now()}-${Math.random()}`,
					url: event.target.result,
					name: file.name,
					type: file.type,
					size: file.size,
				};
				newAttachments.push(attachment);
				
				if (newAttachments.length === files.length) {
					handleUpdateCard({ 
						attachments: [...(selectedCard.card.attachments || []), ...newAttachments] 
					});
				}
			};
			reader.readAsDataURL(file);
		});
	};

	const handleDeleteAttachment = (attachmentId) => {
		const updatedAttachments = (selectedCard.card.attachments || []).filter(
			(att) => att.id !== attachmentId
		);
		handleUpdateCard({ attachments: updatedAttachments });
	};

	const handleAddComment = () => {
		if (!newComment.trim()) return;
		
		const comment = {
			id: `comment-${Date.now()}`,
			text: newComment,
			author: 'Current User',
			timestamp: new Date().toISOString(),
			replies: [],
			replyTo: replyTo,
		};

		if (replyTo) {
			const updatedComments = (selectedCard.card.comments || []).map((c) => {
				if (c.id === replyTo) {
					return { ...c, replies: [...(c.replies || []), comment] };
				}
				return c;
			});
			handleUpdateCard({ comments: updatedComments });
		} else {
			handleUpdateCard({ comments: [...(selectedCard.card.comments || []), comment] });
		}

		setNewComment('');
		setReplyTo(null);
	};

	const handleCopyCard = () => {
		if (!selectedCard) return;
		
		const copiedCard = {
			...selectedCard.card,
			id: `card-${Date.now()}`,
			title: `${selectedCard.card.title} (Copy)`,
		};
		
		setCards((prev) => [...prev, copiedCard]);
		setSelectedCard({ card: copiedCard, listId: selectedCard.listId });
	};

	const handleArchiveCard = () => {
		if (!selectedCard) return;
		handleUpdateCard({ archived: true });
		setSelectedCard(null);
	};

	const predefinedLabels = [
		{ id: 'l1', name: 'Design', color: '#7c3aed' },
		{ id: 'l2', name: 'High Priority', color: '#ef4444' },
		{ id: 'l3', name: 'Documentation', color: '#3b82f6' },
		{ id: 'l4', name: 'Backend', color: '#10b981' },
		{ id: 'l5', name: 'Security', color: '#f59e0b' },
		{ id: 'l6', name: 'DevOps', color: '#8b5cf6' },
		{ id: 'l7', name: 'Bug', color: '#dc2626' },
		{ id: 'l8', name: 'Feature', color: '#06b6d4' },
	];

	const handleToggleLabel = (label) => {
		const hasLabel = selectedCard.card.labels?.some((l) => l.id === label.id);
		const updatedLabels = hasLabel
			? selectedCard.card.labels.filter((l) => l.id !== label.id)
			: [...(selectedCard.card.labels || []), label];
		handleUpdateCard({ labels: updatedLabels });
	};

	const allLabels = [...new Set(cards.flatMap((c) => (c.labels || []).map((l) => l.id)))]
		.map((id) => cards.flatMap((c) => c.labels || []).find((l) => l.id === id))
		.filter(Boolean);

	const allMembers = [...new Set(cards.flatMap((c) => (c.members || []).map((m) => m.name)))]
		.map((name) => cards.flatMap((c) => c.members || []).find((m) => m.name === name))
		.filter(Boolean);

	const activeCard = activeCardId ? cards.find((c) => c.id === activeCardId) : null;
	const activeList =
		activeListSortableId && activeListSortableId.startsWith('sortable-')
			? lists.find((l) => `sortable-${l.id}` === activeListSortableId)
			: null;

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
			{/* Improved Filters Bar */}
			<div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
				<div className="max-w-[2000px] mx-auto px-6 py-4">
					<div className="flex items-center gap-3 flex-wrap">
						{/* Search */}
						<div className="relative flex-1 min-w-[200px] max-w-sm">
							<Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
							<input
								type="text"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								placeholder={t('filters.search')}
								className="w-full ltr:pl-9 rtl:pr-9 ltr:pr-4 rtl:pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm transition-all"
							/>
						</div>

						{/* Label Filter - Shadcn Select */}
						<Select value={filterLabel} onValueChange={setFilterLabel}>
							<SelectTrigger className="w-[180px] h-9">
								<SelectValue placeholder={t('filters.selectLabel')} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">{t('filters.allLabels')}</SelectItem>
								{allLabels.map((label) => (
									<SelectItem key={label.id} value={label.id}>
										<div className="flex items-center gap-2">
											<div
												className="w-3 h-3 rounded-sm"
												style={{ backgroundColor: label.color }}
											/>
											{label.name}
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						{/* Member Filter - Shadcn Select */}
						<Select value={filterMember} onValueChange={setFilterMember}>
							<SelectTrigger className="w-[180px] h-9">
								<SelectValue placeholder={t('filters.selectMember')} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">{t('filters.allMembers')}</SelectItem>
								{allMembers.map((member) => (
									<SelectItem key={member.name} value={member.name}>
										<div className="flex items-center gap-2">
											<div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-secondary-600 flex items-center justify-center text-white font-semibold text-xs">
												{member.initials}
											</div>
											{member.name}
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						{/* Sort - Shadcn Select */}
						<Select value={sortBy} onValueChange={setSortBy}>
							<SelectTrigger className="w-[160px] h-9">
								<SelectValue placeholder={t('filters.sortBy')} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">{t('filters.sortNone')}</SelectItem>
								<SelectItem value="title">{t('filters.sortTitle')}</SelectItem>
								<SelectItem value="dueDate">{t('filters.sortDueDate')}</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>

			<DndContext
				sensors={sensors}
				collisionDetection={closestCorners}
				onDragStart={handleDragStart}
				onDragOver={handleDragOver}
				onDragEnd={handleDragEnd}
			>
				{/* Board with bottom scrollbar */}
				<div className="max-w-[2000px] mx-auto px-6 py-6">
					<div className="flex gap-4 overflow-x-auto pb-4 scrollbar-visible">
						<SortableContext
							items={lists.map((l) => `sortable-${l.id}`)}
							strategy={horizontalListSortingStrategy}
						>
							{lists.map((list) => (
								<SortableList
									key={list.id}
									list={list}
									cards={getFilteredCards(list.id)}
									onAddCard={handleAddCard}
									onCardClick={handleCardClick}
									onDeleteList={handleDeleteList}
									onUpdateList={handleUpdateList}
								/>
							))}
						</SortableContext>

						{/* Add List */}
						{isAddingList ? (
							<div className="flex-shrink-0 w-80">
								<div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200">
									<input
										type="text"
										value={newListTitle}
										onChange={(e) => setNewListTitle(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter') handleAddList();
										}}
										placeholder={t('board.listTitlePlaceholder')}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm font-medium"
										autoFocus
									/>
									<div className="flex gap-2 mt-2">
										<button
											onClick={handleAddList}
											className="px-4 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-all"
										>
											{t('board.addList')}
										</button>
										<button
											onClick={() => {
												setIsAddingList(false);
												setNewListTitle('');
											}}
											className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
										>
											<X className="w-4 h-4 text-gray-600" />
										</button>
									</div>
								</div>
							</div>
						) : (
							<button
								onClick={() => setIsAddingList(true)}
								className="flex-shrink-0 w-80 p-3 bg-white hover:bg-gray-50 rounded-xl transition-all flex items-center gap-2 group border border-gray-200 shadow-sm text-sm font-medium text-gray-600"
							>
								<Plus className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
								<span className="group-hover:text-primary transition-colors">
									{t('board.addListButton')}
								</span>
							</button>
						)}
					</div>
				</div>

				<DragOverlay>
					{activeCard ? (
						<div className="w-80 opacity-90">
							<div className="bg-white rounded-xl border-2 border-primary shadow-lg">
								<div className="p-4">
									<h4 className="font-semibold text-gray-900">{activeCard.title}</h4>
								</div>
							</div>
						</div>
					) : activeList ? (
						<div className="bg-white rounded-xl p-3 shadow-lg border-2 border-primary w-80 opacity-90">
							<h3 className="font-semibold text-gray-800">{activeList.title}</h3>
						</div>
					) : null}
				</DragOverlay>
			</DndContext>

			{/* Card Detail Sidebar */}
			{selectedCard && (
				<div
					className="fixed inset-0 bg-black/40 z-[10000000] flex items-start justify-end"
					onClick={() => setSelectedCard(null)}
				>
					<div
						className="ltr:animate-slide-in-right rtl:animate-slide-in-left bg-white h-full w-full max-w-2xl overflow-y-auto shadow-2xl"
						onClick={(e) => e.stopPropagation()}
						onPaste={handleImagePaste}
					>
						{selectedCard.card.coverImage && (
							<div className="relative h-48 bg-gray-100">
								<img
									src={selectedCard.card.coverImage}
									alt={t('modal.coverAlt')}
									className="w-full h-full object-cover"
								/>
								<button
									onClick={() => handleUpdateCard({ coverImage: null })}
									className="absolute top-3 ltr:right-3 rtl:left-3 p-1.5 bg-white/90 hover:bg-white rounded-lg transition-colors shadow-sm"
								>
									<X className="w-4 h-4 text-gray-700" />
								</button>
							</div>
						)}

						<div className="p-6">
							<div className="flex items-start gap-3 mb-6">
								<div className="flex-1">
									<div className="flex items-center gap-2 mb-2">
										<AlignLeft className="w-5 h-5 text-gray-600" />
										<input
											type="text"
											value={selectedCard.card.title}
											onChange={(e) => handleUpdateCard({ title: e.target.value })}
											className="text-2xl font-bold text-gray-900 flex-1 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary/20 rounded px-1 -ml-1"
										/>
										<button
											onClick={() => handleUpdateCard({ isStarred: !selectedCard.card.isStarred })}
											className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
										>
											{selectedCard.card.isStarred ? (
												<Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
											) : (
												<StarOff className="w-5 h-5 text-gray-400" />
											)}
										</button>
									</div>
									<div className="text-sm text-gray-600 ltr:ml-7 rtl:mr-7">
										{t('modal.inList')}{' '}
										<span className="font-semibold">{lists.find((l) => l.id === selectedCard.listId)?.title}</span>
									</div>
								</div>
								<button onClick={() => setSelectedCard(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
									<X className="w-5 h-5 text-gray-600" />
								</button>
							</div>

							<div className="grid grid-cols-3 gap-6">
								<div className="col-span-2 space-y-6">
									{/* Labels */}
									{selectedCard.card.labels && selectedCard.card.labels.length > 0 && (
										<div>
											<h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
												<Tag className="w-4 h-4" />
												{t('modal.labels')}
											</h3>
											<div className="flex flex-wrap gap-2">
												{selectedCard.card.labels.map((label) => (
													<span
														key={label.id}
														className="px-3 py-1.5 rounded-lg text-white font-semibold text-xs shadow-sm"
														style={{ backgroundColor: label.color }}
													>
														{label.name}
													</span>
												))}
											</div>
										</div>
									)}

									{/* Members */}
									{selectedCard.card.members && selectedCard.card.members.length > 0 && (
										<div>
											<h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
												<Users className="w-4 h-4" />
												{t('modal.members')}
											</h3>
											<div className="flex flex-wrap gap-2">
												{selectedCard.card.members.map((member, idx) => (
													<div key={idx} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
														<div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary-600 flex items-center justify-center text-white font-semibold text-xs shadow-sm">
															{member.avatar ? (
																<img src={member.avatar} alt={member.name} className="w-full h-full rounded-full object-cover" />
															) : (
																member.initials
															)}
														</div>
														<span className="text-sm font-medium text-gray-700">{member.name}</span>
													</div>
												))}
											</div>
										</div>
									)}

									{/* Description */}
									<div>
										<h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
											<AlignLeft className="w-4 h-4" />
											{t('modal.description')}
										</h3>
										<textarea
											value={selectedCard.card.description || ''}
											onChange={(e) => handleUpdateCard({ description: e.target.value })}
											placeholder={t('modal.descriptionPlaceholder')}
											className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm resize-none min-h-[100px]"
										/>
									</div>

									{/* Attachments */}
									{selectedCard.card.attachments && selectedCard.card.attachments.length > 0 && (
										<div>
											<h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
												<Paperclip className="w-4 h-4" />
												{t('modal.attachments')} ({selectedCard.card.attachments.length})
											</h3>
											<div className="space-y-2">
												{selectedCard.card.attachments.map((attachment) => (
													<div key={attachment.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-200 group hover:bg-gray-100 transition-colors">
														{attachment.type?.startsWith('image/') ? (
															<img src={attachment.url} alt={attachment.name} className="w-12 h-12 object-cover rounded" />
														) : (
															<div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
																<Paperclip className="w-5 h-5 text-gray-400" />
															</div>
														)}
														<div className="flex-1 min-w-0">
															<p className="font-medium text-sm text-gray-900 truncate">{attachment.name}</p>
															{attachment.size && (
																<p className="text-xs text-gray-500">
																	{(attachment.size / 1024).toFixed(1)} KB
																</p>
															)}
														</div>
														<button
															onClick={() => handleDeleteAttachment(attachment.id)}
															className="p-1.5 hover:bg-red-100 rounded transition-colors opacity-0 group-hover:opacity-100"
														>
															<Trash2 className="w-4 h-4 text-red-600" />
														</button>
													</div>
												))}
											</div>
										</div>
									)}

									{/* Checklist with Shadcn Checkbox */}
									<div>
										<div className="flex items-center justify-between mb-2">
											<h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
												<CheckSquare className="w-4 h-4" />
												{t('modal.checklist')}
											</h3>
											<button
												onClick={handleAddChecklistItem}
												className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium transition-colors"
											>
												{t('modal.addItem')}
											</button>
										</div>
										{selectedCard.card.checklist && selectedCard.card.checklist.length > 0 && (
											<div className="space-y-2">
												{selectedCard.card.checklist.map((item) => (
													<div
														key={item.id}
														className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors group border border-gray-100"
													>
														<Checkbox
															checked={item.completed}
															onCheckedChange={() => handleToggleChecklist(item.id)}
															className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
														/>
														{editingChecklistId === item.id ? (
															<input
																type="text"
																value={checklistText}
																onChange={(e) => setChecklistText(e.target.value)}
																onBlur={() => handleEditChecklistItem(item.id, checklistText)}
																onKeyDown={(e) => {
																	if (e.key === 'Enter') handleEditChecklistItem(item.id, checklistText);
																	if (e.key === 'Escape') {
																		setEditingChecklistId(null);
																		setChecklistText('');
																	}
																}}
																className="flex-1 px-2 py-1 border-2 border-primary rounded focus:outline-none"
																autoFocus
															/>
														) : (
															<span className={`flex-1 text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-700 font-medium'}`}>
																{item.text}
															</span>
														)}
														<div className="opacity-0 group-hover:opacity-100 flex gap-1">
															<button
																onClick={(e) => {
																	e.stopPropagation();
																	setEditingChecklistId(item.id);
																	setChecklistText(item.text);
																}}
																className="p-1 hover:bg-gray-200 rounded transition-colors"
															>
																<Edit2 className="w-3.5 h-3.5 text-gray-600" />
															</button>
															<button
																onClick={(e) => {
																	e.stopPropagation();
																	handleDeleteChecklistItem(item.id);
																}}
																className="p-1 hover:bg-red-100 rounded transition-colors"
															>
																<Trash2 className="w-3.5 h-3.5 text-red-600" />
															</button>
														</div>
													</div>
												))}
											</div>
										)}
									</div>

									{/* Comments */}
									<div>
										<h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
											<MessageSquare className="w-4 h-4" />
											{t('modal.comments')} ({selectedCard.card.comments?.length || 0})
										</h3>
										
										{/* Comment Input */}
										<div className="mb-4">
											{replyTo && (
												<div className="mb-2 px-3 py-2 bg-blue-50 rounded-lg flex items-center justify-between text-sm">
													<span className="text-blue-700">
														<Reply className="w-3.5 h-3.5 inline ltr:mr-1 rtl:ml-1" />
														{t('modal.replyingTo')}
													</span>
													<button onClick={() => setReplyTo(null)} className="text-blue-700 hover:text-blue-900">
														<X className="w-4 h-4" />
													</button>
												</div>
											)}
											<div className="flex gap-2">
												<textarea
													value={newComment}
													onChange={(e) => setNewComment(e.target.value)}
													placeholder={t('modal.addComment')}
													className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm resize-none"
													rows="2"
												/>
												<button
													onClick={handleAddComment}
													disabled={!newComment.trim()}
													className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
												>
													<Send className="w-4 h-4" />
												</button>
											</div>
										</div>

										{/* Comments List */}
										<div className="space-y-3">
											{selectedCard.card.comments?.map((comment) => (
												<div key={comment.id} className="space-y-2">
													<div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
														<div className="flex items-start justify-between mb-2">
															<div className="flex items-center gap-2">
																<div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary-600 flex items-center justify-center text-white font-semibold text-xs">
																	{comment.author.charAt(0)}
																</div>
																<div>
																	<p className="font-semibold text-sm text-gray-900">{comment.author}</p>
																	<p className="text-xs text-gray-500">
																		{new Date(comment.timestamp).toLocaleString()}
																	</p>
																</div>
															</div>
															<button
																onClick={() => setReplyTo(comment.id)}
																className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
															>
																<Reply className="w-3.5 h-3.5" />
																{t('modal.reply')}
															</button>
														</div>
														<p className="text-gray-700 text-sm">{comment.text}</p>
													</div>

													{/* Replies */}
													{comment.replies && comment.replies.length > 0 && (
														<div className="ltr:ml-6 rtl:mr-6 space-y-2">
															{comment.replies.map((reply) => (
																<div key={reply.id} className="bg-blue-50 rounded-lg p-3 border border-blue-200">
																	<div className="flex items-start justify-between mb-2">
																		<div className="flex items-center gap-2">
																			<div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-xs">
																				{reply.author.charAt(0)}
																			</div>
																			<div>
																				<p className="font-semibold text-sm text-gray-900">{reply.author}</p>
																				<p className="text-xs text-gray-500">
																					{new Date(reply.timestamp).toLocaleString()}
																				</p>
																			</div>
																		</div>
																	</div>
																	<p className="text-gray-700 text-sm">{reply.text}</p>
																</div>
															))}
														</div>
													)}
												</div>
											))}
										</div>
									</div>
								</div>

								{/* Sidebar Actions */}
								<div className="space-y-4">
									<div>
										<h4 className="text-xs font-bold text-gray-500 uppercase mb-2 tracking-wide">{t('modal.addToCard')}</h4>
										<div className="space-y-1.5">
											<button className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-left text-sm font-medium text-gray-700 transition-all flex items-center gap-2">
												<Users className="w-4 h-4" />
												{t('modal.membersBtn')}
											</button>

											<button
												onClick={() => {
													const labelPicker = document.getElementById('label-picker');
													if (labelPicker) labelPicker.classList.toggle('hidden');
												}}
												className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-left text-sm font-medium text-gray-700 transition-all flex items-center gap-2"
											>
												<Tag className="w-4 h-4" />
												{t('modal.labelsBtn')}
											</button>

											<div id="label-picker" className="hidden bg-white border border-gray-200 rounded-lg p-2 space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin shadow-md">
												{predefinedLabels.map((label) => (
													<button
														key={label.id}
														onClick={() => handleToggleLabel(label)}
														className="w-full px-3 py-2 rounded-lg text-left text-sm font-semibold text-white transition-all flex items-center justify-between"
														style={{ backgroundColor: label.color }}
													>
														{label.name}
														{selectedCard.card.labels?.some((l) => l.id === label.id) && <Check className="w-4 h-4" />}
													</button>
												))}
											</div>

											<button
												onClick={handleAddChecklistItem}
												className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-left text-sm font-medium text-gray-700 transition-all flex items-center gap-2"
											>
												<CheckSquare className="w-4 h-4" />
												{t('modal.checklistBtn')}
											</button>

											<button
												onClick={() => attachmentInputRef.current?.click()}
												className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-left text-sm font-medium text-gray-700 transition-all flex items-center gap-2"
											>
												<Paperclip className="w-4 h-4" />
												{t('modal.attachmentBtn')}
											</button>

											<input 
												ref={attachmentInputRef} 
												type="file" 
												accept="*" 
												multiple 
												onChange={handleAttachmentUpload} 
												className="hidden" 
											/>

											<button
												onClick={() => coverInputRef.current?.click()}
												className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-left text-sm font-medium text-gray-700 transition-all flex items-center gap-2"
											>
												<ImageIcon className="w-4 h-4" />
												{t('modal.coverBtn')}
											</button>

											<input 
												ref={coverInputRef} 
												type="file" 
												accept="image/*" 
												onChange={handleCoverUpload} 
												className="hidden" 
											/>
										</div>
									</div>

									<div>
										<h4 className="text-xs font-bold text-gray-500 uppercase mb-2 tracking-wide">{t('modal.actions')}</h4>
										<div className="space-y-1.5">
											<button 
												onClick={handleCopyCard}
												className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-left text-sm font-medium text-gray-700 transition-all flex items-center gap-2"
											>
												<Copy className="w-4 h-4" />
												{t('modal.copyBtn')}
											</button>

											<button 
												onClick={handleArchiveCard}
												className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-left text-sm font-medium text-gray-700 transition-all flex items-center gap-2"
											>
												<Archive className="w-4 h-4" />
												{t('modal.archiveBtn')}
											</button>

											<button
												onClick={handleDeleteCard}
												className="w-full px-3 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-left text-sm font-medium text-red-700 transition-all flex items-center gap-2"
											>
												<Trash2 className="w-4 h-4" />
												{t('modal.deleteBtn')}
											</button>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			<style jsx global>{`
				/* Visible scrollbar at bottom */
				.scrollbar-visible::-webkit-scrollbar {
					height: 8px !important;
				}
  
			`}</style>
		</div>
	);
}


 