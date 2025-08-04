import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';

function CreatePost() {
    return (
        <div className="create-post-container">
            <h1>Create Post</h1>
            <form>
                <div className="form-group">
                    <label htmlFor="title">Title</label>
                    <input type="text" id="title" name="title" required />
                </div>
            </form>
        </div>
    )
}
export default CreatePost;