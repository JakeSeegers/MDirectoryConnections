// --- WORKSPACE-BASED COLLABORATION SYSTEM - FIXED VERSION (NO NAME CONFLICTS) ---

// Supabase configuration
window.SUPABASE_URL = 'https://pzcqsorfobygydxkdmzc.supabase.co';
window.SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6Y3Fzb3Jmb2J5Z3lkeGtkbXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTA0NTY1NiwiZXhwIjoyMDY0NjIxNjU2fQ.QLyhYgHbshBHYtrun8G6w4m1dRQvFaw3QfdZnLDePhA';

let supabaseClient = null;

// Collaboration state
const collaborationState = {
    isOnline: false,
    currentWorkspace: null,
    currentUser: null,
    connectedUsers: new Map(),
    activeChannel: null
};

// Enhanced initialization with multiple fallback strategies
async function initializeSupabase() {
    try {
        console.log('🔄 Initializing Supabase...');
        
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds
        
        while (attempts < maxAttempts) {
            try {
                // Strategy 1: Modern CDN pattern
                if (window.supabase?.createClient) {
                    supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_SERVICE_KEY);
                    console.log('✅ Supabase initialized via window.supabase.createClient');
                    return true;
                }
                
                // Strategy 2: Direct global createClient
                if (typeof createClient !== 'undefined') {
                    supabaseClient = createClient(window.SUPABASE_URL, window.SUPABASE_SERVICE_KEY);
                    console.log('✅ Supabase initialized via global createClient');
                    return true;
                }
                
                // Strategy 3: Window-attached createClient
                if (window.createClient) {
                    supabaseClient = window.createClient(window.SUPABASE_URL, window.SUPABASE_SERVICE_KEY);
                    console.log('✅ Supabase initialized via window.createClient');
                    return true;
                }
                
                // Strategy 4: Check for alternative namespace
                if (window.SupabaseJS?.createClient) {
                    supabaseClient = window.SupabaseJS.createClient(window.SUPABASE_URL, window.SUPABASE_SERVICE_KEY);
                    console.log('✅ Supabase initialized via window.SupabaseJS.createClient');
                    return true;
                }
                
                // Strategy 5: ES modules pattern
                if (window.supabase && typeof window.supabase === 'object') {
                    const { createClient } = window.supabase;
                    if (createClient) {
                        supabaseClient = createClient(window.SUPABASE_URL, window.SUPABASE_SERVICE_KEY);
                        console.log('✅ Supabase initialized via destructured createClient');
                        return true;
                    }
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
                
                // Debug logging every 20 attempts (2 seconds)
                if (attempts % 20 === 0) {
                    console.log(`🔍 Attempt ${attempts}/${maxAttempts}:`);
                    console.log('  window.supabase:', window.supabase);
                    console.log('  typeof createClient:', typeof createClient);
                    console.log('  window.createClient:', window.createClient);
                    
                    // List all potential Supabase-related globals
                    const potentialGlobals = Object.keys(window).filter(key => 
                        key.toLowerCase().includes('supabase') || 
                        key.toLowerCase().includes('create') ||
                        key.includes('Client')
                    );
                    console.log('  Potential globals:', potentialGlobals);
                }
                
            } catch (clientCreationError) {
                console.error(`❌ Client creation failed on attempt ${attempts}:`, clientCreationError);
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
        }
        
        throw new Error(`Supabase library not available after ${maxAttempts} attempts (${maxAttempts * 100}ms)`);
        
    } catch (error) {
        console.error('❌ Supabase initialization failed:', error);
        
        // Final debug information
        console.log('🔍 Final debug info:');
        console.log('  window.supabase:', window.supabase);
        console.log('  All window properties containing "supabase":', 
            Object.keys(window).filter(k => k.toLowerCase().includes('supabase')));
        console.log('  All window properties containing "create":', 
            Object.keys(window).filter(k => k.toLowerCase().includes('create')));
        
        return false;
    }
}

// Initialize workspace collaboration system with better error handling
async function initializeWorkspaceSystem() {
    try {
        console.log('🔄 Initializing workspace system...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve, { once: true });
            });
        }
        
        // Wait a bit more for external scripts to load
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Initialize Supabase
        const supabaseInitialized = await initializeSupabase();
        if (!supabaseInitialized) {
            console.warn('⚠️ Supabase failed to initialize - workspace features will be disabled');
            // Continue without Supabase but mark the system as initialized
            window.workspaceCollaboration = {
                collaborationState: { ...collaborationState, isOnline: false },
                supabase: null,
                createWorkspace: () => ({ success: false, error: 'Supabase not available' }),
                joinWorkspace: () => ({ success: false, error: 'Supabase not available' }),
                leaveWorkspace: () => console.log('No workspace to leave'),
                saveTagToWorkspace: () => false,
                removeTagFromWorkspace: () => false,
                syncWorkspaceTags: () => Promise.resolve()
            };
            return false;
        }
        
        // Create workspace collaboration object with renamed functions to avoid conflicts
        window.workspaceCollaboration = {
            collaborationState,
            supabase: supabaseClient,
            createWorkspace: createWorkspaceImpl,  // ← RENAMED to avoid conflict
            joinWorkspace: joinWorkspaceImpl,      // ← RENAMED to avoid conflict
            leaveWorkspace: leaveWorkspaceImpl,    // ← RENAMED to avoid conflict
            saveTagToWorkspace: saveTagToWorkspaceImpl,
            removeTagFromWorkspace: removeTagFromWorkspaceImpl,
            syncWorkspaceTags: syncWorkspaceTagsImpl
        };
        
        console.log('✅ Workspace system initialized successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Failed to initialize workspace system:', error);
        
        // Provide a fallback workspace object
        window.workspaceCollaboration = {
            collaborationState: { ...collaborationState, isOnline: false },
            supabase: null,
            createWorkspace: () => ({ success: false, error: 'System initialization failed' }),
            joinWorkspace: () => ({ success: false, error: 'System initialization failed' }),
            leaveWorkspace: () => console.log('System not initialized'),
            saveTagToWorkspace: () => false,
            removeTagFromWorkspace: () => false,
            syncWorkspaceTags: () => Promise.resolve()
        };
        
        return false;
    }
}

// RENAMED: Create a new workspace (was createWorkspace)
async function createWorkspaceImpl(workspaceName, password, creatorName) {
    if (!supabaseClient) return { success: false, error: 'Supabase not initialized' };
    
    try {
        console.log('🔄 Creating workspace:', workspaceName);
        
        // Check if workspace already exists
        const { data: existing } = await supabaseClient
            .from('workspaces')
            .select('id')
            .eq('name', workspaceName)
            .single();
            
        if (existing) {
            return { success: false, error: 'Workspace name already exists' };
        }
        
        // Create workspace
        const { data: workspace, error } = await supabaseClient
            .from('workspaces')
            .insert({
                name: workspaceName,
                password_hash: btoa(password), // Simple encoding (not secure, but demo-friendly)
                created_by: creatorName,
                created_at: new Date().toISOString()
            })
            .select()
            .single();
            
        if (error) throw error;
        
        console.log('✅ Workspace created:', workspaceName);
        return { success: true, workspace };
        
    } catch (error) {
        console.error('❌ Error creating workspace:', error);
        return { success: false, error: error.message };
    }
}

// RENAMED: Join a workspace (was joinWorkspace)
async function joinWorkspaceImpl(workspaceName, password, userName) {
    if (!supabaseClient) return { success: false, error: 'Supabase not initialized' };
    
    try {
        console.log('🔄 Joining workspace:', workspaceName);
        
        // Find workspace and verify password
        const { data: workspace, error } = await supabaseClient
            .from('workspaces')
            .select('*')
            .eq('name', workspaceName)
            .single();
            
        if (error || !workspace) {
            return { success: false, error: 'Workspace not found' };
        }
        
        // Check password
        if (atob(workspace.password_hash) !== password) {
            return { success: false, error: 'Incorrect password' };
        }
        
        // Set up user and workspace
        collaborationState.currentWorkspace = workspace;
        collaborationState.currentUser = {
            name: userName,
            joinedAt: new Date().toISOString()
        };
        
        // Initialize real-time collaboration
        await initializeRealtimeCollaboration(workspace.id);
        
        console.log('✅ Joined workspace:', workspaceName);
        return { success: true, workspace };
        
    } catch (error) {
        console.error('❌ Error joining workspace:', error);
        return { success: false, error: error.message };
    }
}

// Initialize real-time collaboration for workspace
async function initializeRealtimeCollaboration(workspaceId) {
    try {
        const channelName = `workspace_${workspaceId}`;
        collaborationState.activeChannel = supabaseClient.channel(channelName);
        
        // Subscribe to presence (who's online)
        collaborationState.activeChannel
            .on('presence', { event: 'sync' }, () => {
                const presenceState = collaborationState.activeChannel.presenceState();
                updateOnlineUsers(presenceState);
            })
            .on('presence', { event: 'join' }, ({ newPresences }) => {
                console.log('👥 User joined workspace:', newPresences);
                updateOnlineUsers(collaborationState.activeChannel.presenceState());
                showNotification(`${newPresences[0].user_name} joined the workspace`);
            })
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                console.log('👋 User left workspace:', leftPresences);
                updateOnlineUsers(collaborationState.activeChannel.presenceState());
                showNotification(`${leftPresences[0].user_name} left the workspace`);
            });
        
        // Subscribe to tag updates
        collaborationState.activeChannel
            .on('broadcast', { event: 'tag_added' }, (payload) => {
                console.log('📥 Tag added:', payload);
                handleRemoteTagUpdate(payload);
            })
            .on('broadcast', { event: 'tag_removed' }, (payload) => {
                console.log('📥 Tag removed:', payload);
                handleRemoteTagRemoval(payload);
            });
        
        // Subscribe to database changes for this workspace
        collaborationState.activeChannel
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'workspace_tags',
                filter: `workspace_id=eq.${workspaceId}`
            }, (payload) => {
                console.log('📊 Database change:', payload);
                syncWorkspaceTagsImpl();
            });
        
        await collaborationState.activeChannel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                // Track user presence
                await collaborationState.activeChannel.track({
                    user_name: collaborationState.currentUser.name,
                    joined_at: collaborationState.currentUser.joinedAt
                });
                
                collaborationState.isOnline = true;
                
                // Update UI if function exists
                if (typeof updateCollaborationUI === 'function') {
                    updateCollaborationUI();
                } else if (typeof window.updateCollaborationUI === 'function') {
                    window.updateCollaborationUI();
                }
                
                // Load existing workspace tags
                await syncWorkspaceTagsImpl();
                
                console.log('✅ Real-time collaboration active');
                showNotification('✅ Connected to workspace!');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Real-time channel error');
                showNotification('❌ Connection error - trying to reconnect...');
            }
        });
        
    } catch (error) {
        console.error('❌ Real-time collaboration error:', error);
    }
}

// RENAMED: Save tag to workspace (was saveTagToWorkspace)
async function saveTagToWorkspaceImpl(roomId, tagObject) {
    if (!supabaseClient || !collaborationState.currentWorkspace) return false;
    
    try {
        const room = state.processedData.find(r => r.id === roomId);
        if (!room) return false;
        
        const tagData = {
            workspace_id: collaborationState.currentWorkspace.id,
            room_identifier: room.rmrecnbr || room.id,
            tag_name: tagObject.name,
            tag_type: tagObject.type || 'simple',
            tag_data: JSON.stringify(tagObject),
            created_by: collaborationState.currentUser.name,
            created_at: new Date().toISOString()
        };
        
        const { error } = await supabaseClient
            .from('workspace_tags')
            .insert(tagData);
            
        if (error) throw error;
        
        // Broadcast to other users
        await collaborationState.activeChannel.send({
            type: 'broadcast',
            event: 'tag_added',
            payload: {
                room_id: roomId,
                tag: tagObject,
                user: collaborationState.currentUser.name
            }
        });
        
        console.log('✅ Tag saved to workspace:', tagObject.name);
        return true;
        
    } catch (error) {
        console.error('❌ Error saving tag to workspace:', error);
        return false;
    }
}

// RENAMED: Remove tag from workspace (was removeTagFromWorkspace)
async function removeTagFromWorkspaceImpl(roomId, tagObject) {
    if (!supabaseClient || !collaborationState.currentWorkspace) return false;
    
    try {
        const room = state.processedData.find(r => r.id === roomId);
        if (!room) return false;
        
        const { error } = await supabaseClient
            .from('workspace_tags')
            .delete()
            .eq('workspace_id', collaborationState.currentWorkspace.id)
            .eq('room_identifier', room.rmrecnbr || room.id)
            .eq('tag_name', tagObject.name);
            
        if (error) throw error;
        
        // Broadcast to other users
        await collaborationState.activeChannel.send({
            type: 'broadcast',
            event: 'tag_removed',
            payload: {
                room_id: roomId,
                tag_name: tagObject.name,
                user: collaborationState.currentUser.name
            }
        });
        
        console.log('✅ Tag removed from workspace:', tagObject.name);
        return true;
        
    } catch (error) {
        console.error('❌ Error removing tag from workspace:', error);
        return false;
    }
}

// RENAMED: Sync workspace tags to local state (was syncWorkspaceTags)
async function syncWorkspaceTagsImpl() {
    if (!supabaseClient || !collaborationState.currentWorkspace) return;
    
    try {
        const { data: tags, error } = await supabaseClient
            .from('workspace_tags')
            .select('*')
            .eq('workspace_id', collaborationState.currentWorkspace.id);
            
        if (error) throw error;
        
        // Clear existing workspace tags and rebuild
        Object.keys(state.customTags).forEach(roomId => {
            state.customTags[roomId] = state.customTags[roomId].filter(tag => !tag.workspace);
        });
        
        // Add workspace tags
        tags.forEach(dbTag => {
            const roomId = findRoomIdByIdentifier(dbTag.room_identifier);
            if (roomId) {
                if (!state.customTags[roomId]) state.customTags[roomId] = [];
                
                const tagObject = JSON.parse(dbTag.tag_data);
                tagObject.workspace = true;
                tagObject.created_by = dbTag.created_by;
                
                state.customTags[roomId].push(tagObject);
            }
        });
        
        // Update UI if function exists
        if (typeof updateResults === 'function') {
            updateResults();
        } else if (typeof window.updateResults === 'function') {
            window.updateResults();
        }
        
        console.log(`✅ Synced ${tags.length} workspace tags`);
        
    } catch (error) {
        console.error('❌ Error syncing workspace tags:', error);
    }
}

// Handle remote tag updates
function handleRemoteTagUpdate(payload) {
    if (payload.payload?.user === collaborationState.currentUser?.name) return;
    
    showNotification(`${payload.payload?.user} added tag "${payload.payload?.tag?.name}"`);
    syncWorkspaceTagsImpl(); // Refresh tags from server
}

// Handle remote tag removal
function handleRemoteTagRemoval(payload) {
    if (payload.payload?.user === collaborationState.currentUser?.name) return;
    
    showNotification(`${payload.payload?.user} removed tag "${payload.payload?.tag_name}"`);
    syncWorkspaceTagsImpl(); // Refresh tags from server
}

// Update online users display
function updateOnlineUsers(presenceState) {
    collaborationState.connectedUsers.clear();
    
    Object.values(presenceState).forEach(presenceList => {
        presenceList.forEach(presence => {
            collaborationState.connectedUsers.set(presence.user_name, presence);
        });
    });
    
    // Update UI if function exists
    if (typeof updateCollaborationUI === 'function') {
        updateCollaborationUI();
    } else if (typeof window.updateCollaborationUI === 'function') {
        window.updateCollaborationUI();
    }
}

// Show notifications
function showNotification(message) {
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

// Utility function to find room by identifier
function findRoomIdByIdentifier(identifier) {
    let room = state.processedData.find(r => String(r.rmrecnbr) === String(identifier));
    if (!room) room = state.processedData.find(r => String(r.id) === String(identifier));
    if (!room) room = state.processedData.find(r => String(r.rmnbr) === String(identifier));
    return room ? room.id : null;
}

// RENAMED: Leave workspace (was leaveWorkspace)
function leaveWorkspaceImpl() {
    if (collaborationState.activeChannel) {
        collaborationState.activeChannel.unsubscribe();
    }
    
    // Clear workspace tags from local state
    Object.keys(state.customTags).forEach(roomId => {
        state.customTags[roomId] = state.customTags[roomId].filter(tag => !tag.workspace);
    });
    
    collaborationState.isOnline = false;
    collaborationState.currentWorkspace = null;
    collaborationState.currentUser = null;
    collaborationState.connectedUsers.clear();
    
    // Update UI if function exists
    if (typeof updateCollaborationUI === 'function') {
        updateCollaborationUI();
    } else if (typeof window.updateCollaborationUI === 'function') {
        window.updateCollaborationUI();
    }
    
    if (typeof updateResults === 'function') {
        updateResults();
    } else if (typeof window.updateResults === 'function') {
        window.updateResults();
    }
    
    showNotification('📡 Disconnected from workspace');
}

// Utility function for HTML sanitization (if not available globally)
function sanitizeHTML(text) {
    const temp = document.createElement('div');
    temp.textContent = text || '';
    return temp.innerHTML;
}

// === DEBUGGING AND TESTING FUNCTIONS ===

// Simple test function
window.testSupabase = async function() {
    console.log('🧪 Testing Supabase manually...');
    
    try {
        // Try different patterns
        let client = null;
        
        if (window.supabase?.createClient) {
            client = window.supabase.createClient(
                'https://pzcqsorfobygydxkdmzc.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6Y3Fzb3Jmb2J5Z3lkeGtkbXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTA0NTY1NiwiZXhwIjoyMDY0NjIxNjU2fQ.QLyhYgHbshBHYtrun8G6w4m1dRQvFaw3QfdZnLDePhA'
            );
            console.log('✅ Created client via window.supabase.createClient');
        } else if (typeof createClient !== 'undefined') {
            client = createClient(
                'https://pzcqsorfobygydxkdmzc.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6Y3Fzb3Jmb2J5Z3lkeGtkbXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTA0NTY1NiwiZXhwIjoyMDY0NjIxNjU2fQ.QLyhYgHbshBHYtrun8G6w4m1dRQvFaw3QfdZnLDePhA'
            );
            console.log('✅ Created client via global createClient');
        } else {
            throw new Error('No createClient function found');
        }
        
        // Test the client
        console.log('🔧 Client created:', client);
        
        // Try a simple query to test connection
        const { data, error } = await client.from('workspaces').select('*').limit(1);
        if (error) {
            console.log('⚠️ Query error (expected if table doesn\'t exist):', error);
        } else {
            console.log('✅ Query successful:', data);
        }
        
        return client;
        
    } catch (error) {
        console.error('❌ Manual test failed:', error);
        return null;
    }
};

// Debug function
window.debugSupabase = () => {
    console.log('=== SUPABASE DEBUG INFO ===');
    console.log('Current supabaseClient:', supabaseClient);
    console.log('Current workspaceCollaboration:', window.workspaceCollaboration);
    console.log('Collaboration state:', collaborationState);
    
    // Check if Supabase is loaded at all
    console.log('Basic availability:');
    console.log('   window.supabase:', window.supabase);
    console.log('   typeof createClient:', typeof createClient);
    console.log('   window.createClient:', window.createClient);

    // Check all globals that might be related
    const potentialGlobals = Object.keys(window).filter(key => 
        key.toLowerCase().includes('supabase') || 
        key.toLowerCase().includes('create') ||
        key.includes('Client') ||
        key.includes('client')
    );
    console.log('Potential Supabase globals:', potentialGlobals);
    
    // Check script tags
    const scripts = Array.from(document.getElementsByTagName('script'));
    const supabaseScripts = scripts.filter(script => 
        script.src && script.src.includes('supabase')
    );
    console.log('Supabase scripts found:', supabaseScripts.length);
    supabaseScripts.forEach(script => {
        console.log(`   - ${script.src} (loaded: ${script.complete})`);
    });
    
    console.log('=== END DEBUG INFO ===');
    console.log('Call window.testSupabase() to test manually');
};

// === INITIALIZATION ===

// Multiple initialization strategies
function startInitialization() {
    // Strategy 1: Immediate if DOM is ready
    if (document.readyState !== 'loading') {
        initializeWorkspaceSystem();
    } else {
        // Strategy 2: Wait for DOM
        document.addEventListener('DOMContentLoaded', initializeWorkspaceSystem, { once: true });
    }
    
    // Strategy 3: Fallback with window.onload
    window.addEventListener('load', () => {
        if (!window.workspaceCollaboration) {
            console.log('🔄 Fallback initialization triggered by window.onload');
            initializeWorkspaceSystem();
        }
    }, { once: true });
    
    // Strategy 4: Final fallback after 5 seconds
    setTimeout(() => {
        if (!window.workspaceCollaboration) {
            console.log('🔄 Final fallback initialization after 5 seconds');
            initializeWorkspaceSystem();
        }
    }, 5000);
}

// Start initialization immediately
startInitialization();
