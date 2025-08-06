import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

function ForumList() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedPosts, setExpandedPosts] = useState(new Set());
    const [comments, setComments] = useState({});
    const [newComment, setNewComment] = useState({});
    const [votes, setVotes] = useState({});
    const [userVotes, setUserVotes] = useState({});
    const [filterBy, setFilterBy] = useState('newest'); // newest, mostComments, mostUpvotes
    const [filteredPosts, setFilteredPosts] = useState([]);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const { data, error } = await supabase
                .from('posts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching posts:', error);
                return;
            }

            setPosts(data || []);
            
            // Fetch votes and comment counts for all posts
            if (data && data.length > 0) {
                await fetchVotesForPosts(data.map(post => post.id));
                await fetchCommentCounts(data.map(post => post.id));
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchVotesForPosts = async (postIds) => {
        try {
            const { data, error } = await supabase
                .from('votes')
                .select('post_id, vote_type, user_ip')
                .in('post_id', postIds);

            if (error) {
                console.error('Error fetching votes:', error);
                return;
            }

            // Calculate vote counts and user votes
            const voteCounts = {};
            const userVoteData = {};
            const userIp = await getUserIP();

            postIds.forEach(postId => {
                voteCounts[postId] = { upvotes: 0, downvotes: 0, total: 0 };
                userVoteData[postId] = null;
            });

            data?.forEach(vote => {
                if (vote.vote_type === 1) {
                    voteCounts[vote.post_id].upvotes++;
                } else if (vote.vote_type === -1) {
                    voteCounts[vote.post_id].downvotes++;
                }
                voteCounts[vote.post_id].total = voteCounts[vote.post_id].upvotes - voteCounts[vote.post_id].downvotes;

                // Check if current user has voted
                if (vote.user_ip === userIp) {
                    userVoteData[vote.post_id] = vote.vote_type;
                }
            });

            setVotes(voteCounts);
            setUserVotes(userVoteData);
        } catch (error) {
            console.error('Error fetching votes:', error);
        }
    };

    const fetchCommentCounts = async (postIds) => {
        try {
            const { data, error } = await supabase
                .from('comments')
                .select('post_id')
                .in('post_id', postIds);

            if (error) {
                console.error('Error fetching comment counts:', error);
                return;
            }

            // Count comments per post
            const commentCounts = {};
            postIds.forEach(postId => {
                commentCounts[postId] = 0;
            });

            data?.forEach(comment => {
                commentCounts[comment.post_id]++;
            });

            // Update posts with comment counts
            setPosts(prev => prev.map(post => ({
                ...post,
                commentCount: commentCounts[post.id] || 0
            })));
        } catch (error) {
            console.error('Error fetching comment counts:', error);
        }
    };

    const getUserIP = async () => {
        try {
            // Simple IP detection - in production you might want a more robust solution
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            // Fallback to a random identifier stored in localStorage
            let userIdentifier = localStorage.getItem('user_identifier');
            if (!userIdentifier) {
                userIdentifier = 'user_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('user_identifier', userIdentifier);
            }
            return userIdentifier;
        }
    };

    const fetchComments = async (postId) => {
        try {
            const { data, error } = await supabase
                .from('comments')
                .select('*')
                .eq('post_id', postId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching comments:', error);
                return;
            }

            setComments(prev => ({
                ...prev,
                [postId]: data || []
            }));
        } catch (error) {
            console.error('Error fetching comments:', error);
        }
    };

    const toggleComments = async (postId) => {
        const newExpanded = new Set(expandedPosts);
        
        if (expandedPosts.has(postId)) {
            newExpanded.delete(postId);
        } else {
            newExpanded.add(postId);
            // Fetch comments when expanding
            if (!comments[postId]) {
                await fetchComments(postId);
            }
        }
        
        setExpandedPosts(newExpanded);
    };

    const handleAddComment = async (postId) => {
        const commentText = newComment[postId]?.trim();
        
        if (!commentText) {
            alert('Please enter a comment');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('comments')
                .insert([
                    {
                        post_id: postId,
                        content: commentText,
                        created_at: new Date().toISOString()
                    }
                ])
                .select();

            if (error) {
                console.error('Error adding comment:', error);
                alert('Failed to add comment');
                return;
            }

            // Update comments state
            setComments(prev => ({
                ...prev,
                [postId]: [...(prev[postId] || []), ...data]
            }));

            // Clear the input
            setNewComment(prev => ({
                ...prev,
                [postId]: ''
            }));

        } catch (error) {
            console.error('Error adding comment:', error);
            alert('Failed to add comment');
        }
    };

    const handleDeletePost = async (postId) => {
        if (!confirm('Are you sure you want to delete this post?')) {
            return;
        }

        try {
            // First delete all comments for this post
            const { error: commentsError } = await supabase
                .from('comments')
                .delete()
                .eq('post_id', postId);

            if (commentsError) {
                console.error('Error deleting comments:', commentsError);
            }

            // Then delete the post
            const { error: postError } = await supabase
                .from('posts')
                .delete()
                .eq('id', postId);

            if (postError) {
                console.error('Error deleting post:', postError);
                alert('Failed to delete post');
                return;
            }

            // Update local state
            setPosts(prev => prev.filter(post => post.id !== postId));
            setComments(prev => {
                const newComments = { ...prev };
                delete newComments[postId];
                return newComments;
            });

        } catch (error) {
            console.error('Error deleting post:', error);
            alert('Failed to delete post');
        }
    };

    const handleDeleteComment = async (postId, commentId) => {
        if (!confirm('Are you sure you want to delete this comment?')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('comments')
                .delete()
                .eq('id', commentId);

            if (error) {
                console.error('Error deleting comment:', error);
                alert('Failed to delete comment');
                return;
            }

            // Update local comments state
            setComments(prev => ({
                ...prev,
                [postId]: prev[postId].filter(comment => comment.id !== commentId)
            }));

            // Update comment count
            setPosts(prev => prev.map(post => 
                post.id === postId 
                    ? { ...post, commentCount: (post.commentCount || 1) - 1 }
                    : post
            ));

        } catch (error) {
            console.error('Error deleting comment:', error);
            alert('Failed to delete comment');
        }
    };

    const handleVote = async (postId, voteType) => {
        try {
            const userIp = await getUserIP();
            const currentVote = userVotes[postId];

            if (currentVote === voteType) {
                // User is removing their vote
                const { error } = await supabase
                    .from('votes')
                    .delete()
                    .eq('post_id', postId)
                    .eq('user_ip', userIp);

                if (error) {
                    console.error('Error removing vote:', error);
                    alert('Failed to remove vote');
                    return;
                }

                // Update local state
                setUserVotes(prev => ({ ...prev, [postId]: null }));
                setVotes(prev => ({
                    ...prev,
                    [postId]: {
                        upvotes: prev[postId].upvotes - (voteType === 1 ? 1 : 0),
                        downvotes: prev[postId].downvotes - (voteType === -1 ? 1 : 0),
                        total: prev[postId].total - voteType
                    }
                }));
            } else {
                // User is voting or changing their vote
                const { error } = await supabase
                    .from('votes')
                    .upsert({
                        post_id: postId,
                        user_ip: userIp,
                        vote_type: voteType
                    }, {
                        onConflict: 'post_id,user_ip'
                    });

                if (error) {
                    console.error('Error voting:', error);
                    alert('Failed to vote');
                    return;
                }

                // Update local state
                const oldVote = currentVote || 0;
                setUserVotes(prev => ({ ...prev, [postId]: voteType }));
                setVotes(prev => ({
                    ...prev,
                    [postId]: {
                        upvotes: prev[postId].upvotes + (voteType === 1 ? 1 : 0) - (oldVote === 1 ? 1 : 0),
                        downvotes: prev[postId].downvotes + (voteType === -1 ? 1 : 0) - (oldVote === -1 ? 1 : 0),
                        total: prev[postId].total + voteType - oldVote
                    }
                }));
            }
        } catch (error) {
            console.error('Error handling vote:', error);
            alert('Failed to vote');
        }
    };

    // Filter and sort posts
    useEffect(() => {
        let sorted = [...posts];
        
        switch (filterBy) {
            case 'mostComments':
                sorted.sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0));
                break;
            case 'mostUpvotes':
                sorted.sort((a, b) => {
                    const aVotes = votes[a.id]?.total || 0;
                    const bVotes = votes[b.id]?.total || 0;
                    return bVotes - aVotes;
                });
                break;
            case 'newest':
            default:
                sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
        }
        
        setFilteredPosts(sorted);
    }, [posts, votes, filterBy]);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="forum-list-loading">
                <div className="loading-spinner"></div>
                <p>Loading posts...</p>
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="forum-list-empty">
                <h3>No posts yet</h3>
                <p>Be the first to create a post!</p>
            </div>
        );
    }

    return (
        <div className="forum-list">
            <div className="forum-filters">
                <label htmlFor="filter-select">Sort by:</label>
                <select 
                    id="filter-select"
                    value={filterBy} 
                    onChange={(e) => setFilterBy(e.target.value)}
                    className="filter-select"
                >
                    <option value="newest">Newest First</option>
                    <option value="mostComments">Most Comments</option>
                    <option value="mostUpvotes">Most Upvotes</option>
                </select>
            </div>
            
            {filteredPosts.map(post => (
                <div key={post.id} className="post-card">
                    <div className="post-header">
                        <h3 className="post-title">{post.title}</h3>
                        <button 
                            className="delete-btn"
                            onClick={() => handleDeletePost(post.id)}
                            title="Delete post"
                        >
                            ×
                        </button>
                    </div>
                    
                    <div className="post-content">
                        <p className="post-description">{post.description}</p>
                        <div className="post-meta">
                            <span className="post-date">{formatDate(post.created_at)}</span>
                            <span className="post-stats">
                                {post.commentCount || 0} comments • {votes[post.id]?.total || 0} points
                            </span>
                        </div>
                    </div>

                    <div className="post-actions">
                        <div className="voting-section">
                            <button 
                                className={`vote-btn upvote ${userVotes[post.id] === 1 ? 'active' : ''}`}
                                onClick={() => handleVote(post.id, 1)}
                                title="Upvote"
                            >
                                ▲
                            </button>
                            <span className="vote-count">{votes[post.id]?.total || 0}</span>
                            <button 
                                className={`vote-btn downvote ${userVotes[post.id] === -1 ? 'active' : ''}`}
                                onClick={() => handleVote(post.id, -1)}
                                title="Downvote"
                            >
                                ▼
                            </button>
                        </div>
                        
                        <button 
                            className="comments-toggle"
                            onClick={() => toggleComments(post.id)}
                        >
                            {expandedPosts.has(post.id) ? 'Hide Comments' : 'Show Comments'}
                            {comments[post.id] ? ` (${comments[post.id].length})` : (post.commentCount ? ` (${post.commentCount})` : '')}
                        </button>
                    </div>

                    {expandedPosts.has(post.id) && (
                        <div className="comments-section">
                            <div className="comments-list">
                                {comments[post.id]?.map(comment => (
                                    <div key={comment.id} className="comment">
                                        <div className="comment-header">
                                            <p className="comment-content">{comment.content}</p>
                                            <button 
                                                className="comment-delete-btn"
                                                onClick={() => handleDeleteComment(post.id, comment.id)}
                                                title="Delete comment"
                                            >
                                                ×
                                            </button>
                                        </div>
                                        <span className="comment-date">{formatDate(comment.created_at)}</span>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="add-comment">
                                <textarea
                                    placeholder="Write a comment..."
                                    value={newComment[post.id] || ''}
                                    onChange={(e) => setNewComment(prev => ({
                                        ...prev,
                                        [post.id]: e.target.value
                                    }))}
                                    className="comment-input"
                                    rows="3"
                                />
                                <button 
                                    className="btn btn-primary btn-small"
                                    onClick={() => handleAddComment(post.id)}
                                >
                                    Add Comment
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

export default ForumList;
