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
	Filter,
	Search,
	Sparkles,
	Zap,
	Flame,
	Heart,
	Target,
	TrendingUp,
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

/** =========================
 *  Helpers
 *  ========================= */

const makeListId = (n) => `list-${n}`;
const makeCardId = (n) => `card-${n}`;
const makeColumnId = (listId) => `column-${listId}`;

/** Vibrant card color schemes */
const cardColorSchemes = [
	{
		name: 'cosmic-purple',
		bg: 'linear-gradient(135deg, var(--color-primary-400), var(--color-secondary-500))',
		border: 'var(--color-primary-300)',
		hover: 'var(--color-primary-500)',
		shadow: '0 8px 24px -4px rgba(99, 102, 241, 0.3)',
		icon: Sparkles,
		accent: 'var(--color-primary-500)',
	},
	{
		name: 'ocean-blue',
		bg: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
		border: '#93c5fd',
		hover: '#2563eb',
		shadow: '0 8px 24px -4px rgba(59, 130, 246, 0.3)',
		icon: Zap,
		accent: '#3b82f6',
	},
	{
		name: 'emerald-green',
		bg: 'linear-gradient(135deg, #10b981, #059669)',
		border: '#6ee7b7',
		hover: '#047857',
		shadow: '0 8px 24px -4px rgba(16, 185, 129, 0.3)',
		icon: TrendingUp,
		accent: '#10b981',
	},
	{
		name: 'sunset-orange',
		bg: 'linear-gradient(135deg, #f97316, #ea580c)',
		border: '#fdba74',
		hover: '#c2410c',
		shadow: '0 8px 24px -4px rgba(249, 115, 22, 0.3)',
		icon: Flame,
		accent: '#f97316',
	},
	{
		name: 'rose-pink',
		bg: 'linear-gradient(135deg, #ec4899, #db2777)',
		border: '#f9a8d4',
		hover: '#be185d',
		shadow: '0 8px 24px -4px rgba(236, 72, 153, 0.3)',
		icon: Heart,
		accent: '#ec4899',
	},
	{
		name: 'violet-dream',
		bg: 'linear-gradient(135deg, var(--color-secondary-500), var(--color-secondary-600))',
		border: 'var(--color-secondary-300)',
		hover: 'var(--color-secondary-700)',
		shadow: '0 8px 24px -4px rgba(168, 85, 247, 0.3)',
		icon: Target,
		accent: 'var(--color-secondary-500)',
	},
];

/** =========================
 *  Sortable Card
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
		opacity: isDragging ? 0.4 : 1,
	};

	const colorScheme = cardColorSchemes[card.colorIndex || 0];
	const IconComponent = colorScheme.icon;

	return (
		<div ref={setNodeRef} style={style} className="mb-3 animate-slide-in">
			<div
				{...attributes}
				{...listeners}
				onClick={(e) => {
					e.stopPropagation();
					onCardClick(card, listId);
				}}
				className="group relative rounded-xl overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
				style={{ boxShadow: colorScheme.shadow }}
			>
				<div className="absolute inset-0 opacity-95" style={{ background: colorScheme.bg }} />

				<div
					className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 animate-shimmer"
					style={{
						background:
							'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
						backgroundSize: '200% 100%',
					}}
				/>

				<div className="relative p-4">
					{card.coverImage && (
						<div className="mb-3 -mx-4 -mt-4">
							<img
								src={card.coverImage}
								alt={t('card.coverAlt')}
								className="w-full h-32 object-cover"
							/>
						</div>
					)}

					{card.labels && card.labels.length > 0 && (
						<div className="flex flex-wrap gap-1 mb-3">
							{card.labels.map((label) => (
								<span
									key={label.id}
									className="px-2 py-1 rounded-full text-xs font-semibold backdrop-blur-sm bg-white/30 text-white"
									title={label.name}
								>
									{label.name}
								</span>
							))}
						</div>
					)}

					<div className="flex items-start justify-between gap-2 mb-2">
						<h4 className="font-bold text-white flex-1 leading-snug text-shadow">
							{card.title}
						</h4>
						<div className="flex items-center gap-1">
							<IconComponent className="w-4 h-4 text-white/80 flex-shrink-0" />
							{card.isStarred && (
								<Star className="w-4 h-4 text-yellow-300 fill-yellow-300 flex-shrink-0" />
							)}
						</div>
					</div>

					{card.description && (
						<p className="text-sm text-white/90 mb-3 line-clamp-2">{card.description}</p>
					)}

					<div className="flex items-center gap-2 text-xs text-white/90 flex-wrap">
						{card.dueDate && (
							<span
								className={`flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-sm ${
									new Date(card.dueDate) < new Date()
										? 'bg-red-500/40 text-white font-bold'
										: 'bg-white/20'
								}`}
							>
								<Clock className="w-3 h-3" />
								{new Date(card.dueDate).toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric',
								})}
							</span>
						)}
						{card.checklist && card.checklist.length > 0 && (
							<span
								className={`flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-sm ${
									card.checklist.every((c) => c.completed)
										? 'bg-green-500/40 font-bold'
										: 'bg-white/20'
								}`}
							>
								<CheckSquare className="w-3 h-3" />
								{card.checklist.filter((c) => c.completed).length}/{card.checklist.length}
							</span>
						)}
						{card.description && (
							<span className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
								<AlignLeft className="w-3 h-3" />
							</span>
						)}
						{card.comments && card.comments > 0 && (
							<span className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
								<MessageSquare className="w-3 h-3" />
								{card.comments}
							</span>
						)}
						{card.attachments && card.attachments > 0 && (
							<span className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
								<Paperclip className="w-3 h-3" />
								{card.attachments}
							</span>
						)}
					</div>

					{card.members && card.members.length > 0 && (
						<div className="flex items-center gap-1 mt-3 -space-x-2">
							{card.members.slice(0, 3).map((member, idx) => (
								<div
									key={idx}
									className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-xs border-2 border-white/50 shadow-lg"
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
								<div className="w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-white font-bold text-xs border-2 border-white/50 shadow-lg">
									+{card.members.length - 3}
								</div>
							)}
						</div>
					)}
				</div>

				<div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
					<GripVertical className="w-4 h-4 text-white/60" />
				</div>
			</div>
		</div>
	);
}

/** =========================
 *  Droppable Cards Area (IMPORTANT)
 *  ========================= */
function CardsDroppableArea({ listId, children }) {
	const columnId = makeColumnId(listId);
	const { setNodeRef, isOver } = useDroppable({
		id: columnId,
		data: { type: 'column', listId },
	});

	return (
		<div
			ref={setNodeRef}
			className={`p-3 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin rounded-b-2xl ${
				isOver ? 'bg-primary/5' : ''
			}`}
		>
			{children}
		</div>
	);
}

/** =========================
 *  Sortable List (column)
 *  ========================= */
function SortableList({
	list,
	cards,
	onAddCard,
	onCardClick,
	onDeleteList,
	onUpdateList,
}) {
	const t = useTranslations('board');

	// IMPORTANT: list draggable id is unique and NOT the same as list.id used for logic
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
			<div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden h-fit border border-gray-200">
				{/* Header */}
				<div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
					<div className="flex items-center justify-between group">
						<div className="flex items-center gap-2 flex-1">
							{/* Drag handle ONLY here */}
							<div
								{...attributes}
								{...listeners}
								className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded transition-colors"
							>
								<GripVertical className="w-4 h-4 text-gray-400" />
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
									className="font-bold text-gray-800 flex-1 text-base bg-white border-2 border-primary rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
									autoFocus
								/>
							) : (
								<h3
									className="font-bold text-gray-800 flex-1 text-base cursor-pointer hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
									onClick={() => setIsEditingTitle(true)}
								>
									{list.title}
								</h3>
							)}

							<span className="bg-gradient-to-r from-primary to-secondary-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-sm">
								{cards.length}
							</span>
						</div>

						<div className="relative">
							<button
								onClick={() => setShowListMenu(!showListMenu)}
								className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
							>
								<MoreHorizontal className="w-5 h-5 text-gray-600" />
							</button>

							{showListMenu && (
								<>
									<div className="fixed inset-0 z-10" onClick={() => setShowListMenu(false)} />
									<div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-20 w-56">
										<button className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors">
											<Archive className="w-4 h-4 text-gray-600" />
											<span className="font-medium text-gray-700">{t('list.archive')}</span>
										</button>
										<button
											onClick={() => {
												onDeleteList(list.id);
												setShowListMenu(false);
											}}
											className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 flex items-center gap-3 text-red-600 transition-colors"
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
				<CardsDroppableArea listId={list.id}>
					<SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
						{cards.map((card) => (
							<SortableCard key={card.id} card={card} listId={list.id} onCardClick={onCardClick} />
						))}
					</SortableContext>

					{/* Add Card */}
					{isAddingCard ? (
						<div className="bg-white rounded-xl p-4 shadow-lg border-2 border-primary mt-2">
							{cardImages.length > 0 && (
								<div className="mb-3 space-y-2">
									{cardImages.map((img, idx) => (
										<div key={idx} className="relative rounded-lg overflow-hidden">
											<img src={img} alt={`Preview ${idx + 1}`} className="w-full h-32 object-cover" />
											<button
												onClick={() => setCardImages((prev) => prev.filter((_, i) => i !== idx))}
												className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 rounded-full text-white shadow-lg transition-colors"
											>
												<X className="w-4 h-4" />
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
								className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm resize-none transition-all"
								rows="3"
								autoFocus
							/>

							<div className="flex items-center gap-2 mt-3">
								<button
									onClick={handleAddCard}
									className="px-5 py-2.5 bg-gradient-to-r from-primary to-secondary-500 text-white rounded-xl hover:shadow-lg text-sm font-bold transition-all hover:scale-105 active:scale-95"
								>
									{t('list.addCard')}
								</button>

								<button
									onClick={() => fileInputRef.current?.click()}
									className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
									title={t('list.uploadImage')}
								>
									<ImageIcon className="w-5 h-5 text-gray-600" />
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
									className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors ml-auto"
								>
									<X className="w-5 h-5 text-gray-600" />
								</button>
							</div>
						</div>
					) : (
						<button
							onClick={() => setIsAddingCard(true)}
							className="w-full p-3 text-left text-gray-600 hover:bg-gray-50 rounded-xl transition-all flex items-center gap-2 group border-2 border-dashed border-gray-300 hover:border-primary mt-2"
						>
							<Plus className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
							<span className="font-medium group-hover:text-primary transition-colors">
								{t('list.addCardButton')}
							</span>
						</button>
					)}
				</CardsDroppableArea>
			</div>
		</div>
	);
}

/** =========================
 *  Main Board / Todos Tab
 *  ========================= */
export default function BoardTab() {
	const t = useTranslations('board');

	// IMPORTANT: list ids are unique strings
	const [lists, setLists] = useState([
		{ id: makeListId(1), title: 'To Do' },
		{ id: makeListId(2), title: 'In Progress' },
		{ id: makeListId(3), title: 'Review' },
		{ id: makeListId(4), title: 'Done' },
	]);

	// IMPORTANT: card ids are unique and DO NOT overlap list ids
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
			comments: 3,
			attachments: 2,
			isStarred: true,
			colorIndex: 0,
		},
		{
			id: makeCardId(2),
			listId: makeListId(1),
			title: 'Update documentation',
			description: 'Add API examples and improve getting started guide',
			dueDate: '2024-02-20',
			labels: [{ id: 'l3', name: 'Documentation', color: '#3b82f6' }],
			comments: 1,
			colorIndex: 1,
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
			comments: 5,
			attachments: 1,
			colorIndex: 2,
		},
		{
			id: makeCardId(4),
			listId: makeListId(4),
			title: 'Setup project repository',
			description: 'Initialize Git repo with proper structure',
			labels: [{ id: 'l6', name: 'DevOps', color: '#8b5cf6' }],
			members: [{ name: 'Jordan Lee', initials: 'JL' }],
			colorIndex: 3,
		},
	]);

	const [activeCardId, setActiveCardId] = useState(null);
	const [activeListSortableId, setActiveListSortableId] = useState(null);

	const [selectedCard, setSelectedCard] = useState(null);

	const [isAddingList, setIsAddingList] = useState(false);
	const [newListTitle, setNewListTitle] = useState('');

	const [showFilters, setShowFilters] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterLabel, setFilterLabel] = useState(null);
	const [filterMember, setFilterMember] = useState(null);
	const [sortBy, setSortBy] = useState('none');

	const fileInputRef = useRef(null);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 8 },
		})
	);

	/** ===== Filtering / sorting view ONLY (doesn't mutate source order) ===== */
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

		if (filterLabel) {
			filtered = filtered.filter((c) => c.labels?.some((l) => l.id === filterLabel.id));
		}

		if (filterMember) {
			filtered = filtered.filter((c) => c.members?.some((m) => m.name === filterMember.name));
		}

		// IMPORTANT: sorting here is only visual; does not affect dnd order
		// If you want dnd to respect sort, you must store per-list order separately.
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

	/** ===== Drag handlers (reference-style) ===== */
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

		// Only cards change columns on dragOver (like your working orders example)
		if (activeData?.type !== 'card') return;

		const activeCard = cards.find((c) => c.id === active.id);
		if (!activeCard) return;

		// Over a column droppable area
		if (overData?.type === 'column') {
			const overListId = overData.listId;
			if (activeCard.listId !== overListId) {
				setCards((prev) =>
					prev.map((c) => (c.id === active.id ? { ...c, listId: overListId } : c))
				);
			}
			return;
		}

		// Over another card
		if (overData?.type === 'card') {
			const overListId = overData.listId;
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

		// CARD reorder (same column only)
		if (activeData?.type === 'card') {
			const activeCard = cards.find((c) => c.id === active.id);
			if (!activeCard) return;

			// If dropped on a card
			if (overData?.type === 'card') {
				const overCard = cards.find((c) => c.id === over.id);
				if (!overCard) return;

				// Only reorder if same list
				if (activeCard.listId === overCard.listId) {
					// Reorder inside THAT list without messing other lists
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

			// If dropped on the column background (not on a card),
			// we keep the current listId (already updated in onDragOver) and do not reorder.
			if (overData?.type === 'column') {
				return;
			}
		}
	};

	/** ===== CRUD ===== */
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
		const colorIndex = Math.floor(Math.random() * cardColorSchemes.length);
		const newCard = {
			id: `card-${Date.now()}`,
			listId,
			title,
			description: '',
			labels: [],
			members: [],
			checklist: [],
			comments: 0,
			attachments: images.length,
			coverImage: images.length > 0 ? images[0] : null,
			colorIndex,
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

	const handleImageUpload = (e) => {
		const file = e.target.files?.[0];
		if (file && selectedCard) {
			const reader = new FileReader();
			reader.onload = (event) => handleUpdateCard({ coverImage: event.target.result });
			reader.readAsDataURL(file);
		}
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

	// Filters lists
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
		<div className="min-h-screen bg-white">
			{/* Filters Bar */}
			<div className="bg-white border-b-2 border-gray-100 shadow-sm sticky top-0 z-10">
				<div className="max-w-[2000px] mx-auto px-6 py-4">
					<div className="flex items-center gap-4 flex-wrap">
						<div className="relative flex-1 min-w-[200px] max-w-md">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
							<input
								type="text"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								placeholder={t('filters.search')}
								className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm transition-all"
							/>
						</div>

						<button
							onClick={() => setShowFilters(!showFilters)}
							className={`px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm ${
								showFilters || filterLabel || filterMember
									? 'bg-gradient-to-r from-primary to-secondary-500 text-white shadow-lg'
									: 'bg-gray-100 text-gray-700 border-2 border-gray-200 hover:border-primary'
							}`}
						>
							<Filter className="w-4 h-4" />
							{t('filters.filter')}
						</button>

						<select
							value={sortBy}
							onChange={(e) => setSortBy(e.target.value)}
							className="px-5 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm bg-white hover:border-primary transition-all font-medium shadow-sm"
						>
							<option value="none">{t('filters.sortNone')}</option>
							<option value="title">{t('filters.sortTitle')}</option>
							<option value="dueDate">{t('filters.sortDueDate')}</option>
						</select>

						{filterLabel && (
							<div
								className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold shadow-lg"
								style={{ backgroundColor: filterLabel.color }}
							>
								{filterLabel.name}
								<button onClick={() => setFilterLabel(null)} className="hover:scale-110 transition-transform">
									<X className="w-4 h-4" />
								</button>
							</div>
						)}

						{filterMember && (
							<div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-secondary-500 text-white rounded-xl text-sm font-bold shadow-lg">
								{filterMember.name}
								<button onClick={() => setFilterMember(null)} className="hover:scale-110 transition-transform">
									<X className="w-4 h-4" />
								</button>
							</div>
						)}
					</div>

					{showFilters && (
						<div className="mt-4 grid grid-cols-2 gap-4 animate-fade-in-up">
							<div>
								<label className="text-xs font-bold text-gray-700 mb-3 block uppercase tracking-wide">
									{t('filters.labels')}
								</label>
								<div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin bg-gray-50 rounded-xl p-3 border border-gray-200">
									{allLabels.map((label) => (
										<button
											key={label.id}
											onClick={() => setFilterLabel(filterLabel?.id === label.id ? null : label)}
											className="w-full px-4 py-2.5 rounded-xl text-left text-sm font-bold text-white transition-all flex items-center justify-between hover:scale-105 shadow-sm"
											style={{ backgroundColor: label.color }}
										>
											{label.name}
											{filterLabel?.id === label.id && <CheckSquare className="w-4 h-4" />}
										</button>
									))}
								</div>
							</div>

							<div>
								<label className="text-xs font-bold text-gray-700 mb-3 block uppercase tracking-wide">
									{t('filters.members')}
								</label>
								<div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin bg-gray-50 rounded-xl p-3 border border-gray-200">
									{allMembers.map((member) => (
										<button
											key={member.name}
											onClick={() => setFilterMember(filterMember?.name === member.name ? null : member)}
											className={`w-full px-4 py-2.5 rounded-xl text-left text-sm font-bold transition-all flex items-center gap-3 shadow-sm hover:scale-105 ${
												filterMember?.name === member.name
													? 'bg-gradient-to-r from-primary to-secondary-500 text-white'
													: 'bg-white text-gray-700 hover:border-primary border-2 border-gray-200'
											}`}
										>
											<div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
												{member.initials}
											</div>
											{member.name}
											{filterMember?.name === member.name && <CheckSquare className="w-4 h-4 ml-auto" />}
										</button>
									))}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			<DndContext
				sensors={sensors}
				collisionDetection={closestCorners}
				onDragStart={handleDragStart}
				onDragOver={handleDragOver}
				onDragEnd={handleDragEnd}
			>
				<div className="max-w-[2000px] mx-auto px-6 py-8">
					<div className="flex gap-5 overflow-x-auto pb-6 hide-scrollbar">
						{/* Lists reorder by sortable-* ids */}
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
								<div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-primary">
									<input
										type="text"
										value={newListTitle}
										onChange={(e) => setNewListTitle(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter') handleAddList();
										}}
										placeholder={t('board.listTitlePlaceholder')}
										className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-base font-bold"
										autoFocus
									/>
									<div className="flex gap-2 mt-3">
										<button
											onClick={handleAddList}
											className="px-5 py-2.5 bg-gradient-to-r from-primary to-secondary-500 text-white rounded-xl hover:shadow-lg font-bold transition-all hover:scale-105"
										>
											{t('board.addList')}
										</button>
										<button
											onClick={() => {
												setIsAddingList(false);
												setNewListTitle('');
											}}
											className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
										>
											<X className="w-5 h-5 text-gray-600" />
										</button>
									</div>
								</div>
							</div>
						) : (
							<button
								onClick={() => setIsAddingList(true)}
								className="flex-shrink-0 w-80 p-4 bg-gray-50 hover:bg-white rounded-2xl transition-all flex items-center gap-3 group border-2 border-dashed border-gray-300 hover:border-primary shadow-sm hover:shadow-lg"
							>
								<Plus className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
								<span className="font-bold text-gray-600 group-hover:text-primary text-base transition-colors">
									{t('board.addListButton')}
								</span>
							</button>
						)}
					</div>
				</div>

				{/* Drag Overlay */}
				<DragOverlay>
					{activeCard ? (
						<div className="w-80 rotate-3 opacity-90">
							<div
								className="rounded-xl overflow-hidden shadow-2xl ring-4 ring-primary/30"
								style={{ background: cardColorSchemes[activeCard.colorIndex || 0].bg }}
							>
								<div className="p-4">
									<h4 className="font-bold text-white text-shadow">{activeCard.title}</h4>
								</div>
							</div>
						</div>
					) : activeList ? (
						<div className="bg-white rounded-2xl p-4 shadow-2xl border-2 border-primary w-80 opacity-90">
							<h3 className="font-bold text-gray-800 text-lg">{activeList.title}</h3>
						</div>
					) : null}
				</DragOverlay>
			</DndContext>

			{/* Card Detail Modal (kept from your code, unchanged UI) */}
			{selectedCard && (
				<div
					className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
					onClick={() => setSelectedCard(null)}
					onPaste={handleImagePaste}
				>
					<div
						className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
						onClick={(e) => e.stopPropagation()}
					>
						{selectedCard.card.coverImage && (
							<div className="relative h-56 bg-gray-200">
								<img
									src={selectedCard.card.coverImage}
									alt={t('modal.coverAlt')}
									className="w-full h-full object-cover"
								/>
								<button
									onClick={() => handleUpdateCard({ coverImage: null })}
									className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/80 rounded-xl transition-colors backdrop-blur-sm"
								>
									<X className="w-5 h-5 text-white" />
								</button>
							</div>
						)}

						<div className="p-8">
							<div className="flex items-start gap-4 mb-6">
								<div className="flex-1">
									<div className="flex items-center gap-3 mb-2">
										<AlignLeft className="w-6 h-6 text-gray-600" />
										<input
											type="text"
											value={selectedCard.card.title}
											onChange={(e) => handleUpdateCard({ title: e.target.value })}
											className="text-3xl font-bold text-gray-900 flex-1 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg px-2 -ml-2"
										/>
										<button
											onClick={() => handleUpdateCard({ isStarred: !selectedCard.card.isStarred })}
											className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
										>
											{selectedCard.card.isStarred ? (
												<Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
											) : (
												<StarOff className="w-6 h-6 text-gray-400" />
											)}
										</button>
									</div>
									<div className="text-sm text-gray-600 ml-9">
										{t('modal.inList')}{' '}
										<span className="font-bold">{lists.find((l) => l.id === selectedCard.listId)?.title}</span>
									</div>
								</div>
								<button onClick={() => setSelectedCard(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
									<X className="w-6 h-6 text-gray-600" />
								</button>
							</div>

							<div className="grid grid-cols-3 gap-8">
								<div className="col-span-2 space-y-6">
									{selectedCard.card.labels && selectedCard.card.labels.length > 0 && (
										<div>
											<h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
												<Tag className="w-4 h-4" />
												{t('modal.labels')}
											</h3>
											<div className="flex flex-wrap gap-2">
												{selectedCard.card.labels.map((label) => (
													<span
														key={label.id}
														className="px-4 py-2 rounded-xl text-white font-bold text-sm shadow-md"
														style={{ backgroundColor: label.color }}
													>
														{label.name}
													</span>
												))}
											</div>
										</div>
									)}

									{selectedCard.card.members && selectedCard.card.members.length > 0 && (
										<div>
											<h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
												<Users className="w-4 h-4" />
												{t('modal.members')}
											</h3>
											<div className="flex flex-wrap gap-3">
												{selectedCard.card.members.map((member, idx) => (
													<div key={idx} className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
														<div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
															{member.avatar ? (
																<img src={member.avatar} alt={member.name} className="w-full h-full rounded-full object-cover" />
															) : (
																member.initials
															)}
														</div>
														<span className="text-sm font-bold text-gray-700">{member.name}</span>
													</div>
												))}
											</div>
										</div>
									)}

									<div>
										<h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
											<AlignLeft className="w-4 h-4" />
											{t('modal.description')}
										</h3>
										<textarea
											value={selectedCard.card.description || ''}
											onChange={(e) => handleUpdateCard({ description: e.target.value })}
											placeholder={t('modal.descriptionPlaceholder')}
											className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm resize-none min-h-[120px]"
										/>
									</div>

									<div>
										<div className="flex items-center justify-between mb-3">
											<h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
												<CheckSquare className="w-4 h-4" />
												{t('modal.checklist')}
											</h3>
											<button
												onClick={handleAddChecklistItem}
												className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold transition-colors"
											>
												{t('modal.addItem')}
											</button>
										</div>
										{selectedCard.card.checklist && selectedCard.card.checklist.length > 0 && (
											<div className="space-y-2">
												{selectedCard.card.checklist.map((item) => (
													<label
														key={item.id}
														className="flex items-center gap-3 p-4 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors group border border-gray-100"
													>
														<input
															type="checkbox"
															checked={item.completed}
															onChange={() => handleToggleChecklist(item.id)}
															className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary/20 cursor-pointer"
														/>
														<span className={`flex-1 ${item.completed ? 'line-through text-gray-400' : 'text-gray-700 font-medium'}`}>
															{item.text}
														</span>
													</label>
												))}
											</div>
										)}
									</div>
								</div>

								<div className="space-y-3">
									<div>
										<h4 className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">{t('modal.addToCard')}</h4>
										<div className="space-y-2">
											<button className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-left text-sm font-bold text-gray-700 transition-all flex items-center gap-3 hover:scale-105">
												<Users className="w-4 h-4" />
												{t('modal.membersBtn')}
											</button>

											<button
												onClick={() => {
													const labelPicker = document.getElementById('label-picker');
													if (labelPicker) labelPicker.classList.toggle('hidden');
												}}
												className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-left text-sm font-bold text-gray-700 transition-all flex items-center gap-3 hover:scale-105"
											>
												<Tag className="w-4 h-4" />
												{t('modal.labelsBtn')}
											</button>

											<div id="label-picker" className="hidden bg-white border-2 border-gray-200 rounded-xl p-3 space-y-2 max-h-60 overflow-y-auto scrollbar-thin shadow-lg">
												{predefinedLabels.map((label) => (
													<button
														key={label.id}
														onClick={() => handleToggleLabel(label)}
														className="w-full px-4 py-3 rounded-xl text-left text-sm font-bold text-white transition-all flex items-center justify-between hover:scale-105 shadow-sm"
														style={{ backgroundColor: label.color }}
													>
														{label.name}
														{selectedCard.card.labels?.some((l) => l.id === label.id) && <CheckSquare className="w-4 h-4" />}
													</button>
												))}
											</div>

											<button
												onClick={handleAddChecklistItem}
												className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-left text-sm font-bold text-gray-700 transition-all flex items-center gap-3 hover:scale-105"
											>
												<CheckSquare className="w-4 h-4" />
												{t('modal.checklistBtn')}
											</button>

											<button
												onClick={() => fileInputRef.current?.click()}
												className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-left text-sm font-bold text-gray-700 transition-all flex items-center gap-3 hover:scale-105"
											>
												<Paperclip className="w-4 h-4" />
												{t('modal.attachmentBtn')}
											</button>

											<input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

											<button
												onClick={() => fileInputRef.current?.click()}
												className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-left text-sm font-bold text-gray-700 transition-all flex items-center gap-3 hover:scale-105"
											>
												<ImageIcon className="w-4 h-4" />
												{t('modal.coverBtn')}
											</button>
										</div>
									</div>

									<div>
										<h4 className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">{t('modal.actions')}</h4>
										<div className="space-y-2">
											<button className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-left text-sm font-bold text-gray-700 transition-all flex items-center gap-3 hover:scale-105">
												<Copy className="w-4 h-4" />
												{t('modal.copyBtn')}
											</button>

											<button className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-left text-sm font-bold text-gray-700 transition-all flex items-center gap-3 hover:scale-105">
												<Archive className="w-4 h-4" />
												{t('modal.archiveBtn')}
											</button>

											<button
												onClick={handleDeleteCard}
												className="w-full px-4 py-3 bg-red-100 hover:bg-red-200 rounded-xl text-left text-sm font-bold text-red-700 transition-all flex items-center gap-3 hover:scale-105"
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
				.text-shadow {
					text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
				}
			`}</style>
		</div>
	);
}
