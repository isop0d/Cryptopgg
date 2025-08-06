import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

function CreatePost() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!title.trim() || !description.trim()) {
            alert('Please fill in both title and description');
            return;
        }

        setIsSubmitting(true);
        
        try {
            const { data, error } = await supabase 
                .from('posts')
                .insert([
                    {
                        title: title.trim(),
                        description: description.trim(),
                        created_at: new Date().toISOString(),
                    }
                ])
                .select();

            if (error) {
                console.error('Error creating post:', error);
                alert('Failed to create post. Please try again.');
                return;
            }

            console.log('Post created successfully:', data);
            
            // Reset form
            setTitle('');
            setDescription('');
            
            // Navigate back to forum
            navigate('/forum');
            
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Failed to create post. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="create-post-container">
            <div className="create-post-card">
                <h1>Create New Post</h1>
                <form onSubmit={handleSubmit} className="create-post-form">
                    <div className="form-group">
                        <label htmlFor="title">Title</label>
                        <input 
                            type="text" 
                            id="title" 
                            name="title" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter your post title..."
                            required 
                            className="form-input"
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="description">Description</label>
                        <textarea 
                            id="description" 
                            name="description" 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter your post description..."
                            required 
                            className="form-textarea"
                            rows="6"
                        />
                    </div>
                    
                    <div className="form-actions">
                        <button 
                            type="button" 
                            onClick={() => navigate('/forum')}
                            className="btn btn-secondary"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="btn btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Creating...' : 'Create Post'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CreatePost;