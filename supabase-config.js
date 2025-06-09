// --- SUPABASE CONFIGURATION AND SETUP ---

// Supabase configuration - UPDATE THESE WITH YOUR PROJECT DETAILS
const SUPABASE_URL = 'https://pzcqsorfobygydxkdmzc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6Y3Fzb3Jmb2J5Z3lkeGtkbXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTA0NTY1NiwiZXhwIjoyMDY0NjIxNjU2fQ.QLyhYgHbshBHYtrun8G6w4m1dRQvFaw3QfdZnLDePhA';

// Create Supabase client - we'll initialize this after the library loads
let supabaseClient = null;

// Collaboration state
const collaborationState = {
    currentUser: null,
    isOnline: false,
    connectedUsers: new Map(),
    activeChannel: null,
    sessionId: null,
    projectId: null,
    lastActivity: Date.now(),
    syncTimeout: null
};

// Simple function to wait for Supabase - FIXED VERSION
function waitForSupabase(maxAttempts = 30) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        
        const checkSupabase = () => {
            attempts++;
            console.log(`🔄 Attempt ${attempts}: Checking for Supabase...`);
            
            // Simple check - just look for window.supabase.createClient
            if (window.supabase && typeof window.supabase.createClient === 'function') {
                console.log('✅ Found Supabase at window.supabase.createClient');
                resolve(window.supabase.createClient);
                return;
            }
            
            if (attempts >= maxAttempts) {
                console.error('❌ Supabase not found after', maxAttempts, 'attempts');
                console.log('Debug info:', {
                    'window.supabase': typeof window.supabase,
                    'window.supabase.createClient': window.supabase ? typeof window.supabase.createClient : 'N/A'
                });
                reject(new Error('Supabase library not available'));
                return;
            }
            
            setTimeout(checkSupabase, 100);
        };
        
        checkSupabase();
    });
}

// Initialize Supabase client when DOM is ready
async function initializeSupabase() {
    try {
        console.log('🔄 Waiting for Supabase library...');
        const createClientFn = await waitForSupabase();
        
        console.log('🔄 Creating Supabase client...');
        supabaseClient = createClientFn(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        console.log('✅ Supabase client initialized:', !!supabaseClient);
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        if (typeof addError === 'function') {
            addError('Failed to connect to collaboration service: ' + error.message);
        }
        return false;
    }
}

// Test function to verify Supabase is working
async function testSupabaseConnection() {
    if (!supabaseClient) {
        console.error('❌ Supabase client not initialized');
        return false;
    }
    
    try {
        console.log('🧪 Testing Supabase connection...');
        // Try a simple operation to test the connection
        const { data, error } = await supabaseClient
            .from('collaboration_sessions')
            .select('count')
            .limit(1);
        
        if (error) {
            console.log('⚠️ Connection test failed (this might be OK if tables don\'t exist):', error.message);
        } else {
            console.log('✅ Supabase connection successful');
        }
        return true;
    } catch (error) {
        console.error('❌ Supabase connection test failed:', error);
        return false;
    }
}

// User authentication and session management
async function authenticateUser(email, name = null) {
    if (!supabaseClient) {
        console.error('❌ Supabase client not initialized');
        return false;
    }

    try {
        console.log('🔄 Authenticating user:', email);
        
        collaborationState.currentUser = {
            email: email.toLowerCase(),
            name: name || email.split('@')[0],
            joinedAt: new Date().toISOString()
        };

        collaborationState.sessionId = generateSessionId();
        collaborationState.projectId = generateProjectId();

        // Test the connection first
        const connectionTest = await testSupabaseConnection();
        if (!connectionTest) {
            console.warn('⚠️ Connection test failed, but continuing...');
        }

        // Insert/update session record
        const { error } = await supabaseClient
            .from('collaboration_sessions')
            .upsert({
                project_id: collaborationState.projectId,
                user_email: collaborationState.currentUser.email,
                user_name: collaborationState.currentUser.name,
                last_activity: new Date().toISOString(),
                is_active: true
            });

        if (error) {
            console.error('❌ Session upsert error:', error);
            return false;
        }

        console.log('✅ User authenticated:', collaborationState.currentUser);
        return true;
    } catch (error) {
        console.error('❌ Authentication error:', error);
        return false;
    }
}

// Initialize real-time collaboration
async function initializeCollaboration() {
    if (!supabaseClient || !collaborationState.currentUser) {
        console.error('❌ Cannot initialize collaboration: missing client or user');
        return false;
    }

    try {
        console.log('🔄 Initializing collaboration...');
        
        // Create a channel for this project
        const channelName = `project:${collaborationState.projectId}`;
        collaborationState.activeChannel = supabaseClient.channel(channelName);

        // Subscribe to presence (who's online)
        collaborationState.activeChannel
            .on('presence', { event: 'sync' }, () => {
                const presenceState = collaborationState.activeChannel.presenceState();
                updateOnlineUsers(presenceState);
            })
            .on('presence', { event: 'join' }, ({ newPresences }) => {
                console.log('👥 User joined:', newPresences);
                updateOnlineUsers(collaborationState.activeChannel.presenceState());
            })
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                console.log('👋 User left:', leftPresences);
                updateOnlineUsers(collaborationState.activeChannel.presenceState());
            });

        // Subscribe to tag updates
        collaborationState.activeChannel
            .on('broadcast', { event: 'tag_updated' }, (payload) => {
                handleRemoteTagUpdate(payload);
            })
            .on('broadcast', { event: 'tag_deleted' }, (payload) => {
                handleRemoteTagDeletion(payload);
            });

        // Subscribe to database changes
        collaborationState.activeChannel
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'collaborative_tags',
                filter: `project_id=eq.${collaborationState.projectId}`
            }, (payload) => {
                handleDatabaseChange(payload);
            });

        await collaborationState.activeChannel.subscribe(async (status) => {
            console.log('📡 Channel subscription status:', status);
            
            if (status === 'SUBSCRIBED') {
                // Track this user's presence
                await collaborationState.activeChannel.track({
                    user_email: collaborationState.currentUser.email,
                    user_name: collaborationState.currentUser.name,
                    online_at: new Date().toISOString(),
                    current_room: null
                });
                
                collaborationState.isOnline = true;
                console.log('✅ Collaboration initialized successfully');
                updateCollaborationUI();
                
                // Load existing tags from Supabase
                await syncTagsFromSupabase();
            } else {
                console.warn('⚠️ Channel subscription failed:', status);
            }
        });

        return true;
    } catch (error) {
        console.error('❌ Collaboration initialization error:', error);
        return false;
    }
}

// Generate session and project IDs
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
}

function generateProjectId() {
    // Use building names or a hash of the loaded data to create consistent project IDs
    const buildings = state.availableBuildings.join('_');
    return buildings ? 'project_' + btoa(buildings).substring(0, 10) : 'default_project';
}

// Update online users display
function updateOnlineUsers(presenceState) {
    collaborationState.connectedUsers.clear();
    
    Object.values(presenceState).forEach(presenceList => {
        presenceList.forEach(presence => {
            collaborationState.connectedUsers.set(presence.user_email, {
                email: presence.user_email,
                name: presence.user_name,
                online_at: presence.online_at,
                current_room: presence.current_room
            });
        });
    });

    updateCollaborationUI();
}

// Update collaboration UI elements
function updateCollaborationUI() {
    const statusElement = document.getElementById('collaboration-status');
    if (statusElement) {
        const onlineCount = collaborationState.connectedUsers.size;
        const statusClass = collaborationState.isOnline ? 'text-green-600' : 'text-red-600';
        const statusText = collaborationState.isOnline ? 'Connected' : 'Offline';
        
        statusElement.innerHTML = `
            <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full ${collaborationState.isOnline ? 'bg-green-500' : 'bg-red-500'}"></div>
                <span class="${statusClass} text-sm font-medium">${statusText}</span>
                ${onlineCount > 0 ? `<span class="text-gray-500 text-sm">(${onlineCount} online)</span>` : ''}
            </div>
        `;
    }

    const usersElement = document.getElementById('online-users');
    if (usersElement && collaborationState.connectedUsers.size > 0) {
        usersElement.innerHTML = Array.from(collaborationState.connectedUsers.values())
            .map(user => `
                <div class="flex items-center gap-2 text-sm">
                    <div class="w-2 h-2 rounded-full bg-green-500"></div>
                    <span>${sanitizeHTML(user.name)}</span>
                </div>
            `).join('');
    }
}

// Sync tags from Supabase to local state
async function syncTagsFromSupabase() {
    if (!supabaseClient || !collaborationState.projectId) return;

    try {
        const { data: tags, error } = await supabaseClient
            .from('collaborative_tags')
            .select('*')
            .eq('project_id', collaborationState.projectId)
            .eq('is_active', true);

        if (error) {
            console.error('Error syncing tags:', error);
            return;
        }

        // Convert Supabase tags to local format and merge with existing custom tags
        if (tags) {
            tags.forEach(dbTag => {
                const roomId = findRoomIdByIdentifier(dbTag.room_identifier);
                if (roomId) {
                    if (!state.customTags[roomId]) {
                        state.customTags[roomId] = [];
                    }

                    // Check if tag already exists locally
                    const existingIndex = state.customTags[roomId].findIndex(
                        localTag => localTag.name === dbTag.tag_name
                    );

                    const tagObject = {
                        id: dbTag.id,
                        name: dbTag.tag_name,
                        type: dbTag.tag_type,
                        description: dbTag.description || '',
                        link: dbTag.link || '',
                        contact: dbTag.contact || '',
                        imageUrl: dbTag.image_url || '',
                        color: dbTag.color,
                        created: dbTag.created_at,
                        isRich: dbTag.tag_type !== 'simple' || !!dbTag.description || !!dbTag.link || !!dbTag.contact || !!dbTag.image_url,
                        collaborative: true,
                        created_by: dbTag.created_by
                    };

                    if (existingIndex >= 0) {
                        // Update existing tag
                        state.customTags[roomId][existingIndex] = tagObject;
                    } else {
                        // Add new tag
                        state.customTags[roomId].push(tagObject);
                    }
                }
            });

            // Update search index and UI
            await createSearchIndex();
            if (typeof updateResults === 'function') {
                updateResults();
            }
            
            console.log(`✅ Synced ${tags.length} collaborative tags`);
        }
    } catch (error) {
        console.error('Sync error:', error);
    }
}

// Find room ID by various identifiers
function findRoomIdByIdentifier(identifier) {
    // Try to find room by rmrecnbr first, then by room.id
    let room = state.processedData.find(r => String(r.rmrecnbr) === String(identifier));
    if (!room) {
        room = state.processedData.find(r => String(r.id) === String(identifier));
    }
    if (!room) {
        room = state.processedData.find(r => String(r.rmnbr) === String(identifier));
    }
    return room ? room.id : null;
}

// Save tag to Supabase
async function saveTagToSupabase(roomId, tagObject) {
    if (!supabaseClient || !collaborationState.currentUser) return false;

    try {
        const room = state.processedData.find(r => r.id === roomId);
        if (!room) return false;

        const roomIdentifier = room.rmrecnbr || room.id;
        
        const tagData = {
            room_identifier: String(roomIdentifier),
            tag_name: tagObject.name,
            tag_type: tagObject.type || 'simple',
            description: tagObject.description || null,
            link: tagObject.link || null,
            contact: tagObject.contact || null,
            image_url: tagObject.imageUrl || null,
            color: tagObject.color || 'blue',
            created_by: collaborationState.currentUser.email,
            updated_by: collaborationState.currentUser.email,
            project_id: collaborationState.projectId,
            is_active: true
        };

        const { data, error } = await supabaseClient
            .from('collaborative_tags')
            .upsert(tagData)
            .select();

        if (error) {
            console.error('Error saving tag to Supabase:', error);
            return false;
        }

        // Broadcast the update to other users
        if (collaborationState.activeChannel) {
            await collaborationState.activeChannel.send({
                type: 'broadcast',
                event: 'tag_updated',
                payload: {
                    room_id: roomId,
                    tag: tagObject,
                    user: collaborationState.currentUser
                }
            });
        }

        // Log the activity
        await logTagActivity(roomIdentifier, 'added', tagObject.name, null, tagData);

        console.log('✅ Tag saved to Supabase:', tagObject.name);
        return true;
    } catch (error) {
        console.error('Save tag error:', error);
        return false;
    }
}

// Delete tag from Supabase
async function deleteTagFromSupabase(roomId, tagObject) {
    if (!supabaseClient || !collaborationState.currentUser) return false;

    try {
        const room = state.processedData.find(r => r.id === roomId);
        if (!room) return false;

        const roomIdentifier = room.rmrecnbr || room.id;

        const { error } = await supabaseClient
            .from('collaborative_tags')
            .update({ is_active: false, updated_by: collaborationState.currentUser.email })
            .eq('room_identifier', String(roomIdentifier))
            .eq('tag_name', tagObject.name)
            .eq('project_id', collaborationState.projectId);

        if (error) {
            console.error('Error deleting tag from Supabase:', error);
            return false;
        }

        // Broadcast the deletion to other users
        if (collaborationState.activeChannel) {
            await collaborationState.activeChannel.send({
                type: 'broadcast',
                event: 'tag_deleted',
                payload: {
                    room_id: roomId,
                    tag_name: tagObject.name,
                    user: collaborationState.currentUser
                }
            });
        }

        // Log the activity
        await logTagActivity(roomIdentifier, 'deleted', tagObject.name, tagObject, null);

        console.log('✅ Tag deleted from Supabase:', tagObject.name);
        return true;
    } catch (error) {
        console.error('Delete tag error:', error);
        return false;
    }
}

// Handle remote tag updates
function handleRemoteTagUpdate(payload) {
    if (payload.user?.email === collaborationState.currentUser?.email) {
        return; // Ignore our own updates
    }

    console.log('📥 Remote tag update:', payload);
    
    // Show notification
    showCollaborationNotification(`${payload.user?.name || 'Someone'} added tag "${payload.tag.name}"`);
    
    // The database change will trigger a sync, so we don't need to manually update here
}

// Handle remote tag deletions
function handleRemoteTagDeletion(payload) {
    if (payload.user?.email === collaborationState.currentUser?.email) {
        return; // Ignore our own deletions
    }

    console.log('📥 Remote tag deletion:', payload);
    
    // Show notification
    showCollaborationNotification(`${payload.user?.name || 'Someone'} removed tag "${payload.tag_name}"`);
    
    // Remove from local state
    const roomTags = state.customTags[payload.room_id];
    if (roomTags) {
        const index = roomTags.findIndex(tag => tag.name === payload.tag_name);
        if (index >= 0) {
            roomTags.splice(index, 1);
            // Update UI
            if (typeof updateResults === 'function') {
                updateResults();
            }
        }
    }
}

// Handle database changes (backup sync mechanism)
function handleDatabaseChange(payload) {
    console.log('📊 Database change:', payload);
    
    // Debounce rapid changes
    clearTimeout(collaborationState.syncTimeout);
    collaborationState.syncTimeout = setTimeout(() => {
        syncTagsFromSupabase();
    }, 1000);
}

// Log tag activity
async function logTagActivity(roomIdentifier, action, tagName, oldData, newData) {
    if (!supabaseClient || !collaborationState.currentUser) return;

    try {
        await supabaseClient
            .from('tag_activity_log')
            .insert({
                project_id: collaborationState.projectId,
                room_identifier: String(roomIdentifier),
                action: action,
                tag_name: tagName,
                user_email: collaborationState.currentUser.email,
                user_name: collaborationState.currentUser.name,
                old_data: oldData,
                new_data: newData
            });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// Show collaboration notifications
function showCollaborationNotification(message) {
    // Create a toast notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-16 right-4 bg-blue-100 border border-blue-300 text-blue-800 px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in';
    notification.innerHTML = `
        <div class="flex items-center gap-2">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"/>
            </svg>
            <span class="text-sm">${sanitizeHTML(message)}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 4 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Cleanup collaboration when leaving
function cleanupCollaboration() {
    if (collaborationState.activeChannel) {
        collaborationState.activeChannel.unsubscribe();
    }
    
    collaborationState.isOnline = false;
    collaborationState.connectedUsers.clear();
    updateCollaborationUI();
}

// Update user presence when working on a room
async function updateUserPresence(roomId = null) {
    if (!collaborationState.activeChannel) return;

    try {
        await collaborationState.activeChannel.track({
            user_email: collaborationState.currentUser.email,
            user_name: collaborationState.currentUser.name,
            online_at: new Date().toISOString(),
            current_room: roomId
        });
    } catch (error) {
        console.error('Error updating presence:', error);
    }
}

// Make functions available globally
window.supabaseCollaboration = {
    initializeSupabase,
    authenticateUser,
    initializeCollaboration,
    saveTagToSupabase,
    deleteTagFromSupabase,
    updateUserPresence,
    cleanupCollaboration,
    collaborationState,
    testSupabaseConnection  // Add test function
};
