import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { BookmarkNode, getBookmarkTree, requestBookmarkPermission, hasBookmarkPermission } from '@/features/dock/utils/bookmarks';
import { useLanguage } from '@/shared/context/LanguageContext';
import styles from './BatchImport.module.css';

interface BookmarkPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (bookmarks: BookmarkNode[]) => void;
}

export const BookmarkPicker: React.FC<BookmarkPickerProps> = ({ isOpen, onClose, onImport }) => {
    const { t } = useLanguage();
    const [tree, setTree] = useState<BookmarkNode[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        let cancelled = false;

        const loadBookmarks = async () => {
            setLoading(true);
            setError(null);
            try {
                const hasPerm = await hasBookmarkPermission();
                if (!hasPerm) {
                    const granted = await requestBookmarkPermission();
                    if (!granted) {
                        if (!cancelled) {
                            setError(t.batchImport?.bookmarkPermissionDenied || 'Bookmark permission denied');
                            setLoading(false);
                        }
                        return;
                    }
                }
                const bookmarkTree = await getBookmarkTree();
                if (cancelled) return;
                setTree(bookmarkTree);
                // 默认展开顶层
                const topIds = new Set<string>();
                bookmarkTree.forEach(n => {
                    topIds.add(n.id);
                    n.children?.forEach(c => topIds.add(c.id));
                });
                setExpandedIds(topIds);
            } catch (err) {
                if (!cancelled) setError(String(err));
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadBookmarks();

        return () => { cancelled = true; };
    }, [isOpen, t]);

    const toggleSelect = useCallback((node: BookmarkNode) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (node.url) {
                // 单个书签
                if (next.has(node.id)) next.delete(node.id);
                else next.add(node.id);
            } else if (node.children) {
                // 文件夹：全选/全取消子书签
                const childUrls = getAllUrlNodes(node);
                const allSelected = childUrls.every(c => next.has(c.id));
                childUrls.forEach(c => {
                    if (allSelected) next.delete(c.id);
                    else next.add(c.id);
                });
            }
            return next;
        });
    }, []);

    const toggleExpand = useCallback((id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handleImport = useCallback(() => {
        const selected = collectSelectedNodes(tree, selectedIds);
        onImport(selected);
        onClose();
    }, [tree, selectedIds, onImport, onClose]);

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className={styles.bookmarkOverlay} onClick={onClose}>
            <div className={styles.bookmarkPanel} onClick={e => e.stopPropagation()}>
                <div className={styles.bookmarkHeader}>
                    <span className={styles.bookmarkTitle}>
                        {t.batchImport?.fromBookmarks || 'Import from Bookmarks'}
                    </span>
                    <button className={styles.bookmarkCloseBtn} onClick={onClose}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                <div className={styles.bookmarkTree}>
                    {loading ? (
                        <div className={styles.bookmarkEmpty}>Loading...</div>
                    ) : error ? (
                        <div className={styles.bookmarkEmpty}>{error}</div>
                    ) : tree.length === 0 ? (
                        <div className={styles.bookmarkEmpty}>
                            {t.batchImport?.noBookmarks || 'No bookmarks found'}
                        </div>
                    ) : (
                        tree.map(node => (
                            <BookmarkTreeNode
                                key={node.id}
                                node={node}
                                selectedIds={selectedIds}
                                expandedIds={expandedIds}
                                onToggleSelect={toggleSelect}
                                onToggleExpand={toggleExpand}
                            />
                        ))
                    )}
                </div>

                <div className={styles.bookmarkFooter}>
                    <span className={styles.bookmarkCount}>
                        {t.batchImport?.selected || 'Selected'}: {selectedIds.size}
                    </span>
                    <div className={styles.bookmarkActions}>
                        <button className={`${styles.bookmarkBtn} ${styles.bookmarkCancelBtn}`} onClick={onClose}>
                            {t.modal.cancel}
                        </button>
                        <button
                            className={`${styles.bookmarkBtn} ${styles.bookmarkImportBtn}`}
                            onClick={handleImport}
                            disabled={selectedIds.size === 0}
                        >
                            {t.batchImport?.importSelected || 'Import'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

// 递归渲染书签树节点
const BookmarkTreeNode: React.FC<{
    node: BookmarkNode;
    selectedIds: Set<string>;
    expandedIds: Set<string>;
    onToggleSelect: (node: BookmarkNode) => void;
    onToggleExpand: (id: string) => void;
    depth?: number;
}> = ({ node, selectedIds, expandedIds, onToggleSelect, onToggleExpand, depth = 0 }) => {
    const isFolder = !!node.children && !node.url;
    const isExpanded = expandedIds.has(node.id);
    const isChecked = node.url
        ? selectedIds.has(node.id)
        : node.children ? getAllUrlNodes(node).every(c => selectedIds.has(c.id)) && getAllUrlNodes(node).length > 0 : false;

    // 跳过无标题的根节点，直接渲染子节点
    if (!node.title && node.children && depth === 0) {
        return (
            <>
                {node.children.map(child => (
                    <BookmarkTreeNode
                        key={child.id}
                        node={child}
                        selectedIds={selectedIds}
                        expandedIds={expandedIds}
                        onToggleSelect={onToggleSelect}
                        onToggleExpand={onToggleExpand}
                        depth={depth}
                    />
                ))}
            </>
        );
    }

    return (
        <div className={styles.bookmarkNode}>
            <div className={styles.bookmarkItem} onClick={() => isFolder ? onToggleExpand(node.id) : onToggleSelect(node)}>
                {isFolder && (
                    <div className={`${styles.bookmarkToggle} ${isExpanded ? styles.expanded : ''}`}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                )}
                <div
                    className={`${styles.bookmarkCheckbox} ${isChecked ? styles.checked : ''}`}
                    onClick={e => { e.stopPropagation(); onToggleSelect(node); }}
                >
                    {isChecked && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                </div>
                <div className={styles.bookmarkIcon}>
                    {isFolder ? (
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M2 4C2 3.44772 2.44772 3 3 3H6.17157C6.43679 3 6.69114 3.10536 6.87868 3.29289L7.70711 4.12132C7.89464 4.30886 8.149 4.41421 8.41421 4.41421H13C13.5523 4.41421 14 4.86193 14 5.41421V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" fill="currentColor" opacity="0.6" />
                        </svg>
                    ) : (
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
                        </svg>
                    )}
                </div>
                <span className={styles.bookmarkName}>{node.title || 'Untitled'}</span>
                {node.url && <span className={styles.bookmarkUrl}>{node.url}</span>}
            </div>
            {isFolder && isExpanded && node.children && (
                <div className={styles.bookmarkChildren}>
                    {node.children.map(child => (
                        <BookmarkTreeNode
                            key={child.id}
                            node={child}
                            selectedIds={selectedIds}
                            expandedIds={expandedIds}
                            onToggleSelect={onToggleSelect}
                            onToggleExpand={onToggleExpand}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// 获取节点下所有有 URL 的子节点
function getAllUrlNodes(node: BookmarkNode): BookmarkNode[] {
    const results: BookmarkNode[] = [];
    if (node.url) results.push(node);
    if (node.children) {
        node.children.forEach(c => results.push(...getAllUrlNodes(c)));
    }
    return results;
}

// 收集所有被选中的书签节点
function collectSelectedNodes(tree: BookmarkNode[], selectedIds: Set<string>): BookmarkNode[] {
    const results: BookmarkNode[] = [];
    function walk(nodes: BookmarkNode[]) {
        for (const node of nodes) {
            if (node.url && selectedIds.has(node.id)) {
                results.push(node);
            }
            if (node.children) walk(node.children);
        }
    }
    walk(tree);
    return results;
}
