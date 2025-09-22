// Simple test script for media comments API
const API_BASE = 'http://localhost:5173';

async function testCommentsAPI() {
    console.log('🧪 Testing Media Comments API...\n');
    
    // Test credentials (adjust these to match your test user)
    const testUser = {
        userId: 'dan',
        password: 'test'
    };
    
    // Test media ID (you'll need to get a valid media ID from your database)
    const testMediaId = 'media-test-123'; // Update this with a real media ID
    
    try {
        // Test 1: Get comments for media (should return empty array)
        console.log('1. Testing GET /api/media/:mediaId/comments');
        const getUrl = `${API_BASE}/api/media/${testMediaId}/comments?userId=${testUser.userId}&password=${testUser.password}`;
        const getResponse = await fetch(getUrl);
        const comments = await getResponse.json();
        console.log('Comments:', comments);
        console.log('Status:', getResponse.status, '\n');
        
        // Test 2: Add a comment
        console.log('2. Testing POST /api/media/:mediaId/comments');
        const addResponse = await fetch(`${API_BASE}/api/media/${testMediaId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...testUser,
                content: 'This is a test comment!'
            })
        });
        const newComment = await addResponse.json();
        console.log('New comment:', newComment);
        console.log('Status:', addResponse.status, '\n');
        
        if (newComment.id) {
            // Test 3: Update the comment
            console.log('3. Testing PUT /api/comments/:commentId');
            const updateResponse = await fetch(`${API_BASE}/api/comments/${newComment.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...testUser,
                    content: 'This is an updated test comment!'
                })
            });
            const updatedComment = await updateResponse.json();
            console.log('Updated comment:', updatedComment);
            console.log('Status:', updateResponse.status, '\n');
            
            // Test 4: Delete the comment
            console.log('4. Testing DELETE /api/comments/:commentId');
            const deleteResponse = await fetch(`${API_BASE}/api/comments/${newComment.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testUser)
            });
            const deleteResult = await deleteResponse.json();
            console.log('Delete result:', deleteResult);
            console.log('Status:', deleteResponse.status, '\n');
        }
        
        console.log('✅ All tests completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test if this is being executed directly
if (typeof window === 'undefined') {
    testCommentsAPI();
}