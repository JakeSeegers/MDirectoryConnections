// --- UPDATED APP.JS INTEGRATION FOR WORKSPACE COLLABORATION ---
// Add these functions to your app.js and update the existing collaboration functions

// Update the collaboration button click handler
function handleCollaborationButtonClick() {
    if (window.workspaceCollaboration.collaborationState.isOnline) {
        // Already connected, offer to leave workspace
        const workspaceName = window.workspaceCollaboration.collaborationState.currentWorkspace?.name;
        if (confirm(`Leave workspace "${workspaceName}"?`)) {
            window.workspaceCollaboration.leaveWorkspace();
        }
    } else {
        // Not connected, show workspace selection
        showWorkspaceSelectionModal();
    }
}

// Workspace modal functions
function showWorkspaceSelectionModal() {
    const modal = document.getElementById('workspace-selection-modal');
    if (modal) modal.classList.remove('hidden');
}

function hideWorkspaceSelectionModal() {
    const modal = document.getElementById('workspace-selection-modal');
    if (modal) modal.classList.add('hidden');
}

function showCreateWorkspaceModal() {
    hideWorkspaceSelectionModal();
    const modal = document.getElementById('create-workspace-modal');
    if (modal) {
        modal.classList.remove('hidden');
        const nameInput = document.getElementById('new-workspace-name');
        if (nameInput) nameInput.focus();
    }
}

function hideCreateWorkspaceModal() {
    const modal = document.getElementById('create-workspace-modal');
    if (modal) modal.classList.add('hidden');
    clearCreateWorkspaceForm();
}

function showJoinWorkspaceModal() {
    hideWorkspaceSelectionModal();
    const modal = document.getElementById('join-workspace-modal');
    if (modal) {
        modal.classList.remove('hidden');
        const nameInput = document.getElementById('join-workspace-name');
        if (nameInput) nameInput.focus();
    }
}

function hideJoinWorkspaceModal() {
    const modal = document.getElementById('join-workspace-modal');
    if (modal) modal.classList.add('hidden');
    clearJoinWorkspaceForm();
}

function clearCreateWorkspaceForm() {
    const fields = ['new-workspace-name', 'new-workspace-password', 'workspace-creator-name'];
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = '';
    });
}

function clearJoinWorkspaceForm() {
    const fields = ['join-workspace-name', 'join-workspace-password', 'join-user-name'];
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = '';
    });
}

// Create workspace function
async function createWorkspace() {
    const nameField = document.getElementById('new-workspace-name');
    const passwordField = document.getElementById('new-workspace-password');
    const creatorField = document.getElementById('workspace-creator-name');
    
    const workspaceName = nameField?.value?.trim();
    const password = passwordField?.value?.trim();
    const creatorName = creatorField?.value?.trim();
    
    if (!workspaceName || !password || !creatorName) {
        alert('Please fill in all required fields');
        return;
    }
    
    if (workspaceName.length < 3) {
        alert('Workspace name must be at least 3 characters');
        return;
    }
    
    if (password.length < 4) {
        alert('Password must be at least 4 characters');
        return;
    }
    
    try {
        showLoading(true);
        
        const result = await window.workspaceCollaboration.createWorkspace(workspaceName, password, creatorName);
        
        if (result.success) {
            hideCreateWorkspaceModal();
            showCollaborationNotification(`✅ Workspace "${workspaceName}" created! You're now connected.`);
            
            // Automatically join the created workspace
            const joinResult = await window.workspaceCollaboration.joinWorkspace(workspaceName, password, creatorName);
            if (joinResult.success) {
                updateCollaborationUI();
            }
        } else {
            alert('Failed to create workspace: ' + result.error);
        }
    } catch (error) {
        console.error('Create workspace error:', error);
        alert('Error creating workspace: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Join workspace function
async function joinWorkspace() {
    const nameField = document.getElementById('join-workspace-name');
    const passwordField = document.getElementById('join-workspace-password');
    const userField = document.getElementById('join-user-name');
    
    const workspaceName = nameField?.value?.trim();
    const password = passwordField?.value?.trim();
    const userName = userField?.value?.trim();
    
    if (!workspaceName || !password || !userName) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        showLoading(true);
        
        const result = await window.workspaceCollaboration.joinWorkspace(workspaceName, password, userName);
        
        if (result.success) {
            hideJoinWorkspaceModal();
            showCollaborationNotification(`✅ Joined workspace "${workspaceName}"!`);
            updateCollaborationUI();
        } else {
            alert('Failed to join workspace: ' + result.error);
        }
    } catch (error) {
        console.error('Join workspace error:', error);
        alert('Error joining workspace: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Update the addRichTagFromModal function to save to workspace
async function addRichTagFromModal() {
    if (!currentRoomIdForModal) return;
    
    const name = elements.tagNameInput?.value?.trim() || '';
    if (!name) { 
        alert('Please enter a tag name.'); 
        return; 
    }

    const type = elements.tagTypeSelect?.value || 'simple';
    const description = elements.tagDescriptionInput?.value?.trim() || '';
    const link = elements.tagLinkInput?.value?.trim() || '';
    const contact = elements.tagContactInput?.value?.trim() || '';
    const imageUrl = elements.tagImageInput?.value?.trim() || '';
    const selectedColorEl = document.querySelector('#custom-tag-modal .color-option.selected');
    const color = selectedColorEl ? selectedColorEl.dataset.color : 'blue';
    
    const newRichTag = createRichTag(name, type, description, link, contact, imageUrl, color);

    if (!state.customTags[currentRoomIdForModal]) state.customTags[currentRoomIdForModal] = [];
    if (state.customTags[currentRoomIdForModal].some(tag => tag.name.toLowerCase() === newRichTag.name.toLowerCase())) {
        alert(`A tag with the name "${newRichTag.name}" already exists for this room.`); 
        return;
    }
    
    // Add to local state first
    state.customTags[currentRoomIdForModal].push(newRichTag);
    
    // Save to workspace if connected
    if (window.workspaceCollaboration.collaborationState.isOnline) {
        try {
            const success = await window.workspaceCollaboration.saveTagToWorkspace(currentRoomIdForModal, newRichTag);
            if (success) {
                // Mark as workspace tag
                newRichTag.workspace = true;
                newRichTag.created_by = window.workspaceCollaboration.collaborationState.currentUser?.name;
                showCollaborationNotification(`✅ Tag "${newRichTag.name}" shared with workspace`);
            }
        } catch (error) {
            console.error('Failed to save tag to workspace:', error);
            // Tag is still saved locally, so continue
        }
    }
    
    clearTagForm();
    updateCustomTagsModalDisplay();
}

// Update the removeCustomTag function to remove from workspace
async function removeCustomTag(tagId, roomId) {
    if (!roomId || !tagId) return;
    
    const roomTags = state.customTags[roomId];
    if (!roomTags) return;
    
    const tagIndex = roomTags.findIndex(tag => tag.id.toString() === tagId.toString());
    if (tagIndex === -1) return;
    
    const tagToRemove = roomTags[tagIndex];
    
    // Remove from workspace if it's a workspace tag
    if (tagToRemove.workspace && window.workspaceCollaboration.collaborationState.isOnline) {
        try {
            const success = await window.workspaceCollaboration.removeTagFromWorkspace(roomId, tagToRemove);
            if (success) {
                showCollaborationNotification(`🗑️ Tag "${tagToRemove.name}" removed from workspace`);
            }
        } catch (error) {
            console.error('Failed to delete tag from workspace:', error);
            // Continue with local deletion
        }
    }
    
    // Remove from local state
    roomTags.splice(tagIndex, 1);
    updateCustomTagsModalDisplay();
}

// Update the updateCollaborationUI function to handle workspace display
function updateCollaborationUI() {
    const collabButton = elements.collaborationBtn;
    const collabStatus = elements.collaborationStatus;
    
    if (window.workspaceCollaboration.collaborationState.isOnline) {
        const workspaceName = window.workspaceCollaboration.collaborationState.currentWorkspace?.name;
        
        if (collabButton) {
            collabButton.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
                Connected: ${workspaceName}
            `;
            collabButton.classList.remove('um-button-blue');
            collabButton.classList.add('um-button-maize');
        }
        
        if (collabStatus) {
            collabStatus.classList.remove('hidden');
        }
    } else {
        if (collabButton) {
            collabButton.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
                Join Workspace
            `;
            collabButton.classList.remove('um-button-maize');
            collabButton.classList.add('um-button-blue');
        }
        
        if (collabStatus) {
            collabStatus.classList.add('hidden');
        }
    }
}

// REPLACE the existing setupEventListeners collaboration section with this:
function setupCollaborationEventListeners() {
    // Update main collaboration button
    if (elements.collaborationBtn) {
        elements.collaborationBtn.addEventListener('click', handleCollaborationButtonClick);
    }
    
    // Workspace selection modal
    if (document.getElementById('close-workspace-selection-btn')) {
        document.getElementById('close-workspace-selection-btn').addEventListener('click', hideWorkspaceSelectionModal);
    }
    if (document.getElementById('create-workspace-btn')) {
        document.getElementById('create-workspace-btn').addEventListener('click', showCreateWorkspaceModal);
    }
    if (document.getElementById('join-workspace-btn')) {
        document.getElementById('join-workspace-btn').addEventListener('click', showJoinWorkspaceModal);
    }
    
    // Create workspace modal
    if (document.getElementById('close-create-workspace-btn')) {
        document.getElementById('close-create-workspace-btn').addEventListener('click', hideCreateWorkspaceModal);
    }
    if (document.getElementById('create-workspace-cancel-btn')) {
        document.getElementById('create-workspace-cancel-btn').addEventListener('click', hideCreateWorkspaceModal);
    }
    if (document.getElementById('create-workspace-confirm-btn')) {
        document.getElementById('create-workspace-confirm-btn').addEventListener('click', createWorkspace);
    }
    
    // Join workspace modal
    if (document.getElementById('close-join-workspace-btn')) {
        document.getElementById('close-join-workspace-btn').addEventListener('click', hideJoinWorkspaceModal);
    }
    if (document.getElementById('join-workspace-cancel-btn')) {
        document.getElementById('join-workspace-cancel-btn').addEventListener('click', hideJoinWorkspaceModal);
    }
    if (document.getElementById('join-workspace-confirm-btn')) {
        document.getElementById('join-workspace-confirm-btn').addEventListener('click', joinWorkspace);
    }
    
    // Modal click-outside handlers
    const workspaceSelectionModal = document.getElementById('workspace-selection-modal');
    if (workspaceSelectionModal) {
        workspaceSelectionModal.addEventListener('click', (e) => {
            if (e.target === workspaceSelectionModal) hideWorkspaceSelectionModal();
        });
    }
    
    const createWorkspaceModal = document.getElementById('create-workspace-modal');
    if (createWorkspaceModal) {
        createWorkspaceModal.addEventListener('click', (e) => {
            if (e.target === createWorkspaceModal) hideCreateWorkspaceModal();
        });
    }
    
    const joinWorkspaceModal = document.getElementById('join-workspace-modal');
    if (joinWorkspaceModal) {
        joinWorkspaceModal.addEventListener('click', (e) => {
            if (e.target === joinWorkspaceModal) hideJoinWorkspaceModal();
        });
    }
}

// ADD this to your DOMContentLoaded event listener in app.js:
// Replace the old collaboration initialization with:
async function initializeWorkspaceCollaboration() {
    if (window.workspaceCollaboration) {
        const initialized = await window.workspaceCollaboration.initializeSupabase();
        if (initialized) {
            console.log('✅ Workspace collaboration system ready');
        }
    }
    setupCollaborationEventListeners();
}

// INSTRUCTIONS FOR INTEGRATION:
// 1. In your existing setupEventListeners() function, REMOVE the old collaboration event listeners
// 2. In your DOMContentLoaded event listener, REPLACE the old Supabase initialization with:
//    initializeWorkspaceCollaboration();
// 3. Make sure to call setupCollaborationEventListeners() in your setupEventListeners() function
