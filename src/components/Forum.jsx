import ForumList from './ForumList';

function Forum() {
    return (
        <div className='forum'>
            <div className="forum-header">
                <h1>Crypto Discussion Forum</h1>
                <p>Share your thoughts, insights, and questions about cryptocurrency</p>
            </div>
            <ForumList />
        </div>
    )
}

export default Forum;