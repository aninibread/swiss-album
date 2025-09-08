export interface UserProfile {
    name: string;
    avatar: string;
}

export const USER_PROFILES: Record<string, UserProfile> = {
    "anni": {
        name: "Anni",
        avatar: "albums/avatars/anni.jpg"
    },
    "andy": {
        name: "Andy",
        avatar: "albums/avatars/andy.jpg" 
    },
    "franco": {
        name: "Franco",
        avatar: "albums/avatars/franco.jpg"
    },
    "lu": {
        name: "Kevin L.",
        avatar: "albums/avatars/lu.jpg"
    },
    "meng": {
        name: "Kevin M.",
        avatar: "albums/avatars/meng.jpg"
    }
};

export function getUserProfile(userId: string): UserProfile {
    return USER_PROFILES[userId] || {
        name: userId,
        avatar: "albums/avatars/default.jpg"
    };
}