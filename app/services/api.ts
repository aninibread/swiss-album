class ApiService {
    private userId: string | null = null;
    private password: string | null = null;

    setCredentials(userId: string, password: string) {
        this.userId = userId;
        this.password = password;
        if (typeof window !== 'undefined') {
            localStorage.setItem('user_id', userId);
            localStorage.setItem('user_password', password);
        }
    }

    getCredentials() {
        if (!this.userId || !this.password) {
            if (typeof window !== 'undefined') {
                this.userId = localStorage.getItem('user_id');
                this.password = localStorage.getItem('user_password');
            }
        }
        return { userId: this.userId, password: this.password };
    }

    async request(endpoint: string, data: any = {}) {
        const credentials = this.getCredentials();
        
        const body = {
            ...data,
            ...credentials
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        return response.json();
    }

    async login(userId: string, password: string) {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, password }),
        });

        const result = await response.json() as { success?: boolean; user?: any; error?: string };
        
        if (result.success) {
            this.setCredentials(userId, password);
        }

        return result;
    }

    async register(userId: string, password: string) {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, password }),
        });

        return response.json();
    }

    async getAlbums() {
        return this.request('/api/albums');
    }

    async getAlbumFull(albumId: string) {
        const credentials = this.getCredentials();
        const response = await fetch(`/api/albums/${albumId}/full`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        return response.json();
    }

    async updateEvent(eventId: string, eventData: { name: string; description: string; emoji: string; location?: string }) {
        const credentials = this.getCredentials();
        const response = await fetch(`/api/events/${eventId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...credentials,
                ...eventData
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to update event: ${response.statusText}`);
        }

        return response.json();
    }

    async createEvent(tripDayId: string, eventData: { name: string; description: string; emoji: string; location?: string; sortOrder: number; participantIds?: string[] }) {
        const credentials = this.getCredentials();
        const response = await fetch('/api/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...credentials,
                tripDayId,
                ...eventData
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to create event: ${response.statusText}`);
        }

        return response.json();
    }

    async deleteEvent(eventId: string) {
        const credentials = this.getCredentials();
        const response = await fetch(`/api/events/${eventId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
        });

        if (!response.ok) {
            throw new Error(`Failed to delete event: ${response.statusText}`);
        }

        return response.json();
    }

    async updateTripDay(dayId: string, dayData: { title: string; date: string }) {
        const credentials = this.getCredentials();
        const response = await fetch(`/api/trip-days/${dayId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...credentials,
                ...dayData
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to update trip day: ${response.statusText}`);
        }

        return response.json();
    }

    async createTripDay(albumId: string, dayData: { title: string; date: string }) {
        const credentials = this.getCredentials();
        
        const payload = {
            ...credentials,
            albumId,
            ...dayData
        };
        
        const response = await fetch('/api/trip-days', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to create trip day:', response.statusText, errorText);
            throw new Error(`Failed to create trip day: ${response.statusText} - ${errorText}`);
        }

        return await response.json();
    }

    async deleteTripDay(dayId: string) {
        const credentials = this.getCredentials();
        const response = await fetch(`/api/trip-days/${dayId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
        });

        if (!response.ok) {
            throw new Error(`Failed to delete trip day: ${response.statusText}`);
        }

        return response.json();
    }

    async updateEventParticipants(eventId: string, participantId: string, action: 'add' | 'remove') {
        const credentials = this.getCredentials();
        const response = await fetch(`/api/events/${eventId}/participants`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...credentials,
                participantId,
                action
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to update event participants: ${response.statusText}`);
        }

        return response.json();
    }

    async uploadMedia(eventId: string, files: FileList) {
        const credentials = this.getCredentials();
        
        // Import video converter
        const { convertFiles } = await import('../utils/videoConverter');
        
        // Convert .mov files to .mp4 before uploading
        const convertedFiles = await convertFiles(files);
        
        const formData = new FormData();
        
        formData.append('userId', credentials.userId || '');
        formData.append('password', credentials.password || '');
        formData.append('eventId', eventId);
        
        for (let i = 0; i < convertedFiles.length; i++) {
            formData.append('files', convertedFiles[i]);
        }
        
        try {
            const response = await fetch('/api/media/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to upload media:', response.statusText, errorText);
                throw new Error(`Failed to upload media: ${response.statusText} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Media upload failed:', error);
            throw error;
        }
    }

    async deleteMedia(mediaId: string) {
        const credentials = this.getCredentials();
        const response = await fetch(`/api/media/${mediaId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
        });

        if (!response.ok) {
            throw new Error(`Failed to delete media: ${response.statusText}`);
        }

        return response.json();
    }

    async getMediaComments(mediaId: string) {
        const credentials = this.getCredentials();
        const params = new URLSearchParams({
            userId: credentials.userId || '',
            password: credentials.password || ''
        });
        
        const response = await fetch(`/api/media/${mediaId}/comments?${params}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to get comments: ${response.statusText}`);
        }

        return response.json();
    }

    async addMediaComment(mediaId: string, content: string) {
        const credentials = this.getCredentials();
        const response = await fetch(`/api/media/${mediaId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...credentials,
                content
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to add comment: ${response.statusText}`);
        }

        return response.json();
    }

    async updateComment(commentId: string, content: string) {
        const credentials = this.getCredentials();
        const response = await fetch(`/api/comments/${commentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...credentials,
                content
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to update comment: ${response.statusText}`);
        }

        return response.json();
    }

    async deleteComment(commentId: string) {
        const credentials = this.getCredentials();
        const response = await fetch(`/api/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
        });

        if (!response.ok) {
            throw new Error(`Failed to delete comment: ${response.statusText}`);
        }

        return response.json();
    }

    clearCredentials() {
        this.userId = null;
        this.password = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('user_id');
            localStorage.removeItem('user_password');
        }
    }
}

export const api = new ApiService();