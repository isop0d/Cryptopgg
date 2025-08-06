import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

function PostDetail() {
    const { postId } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [votes, setVotes] = useState({ upvotes: 0, downvotes: 0, total: 0 });
    const [userVote, setUserVote] = useState(null);

    useEffect(() => {
        if (postId) {
            fetchPost();
            fetchComments();
            fetchVotes();
        }
    }, [postId]);

    const fetchPost = async () => {
        try {
            const { data, error } = await supabase
                .from('posts')
                .select('*')
                .eq('id', postId)
                .single();

            if (error) {
                console.error('Error fetching post:', error);
                navigate('/forum');
                return;
            }

            setPost(data);
        } catch (error) {
            console.error('Error fetching post:', error);
            navigate('/forum');
        } finally {
            setLoading(false);
        }
    };

    const fetchComments = async () => {
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

            setComments(data || []);
        } catch (error) {
            console.error('Error fetching comments:', error);
        }
    };

    const fetchVotes = async () => {
        try {
            const { data, error } = await supabase
                .from('votes')
                .select('vote_type, user_ip')
                .eq('post_id', postId);

            if (error) {
                console.error('Error fetching votes:', error);
                return;
            }

            // Calculate vote counts and user vote
            const voteCounts = { upvotes: 0, downvotes: 0, total: 0 };
            const userIp = await getUserIP();
            let userVoteData = null;

            data?.forEach(vote => {
                if (vote.vote_type === 1) {
                    voteCounts.upvotes++;
                } else if (vote.vote_type === -1) {
                    voteCounts.downvotes++;
                }
                voteCounts.total = voteCounts.upvotes - voteCounts.downvotes;

                // Check if current user has voted
                if (vote.user_ip === userIp) {
                    userVoteData = vote.vote_type;
                }
            });

            setVotes(voteCounts);
            setUserVote(userVoteData);
        } catch (error) {
            console.error('Error fetching votes:', error);
        }
    };

    const getUserIP = async () => {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            // Fallback to localStorage identifier
            let userIdentifier = localStorage.getItem('user_identifier');
            if (!userIdentifier) {
                userIdentifier = 'user_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('user_identifier', userIdentifier);
            }
            return userIdentifier;
        }
    };

    const handleVote = async (voteType) => {
        try {
            const userIp = await getUserIP();

            if (userVote === voteType) {
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
                setUserVote(null);
                setVotes(prev => ({
                    upvotes: prev.upvotes - (voteType === 1 ? 1 : 0),
                    downvotes: prev.downvotes - (voteType === -1 ? 1 : 0),
                    total: prev.total - voteType
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
                const oldVote = userVote || 0;
                setUserVote(voteType);
                setVotes(prev => ({
                    upvotes: prev.upvotes + (voteType === 1 ? 1 : 0) - (oldVote === 1 ? 1 : 0),
                    downvotes: prev.downvotes + (voteType === -1 ? 1 : 0) - (oldVote === -1 ? 1 : 0),
                    total: prev.total + voteType - oldVote
                }));
            }
        } catch (error) {
            console.error('Error handling vote:', error);
            alert('Failed to vote');
        }
    };

    const handleAddComment = async () => {
        const commentText = newComment.trim();
        
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
            setComments(prev => [...prev, ...data]);
            setNewComment('');

        } catch (error) {
            console.error('Error adding comment:', error);
            alert('Failed to add comment');
        }
    };

    const handleDeleteComment = async (commentId) => {
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
            setComments(prev => prev.filter(comment => comment.id !== commentId));

        } catch (error) {
            console.error('Error deleting comment:', error);
            alert('Failed to delete comment');
        }
    };

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
            <div className="post-detail-loading">
                <div className="loading-spinner"></div>
                <p>Loading post...</p>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="post-detail-error">
                <h3>Post not found</h3>
                <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/forum')}
                >
                    Back to Forum
                </button>
            </div>
        );
    }

    return (
        <div className="post-detail">
            <div className="post-detail-header">
                <button 
                    className="back-btn"
                    onClick={() => navigate('/forum')}
                    title="Back to forum"
                >
                    ← Back to Forum
                </button>
            </div>

            <div className="post-detail-card">
                <div className="post-detail-content">
                    <h1 className="post-detail-title">{post.title}</h1>
                    
                    <div className="post-detail-meta">
                        <span className="post-detail-date">{formatDate(post.created_at)}</span>
                        <span className="post-detail-stats">
                            {comments.length} comments • {votes.total} points
                        </span>
                    </div>

                    <div className="post-detail-description">
                        <p>{post.description}</p>
                    </div>

                    {post.image_url && (
                        <div className="post-detail-image">
                            <img 
                                src={post.image_url} 
                                alt={post.title}
                                className="post-detail-image-display"
                            />
                        </div>
                    )}

                    <div className="post-detail-actions">
                        <div className="voting-section">
                            <button 
                                className={`vote-btn upvote ${userVote === 1 ? 'active' : ''}`}
                                onClick={() => handleVote(1)}
                                title="Upvote"
                            >
                                ▲
                            </button>
                            <span className="vote-count">{votes.total}</span>
                            <button 
                                className={`vote-btn downvote ${userVote === -1 ? 'active' : ''}`}
                                onClick={() => handleVote(-1)}
                                title="Downvote"
                            >
                                ▼
                            </button>
                        </div>
                    </div>
                </div>

                <div className="comments-section">
                    <h3>Comments ({comments.length})</h3>
                    
                    <div className="add-comment">
                        <textarea
                            placeholder="Write a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="comment-input"
                            rows="3"
                        />
                        <button 
                            className="btn btn-primary btn-small"
                            onClick={handleAddComment}
                        >
                            Add Comment
                        </button>
                    </div>

                    <div className="comments-list">
                        {comments.map(comment => (
                            <div key={comment.id} className="comment">
                                <div className="comment-header">
                                    <p className="comment-content">{comment.content}</p>
                                    <button 
                                        className="comment-delete-btn"
                                        onClick={() => handleDeleteComment(comment.id)}
                                        title="Delete comment"
                                    >
                                        ×
                                    </button>
                                </div>
                                <span className="comment-date">{formatDate(comment.created_at)}</span>
                            </div>
                        ))}
                        
                        {comments.length === 0 && (
                            <p className="no-comments">No comments yet. Be the first to comment!</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PostDetail;