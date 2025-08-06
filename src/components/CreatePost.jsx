import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

function CreatePost() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }
            
            // Validate file size (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size must be less than 5MB');
                return;
            }
            
            setSelectedImage(file);
            
            // Create preview URL
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);
        }
    };

    const removeImage = () => {
        setSelectedImage(null);
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
            setImagePreview(null);
        }
    };

    const uploadImage = async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `post-images/${fileName}`;

        const { data, error } = await supabase.storage
            .from('post-images')
            .upload(filePath, file);

        if (error) {
            console.error('Error uploading image:', error);
            throw error;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('post-images')
            .getPublicUrl(filePath);

        return publicUrl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!title.trim() || !description.trim()) {
            alert('Please fill in both title and description');
            return;
        }

        setIsSubmitting(true);
        
        try {
            let imageUrl = null;
            
            // Upload image if one is selected
            if (selectedImage) {
                try {
                    imageUrl = await uploadImage(selectedImage);
                } catch (imageError) {
                    console.error('Error uploading image:', imageError);
                    alert('Failed to upload image. Please try again.');
                    return;
                }
            }

            const { data, error } = await supabase 
                .from('posts')
                .insert([
                    {
                        title: title.trim(),
                        description: description.trim(),
                        image_url: imageUrl,
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
            removeImage();
            
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

                    <div className="form-group">
                        <label htmlFor="image">Image (Optional)</label>
                        <input 
                            type="file" 
                            id="image" 
                            name="image" 
                            accept="image/*"
                            onChange={handleImageChange}
                            className="form-file-input"
                            disabled={isSubmitting}
                        />
                        <p className="file-help-text">
                            Supported formats: JPG, PNG, GIF. Max size: 5MB
                        </p>
                        
                        {imagePreview && (
                            <div className="image-preview">
                                <img src={imagePreview} alt="Preview" className="preview-image" />
                                <button 
                                    type="button" 
                                    onClick={removeImage}
                                    className="remove-image-btn"
                                    disabled={isSubmitting}
                                >
                                    Remove Image
                                </button>
                            </div>
                        )}
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